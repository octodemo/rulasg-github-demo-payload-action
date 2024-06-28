import { Octokit } from '@octokit/rest';
import { DemoDeployment } from './DemoDeployment.js';
import { DEMO_DEPLOYMENT_TASK, DEMO_STATES } from './constants.js';
import { DemoPayload } from './demo-payload/DemoPayload.js';
import { DeploymentState, DeploymentStatus, GitHubDeployment, Repository } from './types.js';

export class GitHubDeploymentManager {

  private readonly github: Octokit;

  private readonly repo: Repository;

  private readonly ref: string;

  constructor(repo: Repository, github: Octokit, ref?: string) {
    this.repo = repo;
    this.github = github;
    this.ref = ref || 'main';
  }

  getDemoDeploymentForUUID(uuid: string): Promise<DemoDeployment | undefined> {
    return this.getAllDemoDeployments()
      .then(deployments => {
        let matched = deployments?.filter((deployment) => deployment.uuid === uuid)
        if (matched && matched.length > 0) {
          return matched[0];
        }
      });
  }

  getDeploymentStatus(id: number): Promise<DeploymentStatus | undefined> {
    return this.github.paginate('GET /repos/{owner}/{repo}/deployments/{deployment_id}/statuses', {
      ...this.repo,
      deployment_id: id,
      per_page: 100,
    }).then(statuses => {
      if (statuses && statuses.length > 0) {
        //@ts-ignore
        return createDeploymentStatus(statuses[0]);
      }
      return undefined;
    });
  }

  deactivateDeployment(id: number): Promise<boolean> {
    return this.github.rest.repos.createDeploymentStatus({
      ...this.repo,
      deployment_id: id,
      state: 'inactive',
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    }).then(resp => {
      return resp.status === 201;
    });
  }

  deleteDeployment(id: number): Promise<boolean> {
    return this.github.rest.repos.deleteDeployment({
      ...this.repo,
      deployment_id: id,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    }).then(resp => {
      return resp.status === 204;
    });
  }

  deactivateAndDeleteDeployment(id: number): Promise<boolean> {
    const self = this;
    return self.deactivateDeployment(id)
      .then(() => {
        return self.deleteDeployment(id);
      });
  }

  getEnvironmentDeployments(name: string): Promise<GitHubDeployment[] | undefined> {
    return this.github.rest.repos.listDeployments({
      ...this.repo,
      environment: name,
      task: 'deploy',
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    }).then(resp => {
      if (resp.status === 200 && resp.data) {
        return resp.data.map(extractDeployment);
      }
      return undefined;
    });
  }

  getEnvironmentDeploymentId(name: string): Promise<number | undefined> {
    return this.getEnvironmentDeployments(name)
      .then(results => {
        if (results && results.length > 0) {
          return results[0].id;
        }
        return undefined;
      });
  }

  getAllDemoDeployments(): Promise<DemoDeployment[] | undefined> {
    return this.github.paginate('GET /repos/{owner}/{repo}/deployments', {
        ...this.repo,
        task: DEMO_DEPLOYMENT_TASK,
        per_page: 100
      }).then(deployments => {
        return this.extractDemoDeploymentsFromResponse(deployments)
      });
  }

  getDemoDeployments(name: string): Promise<DemoDeployment[] | undefined> {
    return this.github.paginate('GET /repos/{owner}/{repo}/deployments', {
        ...this.repo,
        environment: `demo/${name}`,
        task: DEMO_DEPLOYMENT_TASK,
        per_page: 100
      }).then(deployments => {
        return this.extractDemoDeploymentsFromResponse(deployments)
      });
  }

  getDemoDeployment(name: string): Promise<DemoDeployment | undefined> {
    return this.getDemoDeployments(name)
      .then(results => {
        if (results && results.length > 0) {
          return results[0];
        }
        return undefined;
      });
  }

  getDemoDeploymentById(id: number): Promise<DemoDeployment> {
    return this.github.rest.repos.getDeployment({
      ...this.repo,
      deployment_id: id,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    }).then(resp => {
      if (resp.data.task !== DEMO_DEPLOYMENT_TASK) {
        throw new Error(`The deployment for id ${id} is not a valid demo deployment type`);
      }
      return this.extractDemoDeployment(resp.data);
    });
  }

