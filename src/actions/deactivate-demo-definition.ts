import * as core from '@actions/core';
import * as github from '@actions/github';
import { inspect } from 'util';
import { GitHubDeploymentManager } from '../GitHubDeploymentManager.js';
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
  const inputs = {
    environment_deployment_id: getRequiredInput('environment_deployment_id'),
    demo_deployment_id: getRequiredInput('demo_deployment_id'),
  };

  const octokit = getOctokit();
  const deploymentManager = new GitHubDeploymentManager(github.context.repo, octokit, github.context.ref);

  const environment_id = parseInt(inputs.environment_deployment_id);
  if (isNaN(environment_id)) {
    throw new Error(`environment_deployment_id parameter '${inputs.environment_deployment_id}', is not a valid number`);
  }
  core.startGroup('Environment');
  core.info(`Deactivating environment ${environment_id}`);
  const envResult = await deploymentManager.deactivateAndDeleteDeployment(environment_id);
  core.info(`deactivated? ${envResult}`);
  core.endGroup();


  const demo_deployment_id = parseInt(inputs.demo_deployment_id);
  if (isNaN(demo_deployment_id)) {
    throw new Error(`demo_deployment_id parameter '${inputs.demo_deployment_id}', is not a valid number`);
  }
  core.startGroup('Demo Deployment')
  core.info(`Deactivating demo deployment ${demo_deployment_id}`);
  const demoResult = await deploymentManager.deactivateAndDeleteDeployment(demo_deployment_id);
  core.info(`deactivated? ${demoResult}`);
  core.endGroup();
}
