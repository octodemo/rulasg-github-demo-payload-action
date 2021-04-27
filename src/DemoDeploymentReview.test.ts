// import { Octokit } from '@octokit/rest';
// import { expect } from 'chai';
// import { DemoDeployment } from './DemoDeployment';
// import { DemoDeploymentReview } from './DemoDeploymentReview'
// import { Repository } from './types';
// import { getOctokit, getRepository } from './util';

// describe('DeploymentManager', () => {

//   let deploymentReview: DemoDeploymentReview;

//   let octokit: Octokit;

//   let repo: Repository;

//   before(async () => {
//     octokit = getOctokit();
//     repo = getRepository();

//     deploymentReview = await DemoDeploymentReview.createDemoReview(octokit, repo);
//   });

//   it('should load all deployments', async () => {
//     const allDeployment: DemoDeployment[] = await deploymentReview.getAllDemoDeployments();

//     expect(allDeployment).to.not.be.undefined;
//     console.log(JSON.stringify(allDeployment, null, 2));
//   });

//   it('should identify old deployments', async () => {
//     const data = await deploymentReview.analyze();

//     expect(data).to.have.length.greaterThan(0);
//   });

// });
