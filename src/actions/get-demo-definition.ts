import * as core from '@actions/core';
import * as github from '@actions/github';
import { inspect } from 'util';
import { DemoDeployment } from '../DemoDeployment';
import { GitHubDeploymentManager } from '../GitHubDeploymentManager';
import { getOctokit, getRequiredInput } from '../util';

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
  const deploymentId = getRequiredInput('deployment_id');

  const octokit = getOctokit();
  const deploymentManager = new GitHubDeploymentManager(github.context.repo, octokit, github.context.ref);

  const demoDeployment: DemoDeployment = await deploymentManager.getDemoDeploymentById(Number.parseInt(deploymentId));

  core.setOutput('demo_deployment_id', demoDeployment.id);

  const trackingIssue = demoDeployment.getTrackingIssue();
  if (trackingIssue) {
    core.setOutput('communication_issue_number', trackingIssue);
  }

  //TODO finish this off
  // core.setOutput('demo_deployment_template_json', demoDeployment.payload.)




  // const payload = demoDeployment.payload;

  // core.startGroup('Demo Deployment')
  // core.info(`id = ${demoDeployment.id}`);
  // core.endGroup();

  // core.startGroup('Action outputs');
  // core.info(JSON.stringify(demoDeployment.getOutputs(), null, 2));
  // core.endGroup();

  // core.startGroup('Terraform variables');
  // core.info(JSON.stringify(demoDeployment.getTerraformVariables(), null, 2));
  // core.endGroup();
}
