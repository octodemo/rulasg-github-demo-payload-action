import { Octokit } from "@octokit/rest";
import { DEMO_STATES } from "./constants";
import { DemoDeployment } from "./DemoDeployment";
import { GitHubDeploymentManager } from "./GitHubDeploymentManager";
import { DeploymentState, DeploymentStatus, Repository } from "./types";

export type DemoReview = {
  demo: DemoDeployment,
  active_days: number,
  in_error: boolean,
  status?: DeploymentState,
  description?: string,
  log_url?: string,
  issue?: {
    id: number,
    labels?: string[]
  }
}

export type AnalysisResults = {
  errored: DemoReview[],
  warnings: DemoReview[],
  terminations: DemoReview[]
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

  async loadDemoReviews(): Promise<DemoReview[]> {
    return this.getAllDemoDeployments()
      .then(demos => {
        const promises: Promise<DemoReview>[] = [];
        demos?.forEach(demo => {
          promises.push(this.generateDemoReview(demo));
        });
        return Promise.all(promises);
      });
  }

  async analyze(warningDays: number = 7, maxActiveDays: number = 15): Promise<AnalysisResults> {
    const reviews: DemoReview[] = await this.loadDemoReviews();

    const results: AnalysisResults = {
      errored: [],
      warnings: [],
      terminations: [],
    };

    reviews.forEach(review => {
      const demoActiveDays = review.active_days;

      if (review.in_error) {
        results.errored.push(review);
      }

      if (demoActiveDays > warningDays) {
        if (review.description !== DEMO_STATES.marked_hold) {
          results.warnings.push(review);
        }
      }

      if (demoActiveDays > maxActiveDays) {
        if (review.description !== DEMO_STATES.marked_hold) {
          results.terminations.push(review)
        }
      }
    });

    return results;
  }

  async generateDemoReview(demo: DemoDeployment): Promise<DemoReview> {
    const status: DeploymentStatus | undefined = await demo.getCurrentStatus()
      , demoActiveDays = await demo.getActiveDays()
      , trackingIssue = demo.getTrackingIssue()
      ;

    const result: DemoReview = {
      demo: demo,
      active_days: demoActiveDays,
      status: status?.state,
      in_error: status?.state !== 'success',
      description: status?.description,
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
    if (! this.loaded) {
      this.allDemos = await this.deploymentManager.getAllDemoDeployments();
      this.loaded = true;
    }
    // @ts-ignore
    return this.allDemos;
  }
}