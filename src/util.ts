import * as github from '@actions/github';
import { Octokit } from '@octokit/rest';




//TODO remove this with vineJS object
export type Repository = {
  owner: string,
  repo: string,
}

export function getGitHubToken(): string {
  //TODO this needs reviw of all use cases, as the environment overrides the input value, whilst it is a sensible
  // default and will work for tests it does not seem correct when straddling GitHub enterprises/organizations/deployments
  // it is also inverted logic to the inputs taking precidence over any environment varaibles which should be the last
  // fallback option
  let token = process.env['GITHUB_TOKEN'];

  if (!token) {
    //TODO force all actions to explicitly inject this token
  //   token = core.getInput('github_token');

    if (!token) {
      throw new Error('GitHub Token was not set for environment variable "GITHUB_TOKEN" or provided via input "github_token"');
    }
  }
  return token;
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



export function getRepository() {
  let repoOwner = process.env['GITHUB_REPO_OWNER'];
  let repoName = process.env['GITHUB_REPO_NAME'];

  return {
    owner: repoOwner || 'peter-murray',
    repo: repoName || 'github-demo-payload-action',
  };
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