import * as core from '@actions/core';
import * as github from '@actions/github';
import { Octokit } from '@octokit/rest';
import { Template } from './types';
import { Repository, repositoryBranchExists, repositoryExists } from './util';


export type Validation = {
  templateExists: boolean,
  templateRefExists: boolean,
  targetRepoExists: boolean,
}

export class DemoPayload {

  readonly target: Repository;

  readonly template: Template;

  readonly user: string;

  readonly linkedIssueId?: number;

  private demoConfig?: {[key: string]: any};

  private validation?: Validation;

  constructor(target: Repository, template: Template, user?: string, issue?: string, demoConfig?: {[key: string]: any}) {
    this.target = target;
    this.template = template;
    this.user = user || github.context.actor;

    if (issue) {
      this.linkedIssueId = parseInt(issue);
    }

    if (demoConfig) {
      this.demoConfig = demoConfig;
    }
  }

  async validate(octokit: Octokit): Promise<Validation> {
    this.validation = {
      templateExists: await repositoryExists(octokit, this.template.repo),
      templateRefExists: await repositoryBranchExists(octokit, this.template.repo, this.template.ref),
      targetRepoExists: await repositoryExists(octokit, this.target),
    }

    return this.validation;
  }

  getTerraformVariables(): { [key: string]: any } {
    const result = {
      github_context: {
        actor: this.user,
        template_repository: {
          ...this.template.repo,
          ref: this.template.ref,
        },
        target_repository: {
          ...this.target
        },
      },

      azure_context: {},
      gcp_context: {},
      aws_context: {},
    };

    if (this.linkedIssueId) {
      result.github_context['tracking_issue'] = { id: this.linkedIssueId };
    }

    if (this.demoConfig) {
      result.github_context['demo_config'] = this.demoConfig;
    }

    return result;
  }

  getOutputs(): { [key: string]: any } {
    const result = {};

    result['template_repository_full_name'] = `${this.template.repo.owner}/${this.template.repo.repo}`;
    result['template_repository_owner'] = this.template.repo.owner;
    result['template_repository_name'] = this.template.repo.repo;
    result['template_repository_ref'] = this.template.ref || '';

    result['repository_full_name'] = `${this.target.owner}/${this.target.repo}`;
    result['repository_owner'] = this.target.owner;
    result['repository_name'] = this.target.repo;

    if (this.linkedIssueId) {
      result['tracking_issue'] = this.linkedIssueId;
    }

    if (this.validation) {
      result['validation_template_repository_exists'] = this.validation.templateExists;
      result['validation_template_repository_ref_exists'] = this.validation.templateRefExists;
      result['validation_repository_exists'] = this.validation.targetRepoExists;
    }

    result['terraform_variables'] = `${JSON.stringify(this.getTerraformVariables())}`

    return result;
  }

  setActionsOutputs(): void {
    const outputs = this.getOutputs();

    Object.keys(outputs).forEach(key => {
      core.setOutput(key, outputs[key]);
    });
  }
}