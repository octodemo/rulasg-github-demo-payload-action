import * as core from '@actions/core';
import * as github from '@actions/github';
import { inspect } from 'util';
import { DemoPayload } from '../DemoPayload';
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
    user: core.getInput('user'),
    issue: core.getInput('issue_id'),
    prevent_duplicates: !!core.getInput('prevent_duplicates')
  };

  const octokit = getOctokit();
  const deploymentManager = new GitHubDeploymentManager(github.context.repo, octokit, github.context.ref);
  const payload = new DemoPayload(inputs.target, inputs.template, inputs.user, inputs.issue);
  const validation = await payload.validate(octokit);

  if (inputs.prevent_duplicates) {
    if (validation.targetRepoExists) {
      try {
        if (inputs.issue) {
          await octokit.issues.addLabels({
            ...github.context.repo,
            issue_number: parseInt(inputs.issue),
            labels: ['duplicate']
          });
        }
      } catch (err) {
        core.error(`Failed to add duplicate label to tracking issue ${inputs.issue}; ${err.message}`);
      } finally {
        throw new Error(`Target repository '${inputs.target.owner}/${inputs.target.repo}' already exists, cannot proceed.`);
      }
    }
  }

  // Provide the outputs to the workflow
  payload.setActionsOutputs();

  // Create the demo deployment on the repository for the provisioning
  const demoDeployment = await deploymentManager.createDemoDeployment(
    `${inputs.target.owner}/${inputs.target.repo}`,
    payload.getTerraformVariables()
  );
  core.setOutput('demo_deployment_id', demoDeployment.id);

  // Show the demo deployment in progress
  await deploymentManager.updateDeploymentStatus(demoDeployment.id, 'in_progress');

  core.startGroup('Demo Deployment')
  core.info(`id = ${demoDeployment.id}`);
  core.endGroup();

  core.startGroup('Action outputs');
  core.info(JSON.stringify(payload.getOutputs(), null, 2));
  core.endGroup();

  core.startGroup('Terraform variables');
  core.info(JSON.stringify(payload.getTerraformVariables(), null, 2));
  core.endGroup();
}
