import { Octokit } from '@octokit/rest';
import { describe, it, expect, beforeAll } from 'vitest';
// import { expect } from 'chai';
import { AnalysisResults, DemoDeploymentReview } from './DemoDeploymentReview';
import { Repository } from './types';
import { getOctokit, getRepository } from './util';

describe('DeploymentManager', () => {

  let deploymentReview: DemoDeploymentReview;

  let octokit: Octokit;

  let repo: Repository;

  beforeAll(async () => {
    octokit = getOctokit();
    repo = getRepository();

    deploymentReview = await DemoDeploymentReview.createDemoReview(octokit, repo);
  });

  it('should generate an analysis', async () => {
    const analysis: AnalysisResults = await deploymentReview.analyze();

    expect(analysis).to.have.property('processed').to.have.length.greaterThan(0);

    console.log(`Errored`);
    analysis.errored.forEach(review => {
      console.log(`  ${review.demo.name} id:${review.demo.id}`);
      console.log(`  status: ${JSON.stringify(review.status)}`);
    });

    console.log(`Warnings`);
    analysis.to_warn.forEach(review => {
      console.log(`  ${review.demo.name} id:${review.demo.id}`);
      console.log(`  active days: ${review.days_in_state}`);
    });

    console.log(`On hold`);
    analysis.on_hold.forEach(review => {
      console.log(`  ${review.demo.name} id:${review.demo.id}`);
      console.log(`  active days: ${review.days_in_state}`);
    });


    console.log(`Processed: ${analysis.processed.length}`);
  });

});
