import * as core from '@actions/core';
import * as github from '@actions/github';
import { inspect } from 'util';
import { DEMO_STATES, LIFECYCLE_STATES } from '../constants';
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
  const inputs = {
    id: parseInt(getRequiredInput('id')),
    run_id: getRequiredInput('actions_run_id'),
    status: getRequiredInput('lifecycle_status')
  };

  const deploymentManager = new GitHubDeploymentManager(github.context.repo, getOctokit(), github.context.ref);
  const deployment = await deploymentManager.getDemoDeploymentById(inputs.id);
  const currentDeploymentState = await deployment.getCurrentStatus();

  if (currentDeploymentState?.state === 'success') {
    const status = validateStatus(inputs.status);
    const logUrl = `https://github.com/${github.context.repo.owner}/${github.context.repo.repo}/actions/runs/${inputs.run_id}`;

    core.info(`Updating demo deployment ${deployment.id} status...`);
    await deploymentManager.updateDeploymentStatus(deployment.id, 'success', status.demoState, logUrl);
    core.info('done.');

    const issueId = deployment.getTrackingIssue();
    if (issueId) {
      core.info(`Updating issue ${issueId} labels to track state...`);

      if (status?.labelsAdd?.length > 0) {
        await deploymentManager.addIssueLabels(issueId, ...status.labelsAdd);
      }

      if (status?.labelsRemove?.length > 0) {
        await deploymentManager.removeIssueLabels(issueId, ...status.labelsRemove);
      }
      core.info('done.');
    }
  }
}

type DemoStatus = {
  demoState: string,
  labelsAdd: string[],
  labelsRemove: string[],
};

function validateStatus(status: string): DemoStatus {
  if (status === LIFECYCLE_STATES.hold) {
    return {
      demoState: DEMO_STATES.marked_hold,
      labelsAdd: [DEMO_STATES.marked_hold],
      labelsRemove: [DEMO_STATES.marked_warning, DEMO_STATES.marked_termination],
    };
  } else if (status === LIFECYCLE_STATES.termination) {
    return {
      demoState: DEMO_STATES.marked_termination,
      labelsAdd: [DEMO_STATES.marked_termination],
      labelsRemove: [],
    };
  } else if (status === LIFECYCLE_STATES.warning) {
    return {
      demoState: DEMO_STATES.marked_warning,
      labelsAdd: [DEMO_STATES.marked_warning],
      labelsRemove: [],
    };
  } else if (status === LIFECYCLE_STATES.unhold) {
    return {
      demoState: '',
      labelsAdd: [],
      labelsRemove: [DEMO_STATES.marked_hold],
    };
  } else {
    throw new Error(`Specified state '${status}' is not supported`);
  }
}
