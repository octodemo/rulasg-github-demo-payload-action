//TODO need to clean up some issues with payload manipulation here...
// import { expect } from 'chai';
// import * as sinon from 'sinon';
// import {DemoDeployment} from './DemoDeployment';
// import { GitHubDeploymentManager } from './GitHubDeploymentManager';
// import { DeploymentState, GitHubDeployment } from './types';

// describe('DemoDeployment', () => {

//   let deploymentManager;

//   beforeEach(function () {
//     deploymentManager = sinon.createStubInstance(GitHubDeploymentManager);
//   });

//   afterEach(function () {
//     sinon.restore();
//   });


//   describe('#getCurrentStatus()', () => {

//     it('should return success', () => {
//       deploymentManager.getDeploymentStatus.returns(createSuccessDeploymentStatus());

//       const deployment = new DemoDeployment(getDemoDeployment(), deploymentManager);
//       expect(deployment.getCurrentStatus()).to.have.property('state').to.equal('success');
//     });

//     it('should return failure', () => {
//       deploymentManager.getDeploymentStatus.returns(createFailureDeploymentStatus());

//       const deployment = new DemoDeployment(getDemoDeployment(), deploymentManager);
//       expect(deployment.getCurrentStatus()).to.have.property('state').to.equal('failure');
//     });
//   });


//   describe('#getActiveDays()', () => {

//     let deployment: DemoDeployment;

//     beforeEach(() => {
//       deployment = new DemoDeployment(getDemoDeployment(), deploymentManager);
//     })

//     it('should load correct value for successful state of 10 days', async () => {
//       const daysAgo = 10;
//       deploymentManager.getDeploymentStatus.resolves(createSuccessDeploymentStatus(daysAgo));

//       const activeDays = await deployment.getActiveDays();
//       expect(activeDays).to.equal(daysAgo);
//     });

//     it('should load correct value for successful state of 100 days', async () => {
//       const daysAgo = 100;
//       deploymentManager.getDeploymentStatus.resolves(createSuccessDeploymentStatus(daysAgo));

//       const activeDays = await deployment.getActiveDays();
//       expect(activeDays).to.equal(daysAgo);
//     });

//     it('should load correct value for failure state', async () => {
//       deploymentManager.getDeploymentStatus.resolves(createFailureDeploymentStatus(10));

//       const activeDays = await deployment.getActiveDays();
//       expect(activeDays).to.equal(0);
//     });

//     it('should load correct value for error state', async () => {
//       deploymentManager.getDeploymentStatus.resolves(createDeploymentStatus('error', 1));

//       const activeDays = await deployment.getActiveDays();
//       expect(activeDays).to.equal(0);
//     });
//   });


//   describe('#getTrackingIssue()', () => {

//     it('should get issue number if present', () => {
//       const payload = getDemoDeployment();
//       const deployment = new DemoDeployment(payload, deploymentManager);

//       const issueId = deployment.getTrackingIssue();
//       expect(issueId).to.equal(84)
//     });

//     it('should not get an issue number if payload is invalid', () => {
//       const payload = getDemoDeployment();
//       payload.payload = payload.payload + ',';
//       const deployment = new DemoDeployment(payload, deploymentManager);

//       const issueId = deployment.getTrackingIssue();
//       expect(issueId).to.be.undefined;
//     });

//     it('should not get an issue number if payload is missing value', () => {
//       const demoDeployment = getDemoDeployment();

//       if (demoDeployment.payload) {
//         // Modify the payload to remove the tracking number is present
//         const payloadData = JSON.parse(demoDeployment.payload);
//         delete payloadData.github_context.tracking_issue;
//         demoDeployment.payload = JSON.stringify(payloadData);
//       }

//       const deployment = new DemoDeployment(demoDeployment, deploymentManager);
//       const issueId = deployment.getTrackingIssue();
//       expect(issueId).to.be.undefined;
//     });
//   });

// });


// function getDateInPast(days: number): Date {
//   return new Date(Date.now() - (days * 1000 * 60 * 60 * 24));
// }

