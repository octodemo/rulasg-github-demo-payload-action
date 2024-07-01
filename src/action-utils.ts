import * as core from '@actions/core';

export type Tags = {[key: string]: string};

export function getRequiredInput(name: string) {
  return core.getInput(name, {required: true});
}

export function setOutput(name: string, value: any) {
  core.info(`  ${name}: ${value}`);
  core.setOutput(name, value);
}

export function getTags(inputName: string): Tags {
  const raw: string = core.getInput(inputName)
    , result: Tags = {}
    ;

  if (raw) {
    const tags: string[] = raw.split(',');

    tags.forEach((tag: string) => {
      const parts =  tag.split('=');
      if (parts.length == 2) {
        result[parts[0].trim()] = parts[1].trim();
      } else {
        throw new Error(`Problem in parsing tags. The tag values must be specified in "name=value" pairs to be valid.`);
      }
    });
  }
  return result;
}