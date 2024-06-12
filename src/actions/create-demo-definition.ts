import * as core from '@actions/core';
import * as github from '@actions/github';
import { inspect } from 'util';
import { DEMO_STATES } from '../constants';
import { DemoPayload } from '../DemoPayload';
import { GitHubDeploymentManager } from '../GitHubDeploymentManager';
import { getOctokit, getRequiredInput, getTags } from '../util';

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
    template: {
      repo: {
        owner: getRequiredInput('template_repository_owner'),
        repo: getRequiredInput('template_repository_name'),
      },
      ref: core.getInput('template_repository_ref'),
      directory_path: core.getInput('template_repository_directory_path'),
    },
    target: {
      owner: getRequiredInput('repository_owner'),
      repo: getRequiredInput('repository_name'),
    },
    user: core.getInput('user'),
    issue: core.getInput('issue_id'),
    prevent_duplicates: core.getBooleanInput('prevent_duplicates'),
    tags: getTags('tags'),
    github_template_token: core.getInput('github_template_token'),
  };

  let demoConfig = undefined;
  try {
    let config = core.getInput('demo_config');
    if (config && config.trim().length > 0) {
      demoConfig =  config ? JSON.parse(config) : undefined;
    }
  } catch (err: any) {
    core.warning(`Demo configuration provided, but could not be parsed as JSON, ${err.message}`);
    demoConfig = undefined;
  }

  const octokit = getOctokit();
  const templateOctokit = getOctokit(inputs.github_template_token);
  const deploymentManager = new GitHubDeploymentManager(github.context.repo, octokit, github.context.ref);
  const payload = new DemoPayload(inputs.target, inputs.template, inputs.user, inputs.issue, demoConfig, inputs.tags);
  const validation = await payload.validate(octokit, templateOctokit);

  if (inputs.prevent_duplicates) {
    if (validation.targetRepoExists) {
      // Obtain the existing deployment object and check if this issue is the same as the one stored in the tracking/communication issue
      // if so the issue ticket has been re-opened and this is not technically a duplicate, although there could be a secondary workflow
      // executing a destruction workflow at the same time, we need to rely on concurrency in this case inside the composing workflows.

      const existingDeployment = await deploymentManager.getDemoDeployment(`${payload.target.owner}/${payload.target.repo}`);
      if (existingDeployment) {
        if (existingDeployment.getTrackingIssue() === payload.linkedIssueId) {
          core.warning(`Existing deployment for demo environment found and matched to the same tracking issue: ${payload.linkedIssueId}.\nThis typcially means that it was not torn down cleanly from a previous lifecycle.`);
        } else {
          core.error(`There is an existing deployment present: ${existingDeployment.id}:${existingDeployment.name} it is not allowed to have duplicate demo environments.`);
          try {
            if (inputs.issue) {
              await deploymentManager.addIssueLabels(parseInt(inputs.issue), 'duplicate');
            }
          } catch (err: any) {
            core.error(`Failed to add duplicate label to tracking issue ${inputs.issue}; ${err.message}`);
          } finally {
            throw new Error(`Target repository '${inputs.target.owner}/${inputs.target.repo}' already exists, cannot proceed.`);
          }
        }
      } else {
        try {
          if (inputs.issue) {
            await deploymentManager.addIssueLabels(parseInt(inputs.issue), 'duplicate');
          }
        } catch (err: any) {
          core.error(`Failed to add duplicate label to tracking issue ${inputs.issue}; ${err.message}`);
        } finally {
          throw new Error(`Target repository '${inputs.target.owner}/${inputs.target.repo}' already exists, cannot proceed.`);
        }
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
  await deploymentManager.updateDeploymentStatus(demoDeployment.id, 'in_progress', DEMO_STATES.provisioning);

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
