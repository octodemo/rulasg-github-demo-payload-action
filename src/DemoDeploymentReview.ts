// import { Octokit } from "@octokit/rest";
// import { DemoDeployment } from "./DemoDeployment";
// import { GitHubDeploymentManager } from "./GitHubDeploymentManager";
// import { Repository } from "./types";


// export type DemoReview = {
//   demo: DemoDeployment,
//   activeDays?: number,
//   issue?: {
//     id: number,
//     labels?: string[]
//   }
//   warn: boolean,
//   terminate: boolean,
// }


// export class DemoDeploymentReview {

//   private readonly deploymentManager: GitHubDeploymentManager;

//   private allDemos?: DemoDeployment[];

//   private loaded: boolean = false;

//   static async createDemoReview(octokit: Octokit, repo: Repository, ref?: string): Promise<DemoDeploymentReview> {
//     const review = new DemoDeploymentReview(octokit, repo, ref);
//     await review.load();
//     return review;
//   }

//   protected constructor(octokit: Octokit, repo: Repository, ref?: string) {
//     this.deploymentManager = new GitHubDeploymentManager(repo, octokit, ref);
//     this.loaded = false;
//   }

//   async getAllDemoDeployments() {
//     return this.load();
//   }

//   async processActivityDurations(warningDays: number = 7, maxActiveDays: number = 15): Promise<DemoReview[]> {
//     const validationPromises: Promise<DemoReview>[] = [];
//     const demos = await this.load();

//     demos?.forEach(demo => {
//       validationPromises.push(this.validateDemo(demo, warningDays, maxActiveDays));
//     })

//     // const results = await Promise.all(validationPromises);
//     return await Promise.all(validationPromises);
//   }

//   async analyze() {
//     const demos: DemoDeployment[] = this.getAllDemoDeployments();

//     demos.forEach(demo => {
//       const trackingIssue = demo.getTrackingIssue();

//       if(trackingIssue) {
//         this.deploymentManager.getIssueLabels(trackingIssue)
//       }

//     });
//   }

//   async validateDemo(demo: DemoDeployment, warningDays: number, maxActiveDays: number): Promise<DemoReview> {
//     const demoActiveDays = await demo.getActiveDays()
//       , results: DemoReview = {
//           demo: demo,
//           activeDays: demoActiveDays,
//           warn: false,
//           terminate: false,
//         }
//       ;

//     if (demoActiveDays > warningDays) {
//       if (demo.getTrackingIssue()) {
//         // Report warning

//       }
//     }

//     if (demoActiveDays > maxActiveDays) {
//       if (demo.getTrackingIssue()) {
//         // Report termination
//       }
//     }

//     return results
//   }

//   private async load(): Promise<DemoDeployment[]> {
//     if (! this.loaded) {
//       this.allDemos = await this.deploymentManager.getAllDemoDeployments();
//       this.loaded = true;
//     }
//     // @ts-ignore
//     return this.allDemos;
//   }
// }