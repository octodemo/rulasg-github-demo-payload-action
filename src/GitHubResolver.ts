export enum GitHubType {
  dotcom = 'dotcom',
  ghes = 'ghes',
  proxima = 'proxima',
  emu = 'emu',
}

export type GitHubInstanceUrls = {
  type: GitHubType,
  base_url: string,
  api_url: string,
  terraform_api_url: string,
  container_registry_url: string
  tenant_name?: string
}

export function resolve(instanceUrl: string): GitHubInstanceUrls {
  let parsedUrl;
  try {
    parsedUrl = new URL(instanceUrl);
  } catch (err: any) {
    throw new Error(`Unable to parse provided URL '${instanceUrl}'; ${err.message}`);
  }

  const result = {
    type: GitHubType.dotcom,
    base_url: 'https://github.com',
    api_url: 'https://api.github.com',
    container_registry_url: 'https://ghcr.io',
    terraform_api_url: 'https://api.github.com/',
    tenant_name: undefined,
  };

  if (parsedUrl.hostname === 'github.com') {
    // We are on dotcom, but could be an EMU or standard dotcom
    // if (parsedUrl.pathname?.toLowerCase().startsWith('/enterprises/')) {
    //   result.type = GitHubType.emu;
    // }
    // Unless we do a proper lookup on the EMU enterprise, the above check is not really valid, so need a proper check if this is required going forward
  } else if (parsedUrl.hostname.endsWith('ghe.com')) {
    // We have a Proxima tenant
    result.type = GitHubType.proxima;
    result.base_url = `https://${parsedUrl.hostname}`;
    result.api_url = `https://api.${parsedUrl.hostname}`;
    result.container_registry_url = `https://containers.${parsedUrl.hostname}`;
    result.terraform_api_url = `${result.api_url}/`;
    result.tenant_name = parsedUrl.hostname.split('.')[0];
  } else {
    // We have a GHES instance
    result.type = GitHubType.ghes;
    result.base_url = `${parsedUrl.origin}`;
    if (parsedUrl.port) {
      result.base_url += `:${parsedUrl.port}`;
    }
    result.api_url = `${result.base_url}/api/v3`;
    result.terraform_api_url = `${result.api_url}/`;
    //container registry, needs to be enabled on the GHES instance, it could be disabled, but still provide a value for it
    result.container_registry_url = `https://containers.${parsedUrl.hostname}`;
    result.tenant_name = parsedUrl.hostname;
  }

  return result;
}