
import { Endpoints } from '@octokit/types';

type GitHubDeploymentStatus = Endpoints["GET /repos/{owner}/{repo}/deployments/{deployment_id}/statuses"]["response"]["data"][0];

const DefaultDeploymentStatus: GitHubDeploymentStatus = {
  "url": "https://api.github.com/repos/octocat/example/deployments/1/statuses/42",
  "id": 42,
  "node_id": "MDE4OlN0YXR1czQy",
  "state": "success",
  "creator": {
    "login": "octocat",
    "id": 1,
    "node_id": "MDQ6VXNlcjE=",
    "avatar_url": "https://github.com/images/error/octocat_happy.gif",
    "gravatar_id": "",
    "url": "https://api.github.com/users/octocat",
    "html_url": "https://github.com/octocat",
    "followers_url": "https://api.github.com/users/octocat/followers",
    "following_url": "https://api.github.com/users/octocat/following{/other_user}",
    "gists_url": "https://api.github.com/users/octocat/gists{/gist_id}",
    "starred_url": "https://api.github.com/users/octocat/starred{/owner}{/repo}",
    "subscriptions_url": "https://api.github.com/users/octocat/subscriptions",
    "organizations_url": "https://api.github.com/users/octocat/orgs",
    "repos_url": "https://api.github.com/users/octocat/repos",
    "events_url": "https://api.github.com/users/octocat/events{/privacy}",
    "received_events_url": "https://api.github.com/users/octocat/received_events",
    "type": "User",
    "site_admin": false
  },
  "description": "demo::provisioned",
  "environment": "production",
  "target_url": "https://github.com/octocat/example/deployments/1",
  "created_at": "2012-07-20T01:19:13Z",
  "updated_at": "2012-07-20T01:19:13Z",
  "deployment_url": "https://api.github.com/repos/octocat/example/deployments/1",
  "repository_url": "https://api.github.com/repos/octocat/example",
  "performed_via_github_app": null
};

export function createMockDeploymentStatus(overrides?: Partial<GitHubDeploymentStatus>): GitHubDeploymentStatus {
  return Object.assign({}, DefaultDeploymentStatus, overrides);
}
