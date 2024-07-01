
import { describe, expect, it } from 'vitest';
import { parseDemoMetadata } from './DemoMetadata';

describe('DemoMetadata', () => {

  describe('#parseDemoMetadata', () => {

    it ('should validate a repository template definition', async () => {
      const payload = {
        name: 'Bookstore',
        version: 1,

        resources: [
          'github'
        ],

        framework: {
          variant: 'terraform',

          terraform: {
            stack_path: '/tmp/stack',
            lifecycle_scripts: {
              create: {
                post: 'echo "create post"',
              },
            }
          }
        }
      };

      const result = await parseDemoMetadata(JSON.stringify(payload));
      expect(result).toBeDefined();

      expect(result.name).toBe(payload.name);
      expect(result.version).toBe(1);
    });
  });
});