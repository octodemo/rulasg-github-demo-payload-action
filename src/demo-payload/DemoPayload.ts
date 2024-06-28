import * as core from '@actions/core';
import { Octokit } from '@octokit/rest';
import { repositoryExists } from '../util.js';
import { DemoTemplateDefinitionObject, getDemoTemplateDefinition } from './DemoTemplateDefinitionObject.js';
import { DemoSchema, Repository } from './TypeValidations.js';

export type ValidationResults = {
  targetRepositoryExists: boolean,
  templateExists: boolean
}

// export function getDemoPayload(target: Repository, template: DemoTemplate, user?: string, issue?: string, demoConfig?: { [key: string]: any }, tags?: Tags) {
//   return new DemoPayload(target, template, user, issue, demoConfig, tags);
// }


// export function getDemoPayloadFromJson(data: string) {
//   try {
//     const payload = JSON.parse(data);

//     const target = {
//       owner: payload?.github?.repository_owner,
//       repo: payload?.github?.repository_name,
//     };

//     const template = getDemoTemplateFromJson(JSON.stringify(payload.template.data));

//     const user = payload?.github?.actor;
//     const issue = payload?.tracking_issue;
//     const demoConfig = payload?.github_context?.demo_config;
//     const tags = payload?.cloud_context?.tags;

//     return new DemoPayload(target, template, user, issue, demoConfig, tags);
//   } catch (err: any) {
//     throw new Error(`The demo payload data was not valid, ${err.toString()}`);
//   }
// }


export class DemoPayload {

  private validation?: ValidationResults;

  private data: DemoSchema;

  constructor(data: DemoSchema) {
    this.data = data;
  }

  get demoTemplate(): DemoTemplateDefinitionObject {
    return getDemoTemplateDefinition(this.data.demo_definition);
  }

  async validate(octokit: Octokit, templateOctokit?: Octokit): Promise<ValidationResults> {
    if (!this.validation) {
      const templateReferenceIsValid = await this.demoTemplate.isValid(templateOctokit || octokit);

      this.validation = {
        templateExists: templateReferenceIsValid,
        targetRepositoryExists: await repositoryExists(octokit, this.data.github_repository),
      }
    }
    return this.validation;
  }

  get repository(): Repository {
    return this.data.github_repository;
  }

  get uuid(): string {
    return this.data.uuid;
  }

  get asJsonString(): string {
    return JSON.stringify(this.data);
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
    // const result = {
    //   github: {
    //     actor: this.user,
    //     target_repository: {
    //       ...this.target
    //     },
    //   },

    //   template: {
    //     data: this.template.getJsonPayload()
    //   },

    //   azure_context: {},
    //   gcp_context: {},
    //   aws_context: {},

    //   cloud_context: {
    //     tags: {}
    //   }
    // };

    // if (this.linkedIssueNumber) {
    //   result.github_context['communication_issue_number'] = { id: this.linkedIssueNumber };
    // }

    // if (this.demoConfig) {
    //   result.github_context['demo_config'] = this.demoConfig;
    // }

    // if (this.tags) {
    //   result.cloud_context.tags = this.tags;
    // }

    // return result;
    //TODO need to provide and build this as a type as per the boostrap wrappers and the data variable it expects
    return {};
  }

  getActionsOutputs(): {[key: string]: string} {
    const result = {
      version: `${this.data.version}`,
      payload_json: JSON.stringify(this.data),
      demo_template: this.demoTemplate.asJsonString,
      demo_template_type: this.data.demo_definition.type,
      communication_issue_number: `${this.data.communication_issue_number}`,

      // Old values
      repository_full_name: `${this.repository.owner}/${this.repository.repo}`,
      repository_owner: this.repository.owner,
      repository_name: this.repository.repo,
      tracking_issue: `${this.data.communication_issue_number}`,
    };

    //TODO work out what this was doing
    // this.template.appendTemplateOutputValues(result);

    if (this.validation) {
      result['validation_template_exists'] = this.validation.templateExists;
      result['validation_target_repository_exists'] = this.validation.targetRepositoryExists;
    }

    return result;
  }

  setActionsOutputs(): void {
    const outputs = this.getActionsOutputs();

    Object.keys(outputs).forEach(key => {
      core.setOutput(key, outputs[key]);
    });
  }
}