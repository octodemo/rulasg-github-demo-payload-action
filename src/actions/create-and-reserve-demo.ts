import * as core from '@actions/core';
import * as github from '@actions/github';
import { inspect } from 'util';
import { DemoDeployment } from '../DemoDeployment';
import { DemoPayload } from '../DemoPayload';
import { GitHubDeploymentManager } from '../GitHubDeploymentManager';
import { DEMO_STATES } from '../constants';
import { getOctokit, getRequiredInput, getTags, repositoryExists } from '../util';

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
    },

    target: {
      owner: getRequiredInput('repository_owner'),
    },

    user: core.getInput('user'),
    issue: core.getInput('issue_id'),
    tags: getTags('tags'),
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
  const deploymentManager = new GitHubDeploymentManager(github.context.repo, octokit, github.context.ref);

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
        core.info(`  reposity deos not exist, but an existing deployment was found, skipping...`);
      } else {
        const targetRepo = {
          owner: inputs.target.owner,
          repo: potentialRepositoryName,
        };
        payload = new DemoPayload(targetRepo, inputs.template, inputs.user, inputs.issue, demoConfig, inputs.tags);

        const validation = await payload.validate(octokit);
        if (validation.templateExists && validation.templateRefExists && !validation.targetRepoExists) {
          // Provide the outputs to the workflow
          payload.setActionsOutputs();

          demoDeployment = await deploymentManager.createDemoDeployment(
            `${payload.target.owner}/${payload.target.repo}`,
            payload.getTerraformVariables()
          );
          core.info(`  reserved repository`);
        }
      }
    }

    // Increment the name index to try another one
    nameIndex++;
  } while (demoDeployment === undefined && nameIndex < potentialNamesCount);
  core.endGroup();

  if (!demoDeployment) {
    core.setFailed(`Could not create a deployment using the provided repository names for the organization '${inputs.target.owner}: ${JSON.stringify(potentialNames)}'`);
  } else {
    core.setOutput('demo_deployment_id', demoDeployment.id);

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