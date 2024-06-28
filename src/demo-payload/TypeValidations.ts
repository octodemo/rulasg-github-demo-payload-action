import vine, { errors } from '@vinejs/vine';
import { Infer, SchemaTypes } from '@vinejs/vine/types';

export const TEMPLATE_OPTION_CONTAINER = 'container';

export const TEMPLATE_OPTION_REPOSITORY = 'repository';

const REPOSITORY_SCHEMA = vine.object({
  owner: vine.string(),
  repo: vine.string(),
});

export type Repository = Infer<typeof REPOSITORY_SCHEMA>;

export const TEMPLATE_SCHEMA_REPOSITORY = vine.object({
  ...REPOSITORY_SCHEMA.getProperties(),
  ref: vine.string().optional(),
});
export type RepositoryDemoTemplatePayload = Infer<typeof TEMPLATE_SCHEMA_REPOSITORY>;

export const TEMPLATE_SCHEMA_CONTAINER = vine.object({
  owner: vine.string(),
  name: vine.string(),
  version: vine.string(),
  container_registry: vine.string().optional()
});
export type ContainerDemoTemplatePayload =Infer<typeof TEMPLATE_SCHEMA_CONTAINER>;

const TEMPLATE_SCHEMA_GROUP = vine.group([
  vine.group.if(
    (data) => data.type === TEMPLATE_OPTION_REPOSITORY,
    {
      type: vine.literal(TEMPLATE_OPTION_REPOSITORY),
      template: vine.object(TEMPLATE_SCHEMA_REPOSITORY.getProperties())
    }
  ),
  vine.group.if(
    (data) => data.type === TEMPLATE_OPTION_CONTAINER,
    {
      type: vine.literal(TEMPLATE_OPTION_CONTAINER),
      template: vine.object(TEMPLATE_SCHEMA_CONTAINER.getProperties())
    }
  ),
]).otherwise((data: any, field: any) => {
  field.report('The template type is not valid', 'usupported_type', field);
});

const DEMO_TEMPLATE_DEFINITION = vine.object({}).merge(TEMPLATE_SCHEMA_GROUP);

export type DemoTemplateDefinition = Infer<typeof DEMO_TEMPLATE_DEFINITION>;

const DEMO_SCHEMA_VERSION_ONE = vine.group([
  vine.group.if(
    data => data.version === 1,
    {
      version: vine.literal(1),

      demo_definition: DEMO_TEMPLATE_DEFINITION,

      communication_issue_number: vine.number().withoutDecimals().positive().optional(),

      uuid: vine.string(),

      requestor_handle: vine.string().optional(),

      github_repository: REPOSITORY_SCHEMA,

      resources: vine.object({
        github: vine.object({}).allowUnknownProperties().optional(),
        azure: vine.object({}).allowUnknownProperties().optional(),
        aws: vine.object({}).allowUnknownProperties().optional(),
        gcp: vine.object({}).allowUnknownProperties().optional(),
        azure_devops: vine.object({}).allowUnknownProperties().optional(),
      }).optional(),

      demo_config: vine.object({}).allowUnknownProperties().optional(),
    }
  ),
]).otherwise((data: any, field: any) => {
  field.report(`Unsupported data version '${data.version}'`, 'unsupported_version', field);
});

const DEMO_PAYLOAD_SCHEMA = vine.object({
  version: vine.number().withoutDecimals().min(1).positive(),
}).merge(DEMO_SCHEMA_VERSION_ONE);

export type DemoSchema = Infer<typeof DEMO_SCHEMA_VERSION_ONE>;


export async function getDemoSchemaFromJsonString(data: string): Promise<DemoSchema>{
  return validate<typeof DEMO_PAYLOAD_SCHEMA>(DEMO_PAYLOAD_SCHEMA, data);
}

export async function getDemoTemplateDefinitionFromJsonString(data: string) {
  return await validate<typeof DEMO_TEMPLATE_DEFINITION>(DEMO_TEMPLATE_DEFINITION, data);
}

async function validate<T extends SchemaTypes>(schema: T, data: string): Promise<Infer<T>> {
  try {
    const validator = vine.compile(schema);
    const result = await validator.validate(JSON.parse(data));
    return result;
  } catch (err: any) {
    if (err instanceof errors.E_VALIDATION_ERROR) {
      // Using SimpleErrorReporter means we have a messages array with the failures do a rough conversion for now
      const failures = err.messages.map((errorMessages: any) => {return errorMessages.message}).join('; ');
      throw new Error(`Validation of JSON payload failed: ${failures}.`);
    }

    // Rethrow the error
    throw err;
  }
}