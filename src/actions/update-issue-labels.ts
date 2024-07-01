import * as core from '@actions/core';
import * as github from '@actions/github';
import { inspect } from 'util';
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


async function exec(): Promise<void> {
  const labelsToAdd: string[] = getLabels('labels_to_add')
    , labelsToRemove: string[] = getLabels('labels_to_remove')
    ;

  if (labelsToAdd.length === 0 && labelsToRemove.length === 0) {
    core.info('No labels specified to add or remove, nothing to do.');
  } else {
    const repo = getRepository()
      , issueNumber: number =  getIssueNumber()
      , octokit = getOctokit(getRequiredInput('github_token'))
      , manager = new GitHubDeploymentManager(repo, octokit)
      ;

    core.info(`Updating labels for issue: ${issueNumber}`);

    if (labelsToAdd.length > 0) {
      core.info(`Adding labels: ${JSON.stringify(labelsToAdd)}`);
      await manager.addIssueLabels(issueNumber, ...labelsToAdd);
    }

    if (labelsToRemove.length > 0) {
      core.info(`Removing labels: ${JSON.stringify(labelsToRemove)}`);
      await manager.removeIssueLabels(issueNumber, ...labelsToRemove);
    }
  }
}


function getRepository() {
  const input = core.getInput('repo');

  if (input) {
    const [owner, repo] = getRequiredInput('repo').split('/');
    if (!owner || ! repo) {
      throw new Error(`Invalid repo value supplied '${input}', must be of the <owner/<name> format`);
    }
    return {
      owner: owner,
      repo: repo
    };
  } else {
    return github.context.repo;
  }
}

function getIssueNumber(): number {
  const input = core.getInput('issue_number');

  if (input) {
    const value = parseInt(input);
    if (Number.isNaN(value)) {
      throw new Error(`Invalid issue number provided: '${input}'`);
    }
    return value;
  } else {
    const issueNumber = github.context.issue.number;
    if (! issueNumber) {
      throw new Error(`A issue number could not be obtained from the workflow event`);
    }
    return issueNumber;
  }
}

function getLabels(name): string[] {
  const labelsInput = core.getInput(name);

  if (labelsInput) {
    const values = labelsInput.split(',');
    return values.map(val => val.trim()).filter(val => val.length > 0);
  }
  return [];
}