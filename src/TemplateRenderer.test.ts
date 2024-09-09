import * as path from 'path';
import { beforeEach, describe, expect, it } from 'vitest';

import { TemplateRenderer } from './TemplateRenderer.js';
import { fail } from 'assert';


describe('TemplateRenderer', () => {

  let renderer: TemplateRenderer;

  beforeEach(() => {
    const templateDirectory = path.join(__dirname, 'test_templates');
    renderer = new TemplateRenderer(templateDirectory);
  });

  describe('#renderFile', () => {

    it('should fail to render a file with no variables provided', () => {
      try {
        const renderedContent = renderer.renderFile('simple.yml', {});
        fail(`Should have thrown an error`);
      } catch (err: any) {
        expect(err.message).toContain(`Failed to render template file`);
        expect(err.message).toContain(`null or undefined value`);
      }
    });

    it('should render a file with variables', () => {
      const renderedContent = renderer.renderFile('simple.yml', {
        WORKFLOW_REFERENCE_REPO: 'octodemo-resources/common-workflows',
        version: 'main'
      });
      console.log(renderedContent);

      expect(renderedContent).to.equal(
`name: Simple Test

on:
  push:

jobs:
  init:
    runs-on: ubuntu-latest
    uses: octodemo-resources/common-workflows/.github/workflows/test.yml@main
    with:
      parameter: \${{ secrets.PARAMETER_SECRET }}
`);
    });
  });
});

