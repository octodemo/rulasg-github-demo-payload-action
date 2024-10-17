import * as nunjucks from 'nunjucks';
import * as path from 'path';

export class TemplateRenderer {

  readonly directory: string;

  constructor(directory: string) {
    this.directory = path.normalize(directory);

    nunjucks.configure({
      throwOnUndefined: true,
      tags: {
        blockStart: '<%',
        blockEnd: '%>',
        variableStart: '<$',
        variableEnd: '$>',
        commentStart: '<#',
        commentEnd: '#>'
      }
    });
  }

  renderFile(file: string, variables: object): string {
    const filePath = path.join(this.directory, file);

    try {
      const renderedContent = nunjucks.render(filePath, variables);
      return renderedContent;
    } catch (err: any) {
      throw new Error(`Failed to render template file '${filePath}': ${err.message}`);
    }
  }
}