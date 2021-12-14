import { Octokit } from '@octokit/rest';
import { DEMO_DEPLOYMENT_TASK, DEMO_STATES } from './constants';
import { DemoDeployment } from './DemoDeployment';
import { GitHubDeployment, DeploymentState, DeploymentStatus, Repository } from './types';

export class GitHubDeploymentManager {

  private readonly github: Octokit;

  private readonly repo: Repository;

  private readonly ref: string;

  constructor(repo: Repository, github: Octokit, ref?: string) {
    this.repo = repo;
    this.github = github;
    this.ref = ref || 'main';
  }

  getDeploymentStatus(id: number): Promise<DeploymentStatus | undefined> {
    return this.github.repos.listDeploymentStatuses({
      ...this.repo,
      deployment_id: id,
    }).then(resp => {
      if (resp.status === 200 && resp.data && resp.data.length > 0) {
        const status = resp.data[0];
        return createDeploymentStatus(status);
      }
      return undefined;
    });
  }

  deactivateDeployment(id: number): Promise<boolean> {
    return this.github.repos.createDeploymentStatus({
      ...this.repo,
      deployment_id: id,
      state: 'inactive',
      mediaType: {
        previews: ['ant-man']
      }
    }).then(resp => {
      return resp.status === 201;
    });
  }

  deleteDeployment(id: number): Promise<boolean> {
    return this.github.repos.deleteDeployment({
      ...this.repo,
      deployment_id: id,
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
    return this.github.repos.listDeployments({
      ...this.repo,
      environment: name,
      task: 'deploy'
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
    return this.github.paginate(
      'GET /repos/{owner}/{repo}/deployments',
      {
        ...this.repo,
        task: DEMO_DEPLOYMENT_TASK,
      }).then(deployments => {
        return this.extractDemoDeploymentsFromResponse(deployments)
      });
  }

  getDemoDeployments(name: string): Promise<DemoDeployment[] | undefined> {
    return this.github.paginate(
      'GET /repos/{owner}/{repo}/deployments',
      {
        ...this.repo,
        task: DEMO_DEPLOYMENT_TASK,
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
    return this.github.repos.getDeployment({
      ...this.repo,
      deployment_id: id,
    }).then(resp => {
      if (resp.data.task !== DEMO_DEPLOYMENT_TASK) {
        throw new Error(`The deployment for id ${id} is not a valid demo deployment type`);
      }
      return this.extractDemoDeployment(resp.data);
    });
  }

  createDemoDeployment(name: string,  payload: {[key: string]: any }): Promise<DemoDeployment> {
    return this.github.repos.createDeployment({
      ...this.repo,
      ref: this.ref,
      task: DEMO_DEPLOYMENT_TASK,
      auto_merge: false,
      required_contexts: [],
      environment: `demo/${name}`,
      payload: payload,
      description: 'Tracking deployment for demo metadata',
      transient_environment: true,
      mediaType: {
        previews: ['ant-man'],
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
      mediaType: {
        previews: ['ant-man', 'flash'],
      },
    };

    if (logUrl) {
      payload['log_url'] = logUrl;
    }

    return this.github.repos.createDeploymentStatus(payload)
      .then(resp => {
      if (resp.status !== 201) {
        throw new Error(`Failed to create deployment status, unexpected status code; ${resp.status}`);
      }
      return createDeploymentStatus(resp.data);
    });
  }

  getIssueLabels(issueId: number): Promise<string[]> {
    return this.github.issues.listLabelsOnIssue({
      ...this.repo,
      issue_number: issueId,
      per_page: 100
    }).then(resp => {
      return resp.data.map(label => label.name);
    }).catch(() => {
      return [];
    })
  }

  addIssueLabels(issueId: number, ...label: string[]): Promise<boolean> {
    return this.github.issues.addLabels({
      ...this.repo,
      issue_number: issueId,
      labels: label
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
      const promise = this.github.issues.removeLabel({
        ...this.repo,
        issue_number: issueId,
        name: label
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
    return this.github.issues.createComment({
      ...this.repo,
      issue_number: id,
      body: comment,
    }).then(resp => {
      return resp.status === 201;
    });
  }

  private extractDemoDeploymentsFromResponse(resp): DemoDeployment[] | undefined {
    if (resp && resp.length > 0) {
      const results: DemoDeployment[] = [];
      resp.data.forEach(demo => {
        results.push(this.extractDemoDeployment(demo));
      });
      return results;
    }
    return undefined;
  }

  private extractDemoDeployment(deployment: {[key: string]: any }) {
    return new DemoDeployment(extractDeployment(deployment), this);
  }
}


function extractDeployment(deployment: {[key: string]: any }): GitHubDeployment {
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