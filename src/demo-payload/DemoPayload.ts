import * as core from '@actions/core';
import * as github from '@actions/github';
import { Octokit } from '@octokit/rest';
import { Repository, repositoryExists, Tags } from '../util';
import { DemoTemplate } from './DemoTemplate';


import vine from '@vinejs/vine';

// const demoSchema = vine.object({
//   version: vine.number().required(),

// });


export type Demo = {
  version: number,
  demo_definition: DemoVersionOne | DemoVersionTwo
}

export type DemoVersionOne = {
  demo_template: DemoTemplate,

  communication_issue_number: number,

  requestor_handle: string,

  resources: {
    github: {
      target_repository: Repository
    },
    azure?: {},
    aws?: {},
    gcp?: {},
    azure_devops?: {},
  }
}

// TODO remove, just here for testing
export type DemoVersionTwo = {

}


export type Validation = {
  targetRepositoryExists: boolean,
  templateExists: boolean
}

export class DemoPayload {

  readonly target: Repository;

  readonly template: DemoTemplate;

  readonly user: string;

  readonly linkedIssueNumber?: number;

  private demoConfig?: { [key: string]: any };

  private tags?: Tags

  private validation?: Validation;

  constructor(target: Repository, template: DemoTemplate, user?: string, issue?: string, demoConfig?: { [key: string]: any }, tags?: Tags) {
    this.target = target;
    this.template = template;
    this.user = user || github.context.actor;

    if (issue) {
      this.linkedIssueNumber = parseInt(issue);
    }

    this.demoConfig = demoConfig || undefined;
    this.tags = tags || undefined;
  }

  async validate(octokit: Octokit, templateOctokit?: Octokit): Promise<Validation> {
    const templateReferenceIsValid = await this.template.isValid(templateOctokit || octokit);

    this.validation = {
      templateExists: templateReferenceIsValid,
      targetRepositoryExists: await repositoryExists(octokit, this.target),
    }

    return this.validation;
  }

  getTerraformVariables(): { [key: string]: any } {
    // const result = {
    //   github_context: {
    //     actor: this.user,
    //     template_repository: this.template.getTerraformVariablesObject(),
    //     template_repository_directory_path: this.template.getDirectoryPath(),

    //     target_repository: {
    //       ...this.target
    //     },
    //   },

    //   azure_context: {},
    //   gcp_context: {},
    //   aws_context: {},

    //   cloud_context: {
    //     tags: {}
    //   }
    // };
    const result = {
      github: {
        actor: this.user,
        target_repository: {
          ...this.target
        },
      },

      template: {
        data: this.template.getJsonPayload()
      },

      azure_context: {},
      gcp_context: {},
      aws_context: {},

      cloud_context: {
        tags: {}
      }
    };

    if (this.linkedIssueNumber) {
      result.github_context['communication_issue_number'] = { id: this.linkedIssueNumber };
    }

    if (this.demoConfig) {
      result.github_context['demo_config'] = this.demoConfig;
    }

    if (this.tags) {
      result.cloud_context.tags = this.tags;
    }

    return result;
  }

  getOutputs(): { [key: string]: any } {
    const result = {};
    this.template.appendTemplateOutputValues(result);

    result['repository_full_name'] = `${this.target.owner}/${this.target.repo}`;
    result['repository_owner'] = this.target.owner;
    result['repository_name'] = this.target.repo;

    if (this.linkedIssueNumber) {
      result['tracking_issue'] = this.linkedIssueNumber;
    }

    if (this.validation) {
      result['validation_template_exists'] = this.validation.templateExists;
      result['validation_target_repository_exists'] = this.validation.targetRepositoryExists;
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