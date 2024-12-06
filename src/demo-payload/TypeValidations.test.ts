
import { describe, expect, it } from 'vitest';
import { getDemoSchemaFromJsonString } from './TypeValidations';

describe('DemoPayload', () => {

  describe('#getDemoSchemaFromJson', () => {

    it ('should validate a repository template definition', async () => {
      const payload = {
        version: 1,
        uuid: 'test-uuid',

        demo_definition: {
          type: 'repository',
          template: {
            owner: 'owner',
            repo: 'repo',
            ref: 'ref'
          }
        },

        github_repository: {
          owner: 'owner',
          repo: 'repo'
        }
      };

      const result = await getDemoSchemaFromJsonString(JSON.stringify(payload));
      expect(result).toBeDefined();
      expect(result.version).toBe(1);
      expect(result).toEqual(payload);
    });

    it ('should validate a container template definition', async () => {
      const payload = {
        version: 1,
        uuid: 'test-uuid',

        demo_definition: {
          type: 'container',
          template: {
            owner: 'owner_org',
            name: 'template_container',
            version: 'latest',
          }
        },

        github_repository: {
          owner: 'owner',
          repo: 'repo'
        }
      };

      const result = await getDemoSchemaFromJsonString(JSON.stringify(payload));
      expect(result).toBeDefined();
      expect(result.version).toBe(1);
      expect(result).toEqual(payload);
    });
  });
});
