import * as core from '@actions/core';
import * as github from '@actions/github';
import { inspect } from 'util';
import { DemoDeployment } from '../DemoDeployment.js';
import { DemoDeploymentReview } from '../DemoDeploymentReview.js';
import { getOctokit } from '../util.js';
import { getRequiredInput } from '../action-utils.js'

async function run() {
  try {
    await exec();
  } catch (err: any) {
    core.warning(inspect(err))
    core.setFailed(err);
  }
}
run();


async function exec() {
  const beforeDate: Date = new Date(getRequiredInput('before'));
  const octokit = getOctokit(getRequiredInput('github_token'));
  const demoReview = await DemoDeploymentReview.createDemoReview(octokit, github.context.repo, github.context.ref);

  const allDeployments = await demoReview.getAllDemoDeployments();

  const results: DemoDeployment[] = [];

  core.startGroup('Deploy Deployments');
  allDeployments.forEach(async (deployment) => {
    const createdDate = new Date(deployment.createdAt);
    if (createdDate.getTime() < beforeDate.getTime()) {
      results.push(deployment);
      await displayDeployment(deployment);
    }
  });
  core.endGroup();

  core.startGroup('Summary');
  core.info(`Processed ${results.length} demo deployments`);
  core.endGroup();

  // Might want to expose the results for further processing
}


async function displayDeployment(deployment: DemoDeployment) {
  const status = await deployment.getCurrentStatus();

  core.info(`-------------------------------------------------------------------`);
  core.info(`${deployment.name} id:${deployment.id}`);
  core.info(`  created:        ${deployment.createdAt}`);
  core.info(`  state:          ${status?.state}`);
  core.info(`  environment:    ${status?.environment}`);
  core.info(`  status created: ${status?.created_at}`);
  core.info(`  tracking issue: ${deployment.getTrackingIssue()}`);
  core.info(``);
}