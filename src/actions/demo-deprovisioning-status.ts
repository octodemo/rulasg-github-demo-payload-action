import * as core from '@actions/core';
import * as github from '@actions/github';
import { inspect } from 'util';
import { DEMO_STATES } from '../constants';
import { DemoDeployment } from '../DemoDeployment';
import { GitHubDeploymentManager } from '../GitHubDeploymentManager';
import { DeploymentState } from '../types';
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
  const inputs = {
    name: core.getInput('name'),
    id: parseInt(core.getInput('id')),
    run_id: getRequiredInput('actions_run_id'),
    status: getRequiredInput('status')
  };

  if (!!inputs.name && !!inputs.id) {
    core.setFailed(`One of 'name' or 'id' must be provided to update a demo deployment state.`);
  } else {
    const deploymentManager = new GitHubDeploymentManager(github.context.repo, getOctokit(), github.context.ref);
    let deployment = await getDeployment(deploymentManager, inputs);

    const state = validateStatus(inputs.status);
    const logUrl = `https://github.com/${ github.context.repo.owner }/${ github.context.repo.repo}/actions/runs/${ inputs.run_id }`;

    core.info(`Updating demo deployment ${deployment.id} status...`);
    await deploymentManager.updateDeploymentStatus(deployment.id, state.deploymentState, state.demoState, logUrl);
    core.info('done.');

    const issueId = deployment.getTrackingIssue();
    if (issueId) {
      core.info(`Updating issue ${issueId} labels to track state...`);
      await deploymentManager.addIssueLabels(issueId, ...state.labelsAdd);
      await deploymentManager.removeIssueLabels(issueId, ...state.labelsRemove);
      core.info('done.');
    }
  }
}

type DemoStatus = {
  deploymentState: DeploymentState
  demoState: string,
  labelsAdd: string[],
  labelsRemove: string[],
};

function validateStatus(status: string): DemoStatus {
  if (status === 'success') {
    return {
      deploymentState: 'inactive',
      demoState: DEMO_STATES.destroyed,
      labelsAdd: [DEMO_STATES.destroyed],
      labelsRemove: [DEMO_STATES.destroying, DEMO_STATES.error],
    }
  } else if (status === 'failure' || status === 'cancelled') {
    return {
      deploymentState: 'failure',
      demoState: DEMO_STATES.error,
      labelsAdd: [DEMO_STATES.error],
      labelsRemove: [DEMO_STATES.provisioning, DEMO_STATES.provisioned, DEMO_STATES.destroying, DEMO_STATES.destroyed],
    }
  } else {
    throw new Error(`Unsupported status type provided '${status}'`);
  }
}

async function getDeployment(deploymentManager: GitHubDeploymentManager, inputs) {
  let deployment: DemoDeployment;
  if (inputs.name) {
    const result = await deploymentManager.getDemoDeployment(inputs.name);
    if (!result) {
      throw new Error(`Failed to locate demo deployment for name '${inputs.name}'`);
    }
    deployment = result;
  } else {
    deployment = await deploymentManager.getDemoDeploymentById(inputs.id);
  }
  return deployment;
}
