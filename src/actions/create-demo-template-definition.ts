import * as core from '@actions/core';
import { inspect } from 'util';
import { filterObjectKeys, getRequiredInput } from '../util.js';
import vine, { errors } from '@vinejs/vine';
import { DemoTemplateDefinition } from '../demo-payload/TypeValidations.js';


const DemoTemplateDefinition = vine.group([
  vine.group.if(
    data => data['template-type'] === 'repository',
    {
      'template-type': vine.literal('repository'),
      'template-owner': vine.string(),
      'template-repo': vine.string(),
      'template-ref': vine.string().optional(),
    }
  ),
  vine.group.if(
    data => data['template-type'] === 'container',
    {
      'template-type': vine.literal('container'),
      'template-owner': vine.string(),
      'template-name': vine.string(),
      'template-version': vine.string(),
      'template-container-registry': vine.string().optional(),
    }
  ),
]).otherwise((data, field) => {
  field.report(`The template type is not supported`, 'unsupported_type', field);
});

const TemplateDefinition = vine.object({
  'template-type': vine.string(),
}).allowUnknownProperties().merge(DemoTemplateDefinition).toCamelCase();


async function run() {
  try {
    await exec();
  } catch (err: any) {
    core.debug(inspect(err))
    core.setFailed(err);
  }
}
run();


async function exec() {
  const inputJson = getRequiredInput('json_data');

  let data;
  try {
    data = JSON.parse(inputJson);
  } catch (err: any) {
    core.setFailed(`Failed to parse JSON data: ${err.message}`);
    return;
  }

  let templateData: DemoTemplateDefinition;
  let parsed;
  try {
    const validator = vine.compile(TemplateDefinition);
    parsed = await validator.validate(data);

    if (parsed.templateType === 'container') {
      templateData = {
        type: 'container',
        template: {
          owner: parsed.templateOwner,
          name: parsed.templateName,
          version: parsed.templateVersion,
          container_registry: parsed.templateContainerRegistry || 'ghcr.io',
        }
      }
    } else if (parsed.templateType === 'repository') {
      templateData = {
        type: 'repository',
        template: {
          owner: parsed.templateOwner,
          repo: parsed.templateRepo,
          ref: parsed.templateRef || 'main',
        }
      }
    } else {
      // This should not be possible, but if we add more to the types above we may fall through so error
      core.setFailed(`Unsupported template type.`);
      return;
    }
  } catch (err: any) {
    if (err instanceof errors.E_VALIDATION_ERROR) {
      // Using SimpleErrorReporter means we have a messages array with the failures do a rough conversion for now
      const failures = err.messages.map((errorMessages: any) => { return errorMessages.message }).join('; ');
      core.setFailed(`Validation of JSON payload failed: ${failures}.`);
      return;
    } else {
      core.setFailed(`Unexpected error parsing JSON data: ${err.message}`);
      return;
    }
  }

  if (templateData) {
    core.setOutput('demo_template_data', JSON.stringify(templateData));

    // Extract the other data that might be present
    const otherData = filterObjectKeys(parsed,
      [
        'templateType',
        'templateOwner',
        'templateRepo',
        'templateRef',
        'templateName',
        'templateVersion',
        'templateContainerRegistry'
      ]);
    core.info(`Remaining data: ${JSON.stringify(otherData)}`);
    core.info(`  object type: ${typeof otherData}`);
    core.setOutput('other_data', JSON.stringify(otherData));
  } else {
    core.setFailed(`Was not able to generate demo template definition data, check your inputs.`);
  }
}


