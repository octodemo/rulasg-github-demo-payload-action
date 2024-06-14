import { Octokit } from '@octokit/rest';
import { Repository } from '../types';
import { repositoryBranchExists, repositoryExists } from '../util';

export const PAYLOAD_TYPE_CONTAINER = 'container';
export const PAYLOAD_TYPE_REPOSITORY = 'repository';

export type RepositoryDemoTemplatePayload = {
  type: 'repository',
  owner: string
  repo: string,
  ref?: string,
  directory_path?: string,
}

export type ContainerDemoTemplatePayload = {
  type: 'container',
  owner: string
  name: string,
  version: string
  container_registry?: string
}

export function getDemoTemplate(data: string): DemoTemplate {
  try {
    const payload = JSON.parse(data);
    const type = payload?.type.toLowerCase();

    switch(type) {
      case 'container': {
        return new ContainerDemoTemplate(payload);
      }
      case 'repository': {
        return new RepositoryDemoTemplate(payload);
      }
      default: {
        throw new Error(`Invalid template type, '${type}', in provided template data, '${data}'.`);
      }
    }

  } catch (err: any) {
    throw new Error(`The template data was not valid, ${err.toString()}`);
  }
}


export interface DemoTemplate {

  isValid(octokit?: Octokit): Promise<boolean>

  getDirectoryPath(): string

  getTerraformVariablesObject(): object

  appendTemplateOutputValues(result: object);

  get name(): string
}

export class RepositoryDemoTemplate implements DemoTemplate {

  private repo: Repository;
  private ref: string;
  private directoryPath: string;

  constructor(payload: string) {
    let data: RepositoryDemoTemplatePayload;
    try {
      data = JSON.parse(payload);
    } catch (err: any) {
      throw new Error(`Failed to parse the payload data for the template '${payload}': ${err.message}`);
    }

    this.repo = {
      owner: data.owner,
      repo: data.repo,
    };
    this.ref = data.ref || 'main';
    this.directoryPath = data.directory_path || '';
  }

  get name(): string {
    return `${this.repo.owner}/${this.repo.repo}:${this.ref}`;
  }

  async isValid(octokit?: Octokit) {
    if (!octokit) {
      throw new Error(`An octokit is required to test the validity of a repository template reference`)
    }

    const repoExists = await repositoryExists(octokit, this.repo);
    if (repoExists) {
      return await repositoryBranchExists(octokit, this.repo, this.ref);
    }

    return false;
  }

  getDirectoryPath(): string {
    return this.directoryPath;
  }

  getTerraformVariablesObject() {
    return {
      ...this.repo,
      ref: this.ref
    }
  }

  appendTemplateOutputValues(result: object): void {
    result['template_repository_full_name'] = `${this.repo.owner}/${this.repo.repo}`;
    result['template_repository_owner'] = this.repo.owner;
    result['template_repository_name'] = this.repo.repo;
    result['template_repository_ref'] = this.ref || '';
    result['template_repository_directory_path'] = this.directoryPath;
  }
}

export class ContainerDemoTemplate implements DemoTemplate {

  private owner: string;
  private containerName: string;
  private version: string;
  private ghcr: string;

  constructor(payload: string) {
    let data: ContainerDemoTemplatePayload;
    try {
      data = JSON.parse(payload);
    } catch (err: any) {
      throw new Error(`Failed to parse the payload data for the template '${payload}': ${err.message}`);
    }

    this.owner = data.owner;
    this.containerName = data.name;
    this.version = data.version;
    this.ghcr = data.container_registry || `ghcr.io`;
  }

  getDirectoryPath(): string {
    throw new Error('Method not implemented.');
  }

  getTerraformVariablesObject(): object {
    throw new Error('Method not implemented.');
  }

  appendTemplateOutputValues(result: object) {
    throw new Error('Method not implemented.');
  }

  get name() {
    return `${this.ghcr}/${this.owner}/${this.containerName}:${this.version}`;
  }

  async isValid(octokit?: Octokit) {
    return true;
  }
}