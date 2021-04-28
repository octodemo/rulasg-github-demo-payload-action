import { DEMO_DEPLOYMENT_TASK, DEMO_STATES } from './constants';
import { GitHubDeploymentManager } from './GitHubDeploymentManager';
import { DemoPayloadContext, GitHubDeployment, DeploymentStatus } from './types';

const DAY_IN_MILLISECONDS = 1000 * 60 * 60 * 24;
const ENVIRONMENT_NAME_PREFIX = 'demo/';

export class DemoDeployment {

  private readonly data: GitHubDeployment;

  private readonly deploymentManager: GitHubDeploymentManager;

  constructor(data: GitHubDeployment, deploymentManager: GitHubDeploymentManager) {
    if (data.task !== DEMO_DEPLOYMENT_TASK) {
      throw new Error(`Invalid payload type ${data.task}`);
    }

    this.data = data;
    this.deploymentManager = deploymentManager;
  }

  get id() {
    return this.data.id;
  }

  get name() {
    return this.data.environment;
  }

  get environment() {
    if (this.data.environment.indexOf(ENVIRONMENT_NAME_PREFIX) === 0) {
      return this.data.environment.substring(ENVIRONMENT_NAME_PREFIX.length);
    }
    return this.data.environment;
  }

  get payload(): DemoPayloadContext | undefined {
    return this.data.payload;
  }

  getCurrentStatus(): Promise<DeploymentStatus | undefined> {
    return this.deploymentManager.getDeploymentStatus(this.id);
  }

  async isActive(): Promise<boolean> {
    const status = await this.getCurrentStatus();
    if (status) {
      return status.state === 'success';
    }
    return false;
  }

  async isErrored(): Promise<boolean> {
    return this.getCurrentStatus()
      .then(status => {
        if (status) {
          return status.state === 'failure' || status.state === 'error';
        }
        return false;
      });
  }

  async isMarkedForTermination(): Promise<boolean> {
    return this.getCurrentStatus()
      .then(status => {
        return status?.state === 'success' && status?.description === DEMO_STATES.marked_termination;
      });
  }

  async getActiveDays(): Promise<number> {
    const isActive = await this.isActive();
    if (isActive) {
      return await this.getDaysInState();
    }
    return 0;
  }

  async getDaysInState(): Promise<number> {
    return this.getCurrentStatus().then(status => {
      if (status) {
        const now = Date.now()
          , updated = new Date(status.created_at).getTime()
          ;
        return Math.floor((now - updated) / DAY_IN_MILLISECONDS);
      }

      return 0;
    });
  }

  getTrackingIssue(): number | undefined {
    const payloadData = this.payload;

    if (payloadData) {
      return payloadData.github_context.tracking_issue?.id;
    }
    return undefined;
  }

  async isDuplicate(): Promise<boolean> {
    const issueId = this.getTrackingIssue();
    if (issueId) {
      const labels: string[] = await this.deploymentManager.getIssueLabels(issueId);
      return labels.indexOf('duplicate') > -1;
    }
    return false;
  }
}