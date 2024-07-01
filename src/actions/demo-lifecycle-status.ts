import * as core from '@actions/core';
import * as github from '@actions/github';
import { inspect } from 'util';
import { DEMO_STATES, LIFECYCLE_STATES } from '../constants.js';
import { GitHubDeploymentManager } from '../GitHubDeploymentManager.js';
import { getOctokit } from '../util.js';
import { getRequiredInput } from '../action-utils.js'

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
    id: parseInt(getRequiredInput('id')),
    run_id: getRequiredInput('actions_run_id'),
    status: getRequiredInput('lifecycle_status')
  };

  const octokit = getOctokit(getRequiredInput('github_token'));
  const deploymentManager = new GitHubDeploymentManager(github.context.repo, octokit, github.context.ref);
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

      const actor: string | undefined = deployment.payload?.actor;
      if (status.demoState === DEMO_STATES.marked_warning) {
        await deploymentManager.addIssueComment(issueId, getWarningMessage(actor));
      } else if (status.demoState === DEMO_STATES.marked_termination) {
        await deploymentManager.addIssueComment(issueId, getTerminationMessage(actor));
      }

      core.info('done.');
    }
  }
}

function getWarningMessage(actor?: string) {
  let prefix = 'T';
  if (actor) {
    prefix = `:wave: @${actor}, t`;
  }

  return `${prefix}he demo has been open for a while now. Please consider closing this issue to remove the deployment environment if no longer required.`;
}

function getTerminationMessage(actor?: string) {
  let prefix = 'T';
  if (actor) {
    prefix = `:wave: @${actor}, t`;
  }

  return `
  ${prefix}he demo has been open for a long time and is not marked for hold.

  Please close this issue to release the resources, or place on hold if you need this environment to persist.

  :red_circle: If you take no action the demo will be destroyed automatically. :red_circle:
  `;
}

type DemoStatus = {
  demoState: string,
  labelsAdd: string[],
  labelsRemove: string[]
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
