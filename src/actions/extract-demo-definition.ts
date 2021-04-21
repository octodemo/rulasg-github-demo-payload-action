import * as core from '@actions/core';
import * as github from '@actions/github';
import { inspect } from 'util';
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
    owner: getRequiredInput('repository_owner'),
    repo: getRequiredInput('repository_name'),
  }
  const environmentName = `${inputs.owner}/${inputs.repo}`;

  const octokit = getOctokit();
  const deploymentManager = new GitHubDeploymentManager(github.context.repo, octokit, github.context.ref);

  core.setOutput('environment_name', environmentName);

  const deploymentId: number | undefined = await deploymentManager.getEnvironmentDeploymentId(environmentName);
  if (deploymentId) {
    core.setOutput('environment_deployment_id', deploymentId);
  }

  const demoDeployment = await deploymentManager.getDemoDeployment(environmentName);
  if (!demoDeployment) {
    core.setFailed(`No demo deployment found for ${environmentName}`);
  } else {
    const payload = demoDeployment.payload;

    core.startGroup('parameters');
    core.setOutput('terraform_variables', JSON.stringify(payload));

    core.info('terraform parameters');
    core.info(JSON.stringify(payload, null, 2));

    if (payload?.github_context.tracking_issue) {
      const issueId: number | undefined = payload.github_context.tracking_issue.id;
      if (issueId) {
        core.info(`tracking_issue_id: ${issueId}`);
        core.setOutput('tracking_issue_id', issueId);

        // Check to see if we are a duplicate per the tracking issue
        const duplicate = await demoDeployment.isDuplicate();
        core.info(`environment_is_duplicate: ${duplicate}`);
        core.setOutput('environment_is_duplicate', duplicate);
      }
    }

    const templateRepo = payload?.github_context.template_repository;
    if (templateRepo) {
      const templateFullName = `${templateRepo.owner}/${templateRepo.repo}`;
      core.info(`template_repository_full_name: ${templateFullName}`);
      core.setOutput('template_repository_full_name', templateFullName);

      core.info(`template_repository_ref: ${templateRepo.ref}`);
      core.setOutput('template_repository_ref', templateRepo.ref);
    }

    core.info(`demo_environment_deployment_id: ${demoDeployment.id}`);
    core.setOutput('demo_environment_deployment_id', demoDeployment.id);

    core.info(`demo_environment_deployment_name: ${demoDeployment.environment}`);
    core.setOutput('demo_environment_deployment_name', demoDeployment.environment);

    core.endGroup();
  }
}
