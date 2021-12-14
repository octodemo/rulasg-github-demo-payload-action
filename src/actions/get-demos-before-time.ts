import * as core from '@actions/core';
import * as github from '@actions/github';
import { inspect } from 'util';
import { DemoDeployment } from '../DemoDeployment';
import { DemoDeploymentReview } from '../DemoDeploymentReview';
import { getOctokit, getRequiredInput } from '../util';

async function run() {
  try {
    await exec();
  } catch (err) {
    core.debug(inspect(err))
    core.setFailed(err);
  }
}
run();


async function exec() {
  const beforeDate: Date = new Date(getRequiredInput('before'));
  const demoReview = await DemoDeploymentReview.createDemoReview(getOctokit(), github.context.repo, github.context.ref);

  const allDeployments = await demoReview.getAllDemoDeployments();

  // const results: DemoDeployment[] = [];

  allDeployments.forEach(deployment => {
    const createdDate = new Date(deployment.getCreatedAt());
    if (createdDate.getTime() < beforeDate.getTime()) {
      // results.push(deployment);
      displayDeployment(deployment);
    }
  });
  // Might want to expose the results for further processing
}


async function displayDeployment(deployment: DemoDeployment) {
  const status = await deployment.getCurrentStatus();

  core.info(`-------------------------------------------------------------------`);
  core.info(`${deployment.name} id:${deployment.id}`);
  core.info(`  created:        ${deployment.getCreatedAt()}`);
  core.info(`  state:          ${status?.state}`);
  core.info(`  environment:    ${status?.environment}`);
  core.info(`  status created: ${status?.created_at}`);
  core.info(`  tracking issue: ${deployment.getTrackingIssue()}`);
  core.info(``);
}