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
  function setOutput(name: string, value: string):void {
    core.info(`${name}: ${value}`);
    core.setOutput(name, value);
  }

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
      setOutput('template_repository_owner', templateRepo.owner);
      setOutput('template_repository_name', templateRepo.repo);
      setOutput('template_repository_full_name', `${templateRepo.owner}/${templateRepo.repo}`);
      setOutput('template_repository_ref', templateRepo.ref);
    }

    setOutput('demo_environment_deployment_id', `${demoDeployment.id}`);
    setOutput('demo_environment_deployment_name', demoDeployment.environment);

    core.endGroup();
  }
}
