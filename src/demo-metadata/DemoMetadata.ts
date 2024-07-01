import vine from "@vinejs/vine";
import { Infer } from '@vinejs/vine/types';
import { validate } from "src/demo-payload/TypeValidations.js";

const TERRAFORM_SCHEMA = vine.object({
  stack_path: vine.string(),

  lifecycle_scripts: vine.object({
    create: vine.object({
      pre: vine.string().optional(),
      post: vine.string().optional(),
      finalize: vine.string().optional(),
      secrets: vine.array(vine.string()).optional(),
    }).optional(),

    destroy: vine.object({
      pre: vine.string().optional(),
      post: vine.string().optional(),
      finalize: vine.string().optional(),
      secrets: vine.array(vine.string()).optional(),
    }).optional(),
  }).optional(),
});

const SCRIPT_SCHEMA = vine.object({
  create: vine.object({
    pre: vine.string().optional(),
    post: vine.string().optional(),
    finalize: vine.string().optional(),
    secrets: vine.array(vine.string()).optional(),
  }).optional(),

  destroy: vine.object({
    pre: vine.string().optional(),
    post: vine.string().optional(),
    finalize: vine.string().optional(),
    secrets: vine.array(vine.string()).optional(),
  }).optional(),
});

const FRAMEWORK_V1_SCHEMA_GROUP = vine.group([
  vine.group.if(
    (data) => {
      return data.version === 1 && data.variant === 'terraform';
    },
    {
      variant: vine.literal('terraform'),
      terraform: TERRAFORM_SCHEMA,
    }
  ),
  vine.group.if(
    (data) => {
      return data.version === 1 && data.variant === 'script';
    },
    {
      variant: vine.literal('script'),
      script: SCRIPT_SCHEMA,
    }
  ),
]).otherwise((data: any, field: any) => {
  field.report('Framework variant and version combination is not supported', 'unsupported_variant', field);
});

const FRAMEWORK_V1_SCHEMA = vine.object({
  name: vine.string(),
  version: vine.number().withoutDecimals().positive(),
  resources: vine.array(vine.string()),
  variant: vine.string().in(['terraform', 'script']),
}).merge(FRAMEWORK_V1_SCHEMA_GROUP);


export type FrameworkV1 = Infer<typeof FRAMEWORK_V1_SCHEMA>;

export type TerraformMetadata = Infer<typeof TERRAFORM_SCHEMA>;

export async function parseDemoMetadata(data: any): Promise<DemoMetadata> {
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
    return this.data.variant;
  }

  get resources(): string[] {
    return this.data.resources;
  }

  get terraformMetadata(): TerraformMetadata | undefined {
    return this.data.variant === 'terraform' ? this.data.terraform : undefined;
  }
}