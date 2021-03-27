import * as core from '@actions/core';
import { inspect } from 'util';
import { DemoPayload } from '../DemoPayload';
import { getRequiredInput, getOctokit } from '../util';

async function run() {
  try {
    await exec();
  } catch(err) {
    core.debug(inspect(err))
    core.setFailed(err);
  }
}
run();


async function exec() {
  const inputs = {
    template: {
      repo: {
        owner: getRequiredInput('template_repository_owner'),
        repo: getRequiredInput('template_repository_name'),
      },
      ref: core.getInput('template_repository_ref'),
    },
    target: {
      owner: getRequiredInput('repository_owner'),
      repo: getRequiredInput('repository_name'),
    },
    user: getRequiredInput('user'),
    issue: core.getInput('issue_id'),
  };

  const payload = new DemoPayload(inputs.target, inputs.template, inputs.user, inputs.issue);

  const octokit = getOctokit(core.getInput('github_token'));
  await payload.validate(octokit);

  payload.setActionsOutputs();

  core.startGroup('Action outputs');
  core.info(JSON.stringify(payload.getOutputs()));
  core.endGroup();

  core.startGroup('Terraform variables');
  core.info(JSON.stringify(payload.getTerraformVariables()));
  core.endGroup();
}

