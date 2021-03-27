import { Octokit } from '@octokit/rest';
import { DemoDeployment, DeploymentPayload, DeploymentState, DeploymentStatus, EnvironmentDeployment, Repository } from './types';

export const DEMO_DEPLOYMENT_TASK: string = 'demo:deployment';

export class DeploymentManager {

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

  getEnvironmentDeployments(name: string): Promise<EnvironmentDeployment[] | undefined> {
    return this.github.repos.listDeployments({
      ...this.repo,
      environment: name,
      task: 'deploy'
    }).then(resp => {
      if (resp.status === 200 && resp.data) {
        return resp.data.map(mapDeploymentToEnvironment);
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

  getDemoDeployments(name: string): Promise<DemoDeployment[] | undefined> {
    return this.github.repos.listDeployments({
      ...this.repo,
      environment: `demo/${name}`,
      task: DEMO_DEPLOYMENT_TASK,
    }).then(resp => {
      if (resp.status === 200 && resp.data) {
        return resp.data.map(mapDeploymentToEnvironment);
      }
      return undefined;
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

  createDemoDeployment(data: DeploymentPayload): Promise<DemoDeployment> {
    return this.github.repos.createDeployment({
      ...this.repo,
      ref: this.ref,
      task: DEMO_DEPLOYMENT_TASK,
      auto_merge: false,
      required_contexts: [],
      environment: `demo/${data.name}`,
      payload: data.payload,
      description: 'Tracking deployment for demo metadata',
      transient_environment: true,
      mediaType: {
        previews: ['ant-man'],
      },
    }).then(result => {
      return mapDeploymentToEnvironment(result.data);
    });
  }

  updateDeploymentStatus(id: number, state: DeploymentState): Promise<DeploymentStatus> {
    return this.github.repos.createDeploymentStatus({
      ...this.repo,
      deployment_id: id,
      state: state,
      auto_inactive: true,
      mediaType: {
        previews: ['ant-man', 'flash'],
      },
    }).then(resp => {
      if (resp.status !== 201) {
        throw new Error(`Failed to create deployment status, unexpected status code; ${resp.status}`);
      }
      return createDeploymentStatus(resp.data);
    });
  }
}

function mapDeploymentToEnvironment(deployment: { [key: string]: any }): EnvironmentDeployment {
  // @ts-ignore
  const result: EnvironmentDeployment = {};
  ['id', 'node_id', 'created_at', 'updated_at', 'description', 'ref', 'task', 'payload', 'environment', 'original_environment'].forEach(key => {
    result[key] = deployment[key];
  });

  return result;
}

function createDeploymentStatus(status: { [key: string]: any }) {
  return {
    id: status.id,
    state: status.state,
    description: status.description || '',
    environment: status.environment || '',
    created_at: status.created_at,
    updated_at: status.updated_at,
  }
}