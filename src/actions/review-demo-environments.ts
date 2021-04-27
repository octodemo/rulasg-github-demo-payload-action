import * as core from '@actions/core';
//import * as github from '@actions/github';
//import { Octokit } from '@octokit/rest';
import { inspect } from 'util';
//import { DemoDeployment } from '../DemoDeployment';
//import { GitHubDeploymentManager } from '../GitHubDeploymentManager';
//import { Repository } from '../types';
//import { getOctokit, getRequiredInput } from '../util';

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
  //const warningActiveDays: number = parseInt(getRequiredInput('warn_active_days'));
  //const maxActiveDays: number = parseInt(getRequiredInput('terminate_active_days'));

  //const demoReview = new DemoEnvironmentReview(getOctokit(), github.context.repo, github.context.ref);

  //const data = await demoReview.processActivityDurations(warningActiveDays, maxActiveDays);
  //core.info(`Completed processing ${data.length}`);
}