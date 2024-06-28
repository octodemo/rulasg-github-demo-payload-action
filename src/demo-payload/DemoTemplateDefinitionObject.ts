import { Octokit } from '@octokit/rest';
import { repositoryBranchExists, repositoryExists } from '../util.js';

import {
  TEMPLATE_OPTION_CONTAINER,
  TEMPLATE_OPTION_REPOSITORY,
  Repository,
  DemoTemplateDefinition,
  RepositoryDemoTemplatePayload,
  ContainerDemoTemplatePayload
} from './TypeValidations.js';


export function getDemoTemplateDefinition(data: DemoTemplateDefinition) {
  if (data.type === TEMPLATE_OPTION_REPOSITORY) {
    return new RepositoryDemoTemplateDefinition(data);
  } else if (data.type === TEMPLATE_OPTION_CONTAINER) {
    return new ContainerDemoTemplateDefintion(data);
  } else {
    throw new Error(`Unsupported template type: ${JSON.stringify(data)}`);
  }
}

export abstract class DemoTemplateDefinitionObject {

  protected data: DemoTemplateDefinition;

  constructor(data: DemoTemplateDefinition) {
    this.data = data;
  }

  abstract isValid(octokit?: Octokit): Promise<boolean>

  abstract getTerraformVariablesObject(): object

  abstract appendTemplateOutputValues(result: object): void;

  get asJsonString(): string {
    return JSON.stringify(this.data);
  }

  get definition(): DemoTemplateDefinition {
    return this.data;
  }

  abstract get name(): string
}


export class RepositoryDemoTemplateDefinition extends DemoTemplateDefinitionObject {

  constructor(data: DemoTemplateDefinition) {
    if (data.type !== TEMPLATE_OPTION_REPOSITORY) {
      throw new Error(`Invalid template type, '${data.type}', in provided template data, '${data}'.`);
    }
    super(data);
  }

  private get template(): RepositoryDemoTemplatePayload {
    //@ts-ignore
    return this.data.template;
  }

  get repo(): Repository {
    return {
      owner: this.template.owner,
      repo: this.template.repo
    };
  }

  get ref() {
    return this.template.ref || 'main';
  }

  get name(): string {
    const repo = this.repo;
    return `${repo.owner}/${repo.repo}:${this.ref}`;
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

  // asJsonString(): string {
  //   return JSON.stringify(this.data);
  // }

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
  }
}

export class ContainerDemoTemplateDefintion extends DemoTemplateDefinitionObject {

  constructor(data: DemoTemplateDefinition) {
    if (data.type !== TEMPLATE_OPTION_CONTAINER) {
      throw new Error(`Invalid template type, '${data.type}', in provided template data, '${data}'.`);
    }
    super(data);
  }

  private get template(): ContainerDemoTemplatePayload {
    //@ts-ignore
    return this.data.template;
  }

  get owner() {
    return this.template.owner;
  }

  get containerName() {
    return this.template.name;
  }

  get version() {
    return this.template.version;
  }

  get containerRegistry() {
    return this.template.container_registry || 'ghcr.io';
  }

  get name() {
    return `${this.containerRegistry}/${this.owner}/${this.containerName}:${this.version}`;
  }

  getTerraformVariablesObject(): object {
    throw new Error('Method not implemented.');
  }

  appendTemplateOutputValues(result: object) {
    throw new Error('Method not implemented.');
  }

  // asJsonString(): string {
  //   throw new Error('Method not implemented.');
  // }

  async isValid(octokit?: Octokit) {
    //TODO need to implement this check to leverage the GitHub container registry APIs
    return false;
  }
}