// function createFailureDeploymentStatus(createdDaysInPast?: number) {
//   return createDeploymentStatus('failure', createdDaysInPast);
// }

// function createSuccessDeploymentStatus(createdDaysInPast?: number) {
//   return createDeploymentStatus('success', createdDaysInPast);
// }

// function createDeploymentStatus(state: DeploymentState, createdDaysInPast?: number) {
//   const date = getDateInPast(createdDaysInPast ? createdDaysInPast : 1).toISOString();
//   return {
//     id: 100,
//     state: state,
//     created_at: date,
//     updated_at: date,
//   }
// }

// type DemoDeploymentConfig = {
//   issue?: number
//   created?: string
// }

// function getDemoDeployment(config?: DemoDeploymentConfig): GitHubDeployment {
//   const trackingIssueId = config?.issue || 84;
//   const createdDate:string | undefined =  config?.created || undefined;

//   const data: GitHubDeployment = {
//     "url": "https://api.github.com/repos/octodemo/demo-bootstrap/deployments/352610681",
//     "id": 352610681,
//     "node_id": "MDEwOkRlcGxveW1lbnQzNTI2MTA2ODE=",
//     "task": "demo:deployment",
//     "original_environment": "demo/octodemo/rob-derosa-demo",
//     "environment": "demo/octodemo/rob-derosa-demo",
//     "description": "Tracking deployment for demo metadata",
//     "created_at": "2021-04-19T19:39:06Z",
//     "updated_at": "2021-04-19T19:39:07Z",
//     "statuses_url": "https://api.github.com/repos/octodemo/demo-bootstrap/deployments/352610681/statuses",
//     "repository_url": "https://api.github.com/repos/octodemo/demo-bootstrap",
//     "creator": {
//       "login": "github-actions[bot]",
//       "id": 41898282,
//       "node_id": "MDM6Qm90NDE4OTgyODI=",
//       "avatar_url": "https://avatars.githubusercontent.com/in/15368?v=4",
//       "gravatar_id": "",
//       "url": "https://api.github.com/users/github-actions%5Bbot%5D",
//       "html_url": "https://github.com/apps/github-actions",
//       "followers_url": "https://api.github.com/users/github-actions%5Bbot%5D/followers",
//       "following_url": "https://api.github.com/users/github-actions%5Bbot%5D/following{/other_user}",
//       "gists_url": "https://api.github.com/users/github-actions%5Bbot%5D/gists{/gist_id}",
//       "starred_url": "https://api.github.com/users/github-actions%5Bbot%5D/starred{/owner}{/repo}",
//       "subscriptions_url": "https://api.github.com/users/github-actions%5Bbot%5D/subscriptions",
//       "organizations_url": "https://api.github.com/users/github-actions%5Bbot%5D/orgs",
//       "repos_url": "https://api.github.com/users/github-actions%5Bbot%5D/repos",
//       "events_url": "https://api.github.com/users/github-actions%5Bbot%5D/events{/privacy}",
//       "received_events_url": "https://api.github.com/users/github-actions%5Bbot%5D/received_events",
//       "type": "Bot",
//       "site_admin": false
//     },
//     "sha": "72c5db74f67b3066b809adb178bd04f045dd59e4",
//     "ref": "refs/heads/main",
//     "payload": `{\"github_context\":{\"actor\":\"rob-derosa\",\"template_repository\":{\"owner\":\"octodemo\",\"repo\":\"template-demo-github-user-search\",\"ref\":\"main\"},\"target_repository\":{\"owner\":\"octodemo\",\"repo\":\"rob-derosa-demo\"},\"tracking_issue\":{\"id\":${trackingIssueId}}},\"azure_context\":{},\"gcp_context\":{},\"aws_context\":{}}`,
//     "performed_via_github_app": null
//   };

//   if (createdDate) {
//     data.created_at = createdDate;
//     data.updated_at = createdDate;
//   }

//   return data;
// }