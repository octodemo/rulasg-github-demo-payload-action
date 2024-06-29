import * as core from '@actions/core';
import * as github from '@actions/github';
import { inspect } from 'util';
import { DemoDeploymentReview, DemoReview } from '../DemoDeploymentReview.js';
import { getOctokit, getRequiredInput } from '../util.js';

async function run() {
  try {
    await exec();
  } catch (err: any) {
    core.debug(inspect(err))
    core.setFailed(err);
  }
}
run();


async function exec() {
  const gracePeriod: number = parseInt(getRequiredInput('grace_period'));
  const demoReview = await DemoDeploymentReview.createDemoReview(getOctokit(), github.context.repo, github.context.ref);
  const toTerminate: DemoReview[] = await demoReview.getDemosToTerminate(gracePeriod);

  reportTerminations(toTerminate);
  setOutput('terminations', toTerminate);
}

function setOutput(name, reviews?: DemoReview[]) {
  setOutputValue(`${name}_count`, reviews ? reviews.length : 0)

  if (reviews && reviews.length > 0) {
    const payload = reviews.map(review => {
      return {
        id: review.demo.id,
        name: review.demo.name,
        repo: review.demo.payload?.repository
      };
    });

    setOutputValue(`${name}_json`, JSON.stringify(payload));
  }
}

function setOutputValue(name, value) {
  core.info(`${name}=${value}`);
  core.setOutput(name, value);
}

function reportTerminations(reviews?: DemoReview[]) {
  core.startGroup(`Terminations - ${reviews ? reviews.length : 0}`);

  reviews?.forEach((review: DemoReview) => {
    displayDemoReview(review);
  });

  core.endGroup();
}

function displayDemoReview(review: DemoReview) {
  core.info(`${review.demo.name} id:${review.demo.id}`);
  core.info(`  status:       ${review.status}`);
  core.info(`  lifecycle:    ${review.lifecycle_state}`);
  core.info(`  active days:  ${review.days_in_state}`);
  if (review.issue) {
    core.info(`  tracking issue:`);
    core.info(`    id: ${review.issue.id}`);
    if (review.issue.labels) {
      core.info(`    labels: ${JSON.stringify(review.issue.labels)}`);
    }
    core.info(`    url: https://github.com/${github.context.repo.owner}/${github.context.repo.repo}/issues/${review.issue.id}`);
  }
}