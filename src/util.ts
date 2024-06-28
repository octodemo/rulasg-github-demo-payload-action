import {Octokit} from '@octokit/rest'
import * as github from '@actions/github';
import * as core from '@actions/core';

export type Tags = {[key: string]: string};

export type Repository = {
  owner: string,
  repo: string,
}

export function getOctokit(token?: string): Octokit {
  let octokitToken: string;

  if (!token || token.trim().length === 0) {
    octokitToken = getGitHubToken();
  } else {
    octokitToken = token;
  }

  //@ts-ignore
  return github.getOctokit(octokitToken);
}

export function getGitHubToken(): string {
  //TODO this needs reviw of all use cases, as the environment overrides the input value, whilst it is a sensible
  // default and will work for tests it does not seem correct when straddling GitHub enterprises/organizations/deployments
  // it is also inverted logic to the inputs taking precidence over any environment varaibles which should be the last
  // fallback option
  let token = process.env['GITHUB_TOKEN'];

  if (!token) {
    token = core.getInput('github_token');

    if (!token) {
      throw new Error('GitHub Token was not set for environment variable "GITHUB_TOKEN" or provided via input "github_token"');
    }
  }
  return token;
}

export function getRepository() {
  let repoOwner = process.env['GITHUB_REPO_OWNER'];
  let repoName = process.env['GITHUB_REPO_NAME'];

  return {
    owner: repoOwner || 'peter-murray',
    repo: repoName || 'github-demo-payload-action',
  };
}

export function getTags(inputName: string): Tags {
  const raw: string = core.getInput(inputName)
    , result: Tags = {}
    ;

  if (raw) {
    const tags: string[] = raw.split(',');

    tags.forEach((tag: string) => {
      const parts =  tag.split('=');
      if (parts.length == 2) {
        result[parts[0].trim()] = parts[1].trim();
      } else {
        throw new Error(`Problem in parsing tags. The tag values must be specified in "name=value" pairs to be valid.`);
      }
    });
  }
  return result;
}

export function getRequiredInput(name: string) {
  return core.getInput(name, {required: true});
}

export async function repositoryExists(octokit: Octokit, repo: Repository): Promise<boolean> {
  try {
    await octokit.rest.repos.get(repo);
    return true;
  } catch (err: any) {
    if (err.status === 404) {
      return false
    }
    throw new Error(`Failed to resolve repository ${repo.owner}/${repo.repo}, unexpected status: ${err.status}; ${err.message}`);
  }
}

export async function repositoryBranchExists(octokit: Octokit, repo: Repository, ref: string): Promise<boolean> {
  try {
    await octokit.rest.repos.getBranch({...repo, branch: ref});
    return true;
  } catch (err: any) {
    if (err.status === 404) {
      return false
    }
    throw new Error(`Failed to resolve repository ref(${ref}) on ${repo.owner}/${repo.repo}, unexpected status: ${err.status}; ${err.message}`);
  }
}

export function filterObjectKeys(originalObject: object, keysToRemove: string[]): object {
  const filteredObject = {};

  Object.keys(originalObject).forEach(key => {
    if (!keysToRemove.includes(key)) {
      filteredObject[key] = originalObject[key];
    }
  });

  return filteredObject;
}