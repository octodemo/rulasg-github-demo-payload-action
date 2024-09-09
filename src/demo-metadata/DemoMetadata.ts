import vine from "@vinejs/vine";
import { Infer } from '@vinejs/vine/types';
import { validate } from '../validation-utils.js';


const SCRIPTS_SCHEMA = vine.object({
  pre: vine.string().optional(),
  post: vine.string().optional(),
  finalize: vine.string().optional(),
  secrets: vine.array(vine.string()).optional(),
});

const TERRAFORM_SCHEMA = vine.object({
  stack_path: vine.string(),

  lifecycle_scripts: vine.object({
    create: SCRIPTS_SCHEMA.clone().optional(),
    destroy: SCRIPTS_SCHEMA.clone().optional(),
  }).optional(),
});

const SCRIPT_SCHEMA = vine.object({
  create: SCRIPTS_SCHEMA.clone().optional(),
  destroy: SCRIPTS_SCHEMA.clone().optional(),
});

const FRAMEWORK_V1_SCHEMA_GROUP = vine.group([
  vine.group.if(
    (data) => {
      return data.variant === 'terraform';
    },
    {
      variant: vine.literal('terraform'),
      templated_files: vine.array(vine.string()).optional(),
      terraform: TERRAFORM_SCHEMA,
    }
  ),
  vine.group.if(
    (data) => {
      return data.variant === 'script';
    },
    {
      variant: vine.literal('script'),
      templated_files: vine.array(vine.string()).optional(),
      script: SCRIPT_SCHEMA,
    }
  ),
]).otherwise((data: any, field: any) => {
  field.report('Framework variant and version combination is not supported', 'unsupported_variant', field);
});

const FRAMEWORK_V1_SCHEMA = vine.object({
  name: vine.string(),
  version: vine.number().withoutDecimals().positive().in([1]),
  lifecycle: vine.object({
    warning: vine.number().withoutDecimals().positive().optional(),
    terminate: vine.number().withoutDecimals().positive().optional(),
  }).optional(),
  resources: vine.array(vine.string()),
  framework: vine.object({}).merge(FRAMEWORK_V1_SCHEMA_GROUP),
});


export type FrameworkV1 = Infer<typeof FRAMEWORK_V1_SCHEMA>;

export type TerraformMetadata = Infer<typeof TERRAFORM_SCHEMA>;

export async function parseDemoMetadata(data: string): Promise<DemoMetadata> {
  const parsed: FrameworkV1 = await validate<typeof FRAMEWORK_V1_SCHEMA>(FRAMEWORK_V1_SCHEMA, data);
  return new DemoMetadata(parsed);
}

export class DemoMetadata {

  private data: FrameworkV1;

  constructor(data: FrameworkV1) {
    this.data = data;
  }

  get name(): string {
    return this.data.name;
  }

  get version(): number {
    return this.data.version;
  }

  get variant(): string {
    return this.data.framework.variant;
  }

  get resources(): string[] {
    return this.data.resources;
  }

  get framework(): Infer<typeof FRAMEWORK_V1_SCHEMA_GROUP> {
    return this.data.framework;
  }

  get terraformMetadata(): TerraformMetadata | undefined {
    return this.framework.variant === 'terraform' ? this.framework.terraform : undefined;
  }
}