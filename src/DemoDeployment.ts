import vine from '@vinejs/vine';
import { Infer } from '@vinejs/vine/types';
import { GitHubDeploymentManager } from './GitHubDeploymentManager.js';
import { DEMO_DEPLOYMENT_TASK, DEMO_STATES } from './constants.js';
import { DemoPayload } from "./demo-payload/DemoPayload.js";
import { DeploymentStatus } from './types.js';

const DAY_IN_MILLISECONDS = 1000 * 60 * 60 * 24;
const ENVIRONMENT_NAME_PREFIX = 'demo/';


const GitHubDeploymentDataSchema = vine.object({
  id: vine.number(),
  node_id: vine.string(),
  environment: vine.string(),
  created_at: vine.string(),
  updated_at: vine.string(),
  description: vine.string().optional().nullable(),
  ref: vine.string(),
  task: vine.string(),
  payload: vine.any().optional(), //TODO the APIs report this could be an object was locked to a string
}).allowUnknownProperties();

export const GitHubDeploymentValidator = vine.compile(GitHubDeploymentDataSchema);

export type GitHubDeploymentData = Infer<typeof GitHubDeploymentDataSchema>;


export class DemoDeployment {

  private readonly data: GitHubDeploymentData;

  private readonly deploymentManager: GitHubDeploymentManager;

  private demoPayload: DemoPayload | undefined;

  constructor(data: GitHubDeploymentData, deploymentManager: GitHubDeploymentManager) {
    if (data.task !== DEMO_DEPLOYMENT_TASK) {
      throw new Error(`Invalid payload type ${data.task}`);
    }

    this.data = data;
    this.deploymentManager = deploymentManager;

    try {
      if (data.payload && data.payload.length > 0) {
        this.demoPayload = new DemoPayload(JSON.parse(data.payload));
      }
    } catch(err: any) {
      this.demoPayload = undefined;
    }
  }

  get id() {
    return this.data.id;
  }

  get name() {
    return this.data.environment;
  }

  get description() {
    return this.data.description;
  }

  // In properly built deployment payloads, this should be present in the payload data
  get uuid() {
    return this.demoPayload?.uuid;
    // const description = this.description;
    // if (description) {
    //   const matched = /uuid\:(.*)/.exec(description);
    //   if (matched) {
    //     return matched[1];
    //   }
    // }
    // return undefined;
  }

  get environment() {
    if (this.data.environment.indexOf(ENVIRONMENT_NAME_PREFIX) === 0) {
      return this.data.environment.substring(ENVIRONMENT_NAME_PREFIX.length);
    }
    return this.data.environment;
  }

  get payload(): DemoPayload | undefined {
    return this.demoPayload;
  }

  getCurrentStatus(): Promise<DeploymentStatus | undefined> {
    return this.deploymentManager.getDeploymentStatus(this.id);
  }

  getTrackingIssue(): number | undefined {
    const payloadData = this.payload;
    if (payloadData) {
      return this.payload.communicationIssueNumber;
    }
    return undefined;
  }

  get createdAt(): string {
    return this.data.created_at;
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

  //TODO this should no longer be possible in practice due to the way the uuids are created
  async isDuplicate(): Promise<boolean> {
    const issueId = this.getTrackingIssue();
    if (issueId) {
      const labels: string[] = await this.deploymentManager.getIssueLabels(issueId);
      return labels.indexOf('duplicate') > -1;
    }
    return false;
  }
}