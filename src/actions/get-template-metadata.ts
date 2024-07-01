import * as core from '@actions/core';
import * as fs from 'fs';
import { inspect } from 'util';
import { DemoMetadata, parseDemoMetadata } from '../demo-metadata/DemoMetadata.js';
import { setOutput } from '../action-utils.js';

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
  const templateMetadataPath = core.getInput('template_metadata_file');

  let metadata: DemoMetadata;
  try {
    const fileConents = fs.readFileSync(templateMetadataPath, 'utf8');
    const json = JSON.parse(fileConents);
    metadata = await parseDemoMetadata(json);
  } catch (err: any) {
    core.error(`Failed to parse template metadata from '${templateMetadataPath}': ${err.message}`);
    throw err;
  }

  core.startGroup(`Demo Metadata`);
  setOutput(`template_name`, metadata.name);
  setOutput(`template_version`, metadata.version);

  setOutput(`template_variant`, metadata.variant);

  if (metadata.terraformMetadata) {
    setOutput(`tf_metadata_json`, JSON.stringify(metadata.terraformMetadata));
    setOutput('tf_metadta_stack_path', metadata.terraformMetadata.stack_path);

    outputScriptValue('create_pre', metadata.terraformMetadata?.lifecycle_scripts?.create?.pre);
    outputScriptValue('create_post', metadata.terraformMetadata?.lifecycle_scripts?.create?.post);
    outputScriptValue('create_finalize', metadata.terraformMetadata?.lifecycle_scripts?.create?.finalize);

    outputScriptValue('destroy_pre', metadata.terraformMetadata?.lifecycle_scripts?.destroy?.pre);
    outputScriptValue('destroy_post', metadata.terraformMetadata?.lifecycle_scripts?.destroy?.post);
    outputScriptValue('destory_finalize', metadata.terraformMetadata?.lifecycle_scripts?.destroy?.finalize);
  }

  core.endGroup();
}

function outputScriptValue(name: string, value: string | undefined) {
  if (value && value.trim().length > 0) {
    setOutput(`lifecycle_script_${name}`, value);
  }
}