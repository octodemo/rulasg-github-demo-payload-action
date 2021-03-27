import { Octokit } from '@octokit/rest';
import * as core from '@actions/core';

export type Repository = {
  owner: string,
  repo: string,
}

export function getOctokit(token?: string): Octokit {
  let octokitToken: string;

  if (!token) {
    octokitToken = getGitHubToken();
  } else {
    octokitToken = token;
  }

  return new Octokit({ auth: octokitToken });
}

export function getGitHubToken(): string {
  let token = process.env['GITHUB_TOKEN'];

  if (!token) {
    token = core.getInput('github_token');

    if (!token) {
      throw new Error('GitHub Token was not set for environment variable "GITHUB_TOKEN"');
    }
  }
  return token;
}

export function getRepository() {
  return {
    owner: 'peter-murray',
    repo: 'github-demo-payload-action'
  };
}

export function getRequiredInput(name: string) {
  return core.getInput(name, {required: true});
}

export async function repositoryExists(octokit: Octokit, repo: Repository): Promise<boolean> {
  try {
    await octokit.repos.get(repo);
    return true;
  } catch (err) {
    if (err.status === 404) {
      return false
    }
    throw new Error(`Failed to resolve repository ${repo.owner}/${repo.repo}, unexpected status: ${err.status}; ${err.message}`);
  }
}

export async function repositoryBranchExists(octokit: Octokit, repo: Repository, ref: string): Promise<boolean> {
  try {
    await octokit.repos.getBranch({...repo, branch: ref});
    return true;
  } catch (err) {
    if (err.status === 404) {
      return false
    }
    throw new Error(`Failed to resolve repository ref(${ref}) on ${repo.owner}/${repo.repo}, unexpected status: ${err.status}; ${err.message}`);
  }
}