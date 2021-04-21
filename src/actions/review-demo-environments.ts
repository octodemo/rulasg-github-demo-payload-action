import * as core from '@actions/core';
import * as github from '@actions/github';
import { inspect } from 'util';
import { GitHubDeploymentManager } from '../GitHubDeploymentManager';
import { getOctokit } from '../util';

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
  const deploymentManager = new GitHubDeploymentManager(github.context.repo, getOctokit(), github.context.ref);
  await deploymentManager.getAllDemoDeployments();
}