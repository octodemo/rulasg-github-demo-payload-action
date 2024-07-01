import * as core from '@actions/core';
import * as github from '@actions/github';
import { inspect } from 'util';
import { DemoDeployment } from '../DemoDeployment.js';
import { GitHubDeploymentManager } from '../GitHubDeploymentManager.js';
import { getOctokit } from '../util.js';
import { getRequiredInput, setOutput } from '../action-utils.js'

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
  const deploymentId = getRequiredInput('deployment_id');
  const type = getRequiredInput('type');

  const octokit = getOctokit(getRequiredInput('github_token'));

  const deploymentManager = new GitHubDeploymentManager(github.context.repo, octokit, github.context.ref);
  const demoDeployment: DemoDeployment = await deploymentManager.getDemoDeploymentById(Number.parseInt(deploymentId));

  core.startGroup('Demo Deployment');
  setOutput('demo_deployment_id', demoDeployment.id);

  const demoTemplate = demoDeployment.payload?.demoTemplate;
  if(!demoTemplate) {
    throw new Error(`Deployment ${deploymentId}, does not have a valid demo template`);
  }

  const definitionType = demoTemplate.definition.type;
  if (type !== definitionType) {
    throw new Error(`The demo template type is not correct, expected '${type}', but got '${definitionType}'`);
  }

  if (demoTemplate.definition.type == 'repository') {
    const repo = demoTemplate.definition.template;
    setOutput('template_repository_owner', repo.owner);
    setOutput('template_repository_name', repo.repo);
    setOutput('template_repository_full_name', `${repo.owner}/${repo.repo}`);
    setOutput('template_repository_ref', repo.ref);
  } else if (demoTemplate.definition.type == 'container') {
    const container = demoTemplate.definition.template;
    setOutput('template_container_owner', container.owner);
    setOutput('template_container_name', container.name);
    setOutput('template_container_version', container.version);
    setOutput('template_container_registry', container.container_registry);
  } else {
    throw new Error(`Unsupported demo template type, '${definitionType}'`);
  }
}
