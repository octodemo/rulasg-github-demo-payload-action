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

  const octokit = getOctokit(getRequiredInput('github_token'));
  const deploymentManager = new GitHubDeploymentManager(github.context.repo, octokit, github.context.ref);

  const demoDeployment: DemoDeployment = await deploymentManager.getDemoDeploymentById(Number.parseInt(deploymentId));

  core.startGroup('Demo Deployment');
  setOutput('demo_deployment_id', demoDeployment.id);
  setOutput('demo_deployment_name', demoDeployment.name);
  setOutput('demo_deployment_description', demoDeployment.description);

  const uuid = demoDeployment.uuid;
  if (uuid) {
    setOutput('demo_deployment_uuid', uuid);
  }

  const trackingIssue = demoDeployment.getTrackingIssue();
  if (trackingIssue) {
    setOutput('communication_issue_number', trackingIssue);
  }

  const demoPayload = demoDeployment.payload;
  if (demoPayload) {
    setOutput('demo_deployment_payload_json', JSON.stringify(demoPayload));

    setOutput('demo_deployment_payload_version', demoPayload.version);

    setOutput('demo_deployment_payload_template_type', demoPayload.templateType);
    setOutput('demo_deployment_payload_template_json', demoPayload.templateJsonString);

    setOutput('demo_deployment_payload_requestor', demoPayload.actor);
    setOutput('demo_deployment_payload_demo_config_json', demoPayload.additionConfigJsonString);

    const repo = demoPayload.repository;
    setOutput('demo_deployment_github_repository_owner', repo.owner);
    setOutput('demo_deployment_github_repository_name', repo.repo);
    setOutput('demo_deployment_github_repository_full_name', `${repo.owner}/${repo.repo}`);

    const demo_parameters_payload = {
      version: demoPayload.version,
      github_repository: repo,
      requestor_handle: demoPayload.actor,
      uuid: demoPayload.uuid,
      communication_issue_number: demoPayload.communicationIssueNumber,
      demo_config: demoPayload.additionalConfig,
      demo_definition_json: demoPayload.demoTemplate.asJsonString
    };
    setOutput('demo_deployment_demo_parameters_json', JSON.stringify(demo_parameters_payload));
  }
  core.endGroup();
}
