import * as core from '@actions/core';
import * as github from '@actions/github';
import { inspect } from 'util';
import { DemoDeployment } from '../DemoDeployment';
import { GitHubDeploymentManager } from '../GitHubDeploymentManager';
import { DEMO_STATES } from '../constants';
import { getOctokit, getRequiredInput, getTags, repositoryExists } from '../util';
import { DemoTemplate, getDemoTemplate } from '../demo-payload/DemoTemplate';
import { DemoPayload } from '../demo-payload/DemoPayload';

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
  let template: DemoTemplate;
  try {
    template = getDemoTemplate(getRequiredInput('template_data'));
  } catch (err: any) {
    core.setFailed(err);
    return;
  }

  const inputs = {
    template: template,
    target: {
      owner: getRequiredInput('repository_owner'),
    },
    user: core.getInput('user'),
    issue: core.getInput('issue_id'),
    uuid: core.getInput('uuid'),
    tags: getTags('tags'),
    github_template_token: core.getInput('github_template_token'),
    github_token: getRequiredInput('github_token'),
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

  const octokit = getOctokit(inputs.github_token);
  const templateOctokit = getOctokit(inputs.github_template_token);
  const deploymentManager = new GitHubDeploymentManager(github.context.repo, octokit, github.context.ref);

  // Before we do anything check to see if the UUID of the deployment already exists and if so fail
  // we expect that deployments will nto be recycled instead spending a time going through the lifecycle
  // before ultimately being deleted once the lifecycle has completed.
  core.info(`Checking for existing demo deployment for UUID: ${inputs.uuid}...`);
  const existing = await deploymentManager.getDemoDeploymentForUUID(inputs.uuid);
  if (existing) {
    core.setFailed(`A demo deployment already exists for the UUID ${inputs.uuid}`);
    //TODO might need to provide additional error details on the existing deployment
    return;
  }

  try {
    core.info(`Validating template reference...`);
    const templateValid = await inputs.template.isValid(templateOctokit);
    if (!templateValid) {
      core.setFailed(`Demo template is not valid, ${inputs.template.name}`);
      return;
    }
  } catch (err: any) {
    core.setFailed(`Failure validating template: ${err.message}`);
    return;
  }

  const potentialNames = loadNames(getRequiredInput('potential_repository_names'));
  const potentialNamesCount = potentialNames.length;

  core.startGroup(`Finding a valid repository for the demo deployment`);

  let demoDeployment: DemoDeployment | undefined = undefined;
  let payload: DemoPayload | undefined = undefined;
  let nameIndex = 0;
  do {
    const potentialRepositoryName = potentialNames[nameIndex];
    const repo = {
      owner: inputs.target.owner,
      repo: potentialRepositoryName
    }
    core.info(`checking repository exists '${repo.owner}/${repo.repo}'`);

    const exists = await repositoryExists(octokit, repo);
    if (exists) {
      core.info(`  already exists, skipping...`);
    }
    else {
      // Now check and verify if there is an existing deployment object sitting in place for this repoisitory, as we might have another process running in parallel creating one
      // or another process deleting one, but the deployment is not gone yet.
      // There could be a secondary workflow executing a destruction workflow at the same time, we need to rely on concurrency in this case inside the composing workflows.
      const existingDeployment = await deploymentManager.getDemoDeployment(`${inputs.target.owner}/${potentialRepositoryName}`);

      if (existingDeployment) {
        core.info(`  repository does not exist, but an existing deployment was found, skipping...`);
      } else {
        const targetRepo = {
          owner: inputs.target.owner,
          repo: potentialRepositoryName,
        };
        payload = new DemoPayload(targetRepo, inputs.template, inputs.user, inputs.issue, demoConfig, inputs.tags);

        const validation = await payload.validate(octokit, templateOctokit);
        if (validation.templateExists && !validation.targetRepositoryExists) {
          // Provide the outputs to the workflow
          payload.setActionsOutputs();

          demoDeployment = await deploymentManager.createDemoDeployment(
            `${payload.target.owner}/${payload.target.repo}`,
            inputs.uuid,
            payload.getTerraformVariables()
          );
          core.info(`  reserved repository`);
        } else {
          core.info(`  failed validation (${JSON.stringify(validation)}), skipping`);
        }
      }
    }

    // Increment the name index to try another one
    nameIndex++;
  } while (demoDeployment === undefined && nameIndex < potentialNamesCount);
  core.endGroup();

  if (!demoDeployment) {
    core.setFailed(`Could not create a deployment using the provided repository names for the organization '${inputs.target.owner}': ${JSON.stringify(potentialNames)}'`);
  } else {
    core.setOutput('demo_deployment_id', demoDeployment.id);
    core.setOutput('demo_deployment_uuid', demoDeployment.uuid);

    // Show the demo deployment in progress
    await deploymentManager.updateDeploymentStatus(demoDeployment.id, 'in_progress', DEMO_STATES.provisioning);

    core.startGroup('Demo Deployment')
    core.info(`id = ${demoDeployment.id}`);
    core.endGroup();

    if (payload) {
      core.startGroup('Action outputs');
      core.info(JSON.stringify(payload.getOutputs(), null, 2));
      core.endGroup();

      core.startGroup('Terraform variables');
      core.info(JSON.stringify(payload.getTerraformVariables(), null, 2));
      core.endGroup();
    }
  }
}


function loadNames(value: string): string[] {
  return value.split(',').map(value => value.trim());
}