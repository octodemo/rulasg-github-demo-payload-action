import { DemoSchema } from '../../src/demo-payload/TypeValidations';

const DefaultDeploymentPayload: DemoSchema = {
  version: 1,
  demo_definition: {
    type: "repository",
    template: {
      owner: "octodemo-resources",
      repo: "tmpl_codespaces_v1.5",
      ref: "main"
    }
  },
  communication_issue_number: 701,
  uuid: "2f48b643-3967-5043-8d5d-b43c3ccd29e3",
  requestor_handle: "arnaudlh",
  github_repository: {
    owner: "octodemo",
    repo: "probable-octo-giggle"
  },
  demo_config: {
    "demo-repository-owner": "octodemo"
  },
  resources: undefined
}

function createMockDeploymentPayload(overrides?: Partial<DemoSchema>): DemoSchema {
  return {
    ...DefaultDeploymentPayload,
    ...overrides
  }
}

export {
  createMockDeploymentPayload
};
