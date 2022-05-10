import * as core from '@actions/core';
import * as path from 'path';
import * as fs from 'fs';
import {inspect} from 'util';
import { getRequiredInput } from '../util';

type Secrets = {
  organization?: string[]
}


async function run() {
  try {
    await exec();
  } catch(err: any) {
    core.debug(inspect(err))
    core.setFailed(err);
  }
}
run();


async function exec() {
  const baseDirectory = getRequiredInput('base_directory')
    , secretsFile = getRequiredInput('secrets_file')
  ;

  const filePath = path.resolve(path.join(baseDirectory, secretsFile));

  try {
    const fd = fs.openSync(filePath, 'r');
    const contents = fs.readFileSync(fd);

    core.startGroup('file contents');
    core.info(contents.toString('utf-8'));
    core.endGroup();

    const data = JSON.parse(contents.toString('utf-8'));
    const payload: Secrets = {};

    if (data.organization) {
      data.organization.forEach(value => {
        const name = value.name ? value.name.trim() : undefined;

        if (name) {
          if (!payload.organization) {
            payload.organization = [];
          }
          payload.organization.push(name)
        }
      });
    }

    if (payload.organization) {
      core.startGroup('organization secrets');
      core.info(`${JSON.stringify(payload.organization, null, 2)}`);

      core.setOutput('organization_secrets', payload.organization);
      core.endGroup();
    } else {
      core.info('No organization secret access defined.');
    }

    fs.closeSync(fd);
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      core.info(`No secret requirements in template.`);
    } else {
      core.error(err.message);
      core.setFailed(err);
    }
  }
}