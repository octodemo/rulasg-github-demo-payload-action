import { Octokit } from '@octokit/rest';

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
  const token = process.env['GITHUB_TOKEN'];

  if (!token) {
    throw new Error('GitHub Token was not set for environment variable "GITHUB_TOKEN"');
  }
  return token;
}

export function getRepository() {
  return {
    owner: 'peter-murray',
    repo: 'github-demo-payload-action'
  };
}