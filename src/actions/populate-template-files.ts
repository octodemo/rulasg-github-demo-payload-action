import * as core from '@actions/core';
import * as fs from 'fs';
import * as path from 'path';
import { inspect } from 'util';
import { DemoMetadata, parseDemoMetadata } from '../demo-metadata/DemoMetadata.js';
import { TemplateRenderer } from '../TemplateRenderer.js';

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
  const templateDirectory = core.getInput('template_directory');
  const templateMetadataPath = core.getInput('template_metadata_file');
  const templateVariables = core.getInput('template_variables');

  let metadata: DemoMetadata;
  try {
    const fileContents = fs.readFileSync(templateMetadataPath, 'utf8');
    core.debug(`Metadata file contents: ${fileContents}`);
    metadata = await parseDemoMetadata(fileContents);
  } catch (err: any) {
    core.error(`Failed to parse template metadata from '${templateMetadataPath}': ${err.message}`);
    throw err;
  }

  core.startGroup(`Demo Metadata`);

  if (metadata.framework.templated_files && metadata.framework.templated_files.length > 0) {
    core.info(`Found templated files in metadata: ${JSON.stringify(metadata.framework.templated_files)}`);

    let contextVaraiables: object | undefined;
    try {
      contextVaraiables = JSON.parse(templateVariables);
    } catch(err: any) {
      core.setFailed(`Failed to parse template variables: ${err.message}`);
      contextVaraiables = undefined;
    }

    if (contextVaraiables) {
      const templateRenderer = new TemplateRenderer(templateDirectory);

      for (const templateFile in metadata.framework.templated_files) {
        const renderedContents = templateRenderer.renderFile(templateFile, contextVaraiables);
        fs.writeFileSync(path.join(templateDirectory, templateFile), renderedContents, 'utf-8');
        core.info(`  successfully rendered template file '${templateFile}'`);
      }
    }
  } else {
    core.info(`No templated files found in metadata`);
  }

  core.endGroup();
}