  // createDemoDeployment(name: string, uuid: string, payload: { [key: string]: any }): Promise<DemoDeployment> {
  createDemoDeployment(demo: DemoPayload): Promise<DemoDeployment> {
    return this.github.rest.repos.createDeployment({
      ...this.repo,
      ref: this.ref,
      task: DEMO_DEPLOYMENT_TASK,
      auto_merge: false,
      required_contexts: [],
      environment: `demo/${demo.repository.owner}/${demo.repository.repo}`,
      payload: demo.asJsonString,
      description: `uuid:${demo.uuid}`,
      transient_environment: true,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      },
    }).then(result => {
      return this.extractDemoDeployment(result.data);
    });
  }

  setDemoDeploymentStateProvisioning(id: number): Promise<DeploymentStatus> {
    return this.updateDeploymentStatus(id, 'in_progress', DEMO_STATES.provisioning);
  }

  setDemoDeploymentStateProvisioned(id: number): Promise<DeploymentStatus> {
    return this.updateDeploymentStatus(id, 'success', DEMO_STATES.provisioned);
  }

  setDemoDeploymentStateErrored(id: number) {
    return this.updateDeploymentStatus(id, 'error', DEMO_STATES.error);
  }

  updateDeploymentStatus(id: number, state: DeploymentState, description?: string, logUrl?: string): Promise<DeploymentStatus> {
    const payload = {
      ...this.repo,
      deployment_id: id,
      state: state,
      auto_inactive: true,
      description: description ?? '',
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      },
    };

    if (logUrl) {
      payload['log_url'] = logUrl;
    }

    return this.github.rest.repos.createDeploymentStatus(payload)
      .then(resp => {
        if (resp.status !== 201) {
          throw new Error(`Failed to create deployment status, unexpected status code; ${resp.status}`);
        }
        return createDeploymentStatus(resp.data);
      });
  }

  getIssueLabels(issueId: number): Promise<string[]> {
    return this.github.rest.issues.listLabelsOnIssue({
      ...this.repo,
      issue_number: issueId,
      per_page: 100,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    }).then(resp => {
      return resp.data.map(label => label.name);
    }).catch(() => {
      return [];
    })
  }

  addIssueLabels(issueId: number, ...label: string[]): Promise<boolean> {
    return this.github.rest.issues.addLabels({
      ...this.repo,
      issue_number: issueId,
      labels: label,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    }).then(resp => {
      if (resp.status === 200) {
        return true;
      } else if (resp.status === 410) {
        return false;
      } else {
        throw new Error(`Unexpected status code ${resp.status} when adding labels to issue ${issueId}`);
      }
    });
  }

  removeIssueLabels(issueId: number, ...label: string[]): Promise<boolean> {
    const promises: Promise<boolean>[] = [];

    label.forEach(label => {
      const promise = this.github.rest.issues.removeLabel({
        ...this.repo,
        issue_number: issueId,
        name: label,
        headers: {
          'X-GitHub-Api-Version': '2022-11-28'
        }
      })
        .catch(err => {
          // Ignore errors that prove the label is not there
          if (err.status !== 404 && err.status !== 410) {
            throw err;
          }
        }).then(() => {
          return true;
        });

      promises.push(promise);
    })

    return Promise.all(promises).then(results => {
      return true;
    });
  }

  addIssueComment(id: number, comment: string): Promise<boolean> {
    return this.github.rest.issues.createComment({
      ...this.repo,
      issue_number: id,
      body: comment,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    }).then(resp => {
      return resp.status === 201;
    });
  }

  private extractDemoDeploymentsFromResponse(resp: any): DemoDeployment[] | undefined {
    if (resp && resp.length > 0) {
      const results: DemoDeployment[] = [];
      resp.forEach((demo: {[key: string]: string}) => {
        results.push(this.extractDemoDeployment(demo));
      });
      return results;
    }
    return undefined;
  }

  private extractDemoDeployment(deployment: { [key: string]: any }): DemoDeployment {
    return new DemoDeployment(extractDeployment(deployment), this);
  }
}


function extractDeployment(deployment: { [key: string]: any }): GitHubDeployment {
  // @ts-ignore
  const result: GitHubDeployment = {};
  ['id', 'node_id', 'created_at', 'updated_at', 'description', 'ref', 'task', 'environment'].forEach(key => {
    result[key] = deployment[key];
  });

  if (deployment.payload) {
    if (typeof deployment.payload === 'string' || deployment.payload instanceof String) {
      //@ts-ignore
      result.payload = JSON.parse(deployment.payload);
    } else {
      result.payload = deployment.payload;
    }
  }

  return result;
}

function createDeploymentStatus(status: { [key: string]: any }): DeploymentStatus {
  return {
    id: status.id,
    state: status.state,
    description: status.description || '',
    environment: status.environment || '',
    created_at: status.created_at,
    updated_at: status.updated_at,
    log_url: status.log_url,
  }
}