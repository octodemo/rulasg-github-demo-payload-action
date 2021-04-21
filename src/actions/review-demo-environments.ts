import * as core from '@actions/core';
import * as github from '@actions/github';
import { inspect } from 'util';
import { DemoDeployment } from '../DemoDeployment';
import { GitHubDeploymentManager } from '../GitHubDeploymentManager';
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
  const warningActiveDays: number = parseInt(getRequiredInput('warn_active_days'));
  const maxActiveDays: number = parseInt(getRequiredInput('terminate_active_days'));

  const deploymentManager = new GitHubDeploymentManager(github.context.repo, getOctokit(), github.context.ref);
  const demos = await deploymentManager.getAllDemoDeployments();

  const validationPromises: Promise<void>[] = [];
  demos?.forEach(demo => {
    validationPromises.push(validateDemo(demo, warningActiveDays, maxActiveDays));
  })

  // const results = await Promise.all(validationPromises);
  await Promise.all(validationPromises);
}




async function validateDemo(demo: DemoDeployment, warningActiveDays: number = 7, maxActiveDays: number = 30) {
  const demoActiveDays = await demo.getActiveDays();

  if (demoActiveDays > maxActiveDays) {
    if (demo.getTrackingIssue()) {
      // Report warning

    }
  }

  if (demoActiveDays > maxActiveDays) {
    if (demo.getTrackingIssue()) {
      // Report termination
    }
  }



}