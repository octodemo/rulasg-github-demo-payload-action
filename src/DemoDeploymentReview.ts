import { Octokit } from "@octokit/rest";
import { DEMO_STATES } from "./constants.js";
import { Repository } from './demo-payload/TypeValidations.js';
import { DemoDeployment } from "./DemoDeployment.js";
import { GitHubDeploymentManager } from "./GitHubDeploymentManager.js";
import { DeploymentState, DeploymentStatus } from "./types.js";

export type DemoReview = {
  demo: DemoDeployment,
  days_in_state: number,
  in_error: boolean,
  status?: DeploymentState,
  lifecycle_state?: string,
  log_url?: string,
  issue?: {
    id: number,
    labels?: string[]
  }
}

export type AnalysisResults = {
  errored: DemoReview[],
  to_warn: DemoReview[],
  to_terminate: DemoReview[],
  on_hold: DemoReview[],
  processed: DemoReview[],
}

export class DemoDeploymentReview {

  private readonly deploymentManager: GitHubDeploymentManager;

  private allDemos?: DemoDeployment[];

  private loaded: boolean = false;

  static async createDemoReview(octokit: Octokit, repo: Repository, ref?: string): Promise<DemoDeploymentReview> {
    const review = new DemoDeploymentReview(octokit, repo, ref);
    await review.load();
    return review;
  }

  protected constructor(octokit: Octokit, repo: Repository, ref?: string) {
    this.deploymentManager = new GitHubDeploymentManager(repo, octokit, ref);
    this.loaded = false;
  }

  async getAllDemoDeployments() {
    return this.load();
  }

  async getDemosToTerminate(gracePeriod: number = 5): Promise<DemoReview[]> {
    const reviews: DemoReview[] = await this.loadDemoReviews();
    const results: DemoReview[] = [];

    reviews.forEach(review => {
      if (review.lifecycle_state === DEMO_STATES.marked_termination) {
        if (review.days_in_state > gracePeriod) {
          results.push(review);
        }
      }
    })

    return results;
  }

  async analyze(warningDays: number = 7, maxActiveDays: number = 15): Promise<AnalysisResults> {
    const reviews: DemoReview[] = await this.loadDemoReviews();

    const results: AnalysisResults = {
      errored: [],
      to_warn: [],
      to_terminate: [],
      on_hold: [],
      processed: reviews,
    };

    reviews.forEach(review => {
      if (review.in_error) {
        results.errored.push(review);
      }

      if (review.lifecycle_state === DEMO_STATES.marked_hold) {
        results.on_hold.push(review);
      } else {
        const daysInState = review.days_in_state;

        if (daysInState > warningDays
          && review.lifecycle_state !== DEMO_STATES.marked_warning
          // If this demo is already marked for terminiation, no need to warn again
          && review.lifecycle_state !== DEMO_STATES.marked_termination
        ) {
          results.to_warn.push(review);
        }

        if (daysInState > maxActiveDays
          && review.lifecycle_state !== DEMO_STATES.marked_termination
        ) {
          results.to_terminate.push(review);
        }
      }
    });

    return results;
  }

  private async loadDemoReviews(): Promise<DemoReview[]> {
    const demos = await this.getAllDemoDeployments()
    if(!demos) {
      return [];
    }

    const demoReviews: DemoReview[] = [];

    // We handle this sequentially, as we risk running into secondary rate limits if we don't
    for (const demo of demos) {
      const review = await this.generateDemoReview(demo);
      demoReviews.push(review);
    }

    return demoReviews;
  }

  private async generateDemoReview(demo: DemoDeployment): Promise<DemoReview> {
    const status: DeploymentStatus | undefined = await demo.getCurrentStatus()
      , demoActiveDays = await demo.getActiveDays()
      , trackingIssue = demo.getTrackingIssue()
      ;

    const result: DemoReview = {
      demo: demo,
      days_in_state: demoActiveDays,
      status: status?.state,
      in_error: status?.state !== 'success',
      lifecycle_state: status?.description,
      log_url: status?.log_url,
    };

    if (trackingIssue) {
      const labels = await this.deploymentManager.getIssueLabels(trackingIssue);
      result.issue = {
        id: trackingIssue,
        labels: labels,
      }
    }

    return result;
  }

  private async load(): Promise<DemoDeployment[]> {
    if (!this.loaded) {
      this.allDemos = await this.deploymentManager.getAllDemoDeployments();
      this.loaded = true;
    }
    // @ts-ignore
    return this.allDemos;
  }
}
