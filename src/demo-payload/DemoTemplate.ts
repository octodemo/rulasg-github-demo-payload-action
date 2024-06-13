import { Octokit } from '@octokit/rest';
import { Repository } from '../types';
import { repositoryBranchExists, repositoryExists } from '../util';


export interface DemoTemplate {

  isValid(octokit?: Octokit): Promise<boolean>

  getDirectoryPath(): string

  getTerraformVariablesObject(): object

  appendTemplateOutputValues(result: object);
}


export class RepositoryDemoTemplate implements DemoTemplate {

  private repo: Repository;
  private ref: string;
  private directoryPath: string;

  constructor(repo: Repository, ref: string = 'main', directoryPath: string = '') {
    this.repo = repo;
    this.ref = ref;
    this.directoryPath = directoryPath;
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

// export type ContainerTemplate = Template & {
//   registry: string,
//   name: string,
//   version: string,
// }

//TODO finish this
// export class ContainerTemplate implements DemoTemplate {

// }