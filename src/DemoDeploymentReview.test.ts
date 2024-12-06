import { describe, expect, it } from 'vitest';
import { createMockDeployment } from '../test/moctokit/DeploymentMockFactory.js';
import { createMockDeploymentStatus } from '../test/moctokit/DeploymentStatusMockFactory.js';
import { createMocktokit } from '../test/moctokit/Mocktokit.js';
import { DemoDeploymentReview } from './DemoDeploymentReview.js';

describe('DemoDeploymentReview', () => {
  describe("createDemoReview()", async () => {
    it('throws if returned deployment has different task than "demo:deployment"', async () => {
      const moctokit = createMocktokit();
      moctokit.paginateCalledWith("GET /repos/{owner}/{repo}/deployments").mockResolvedValueOnce( [createMockDeployment({ task: 'not-a-demo' })]);

      await expect(DemoDeploymentReview.createDemoReview(moctokit, { owner: 'octodemo', repo: 'bootstrap' })).rejects.toThrow("Invalid payload type not-a-demo");
    });
  });

  describe("getAllDemos", async () => {
    it('returns all demos from API().', async () => {
      const moctokit = createMocktokit();
      moctokit.paginate.mockResolvedValueOnce( [createMockDeployment(), createMockDeployment()]);


      const demoDeploymentReview = await DemoDeploymentReview.createDemoReview(moctokit, { owner: 'octodemo', repo: 'bootstrap' });

      const results = await demoDeploymentReview.getAllDemoDeployments();

      expect(results).toBeDefined();
      expect(results).toHaveLength(2);
    });

    it('loads all deployments in the constructors and caches the results after.', async () => {
      const moctokit = createMocktokit();
      moctokit.paginate.mockResolvedValueOnce( [createMockDeployment(), createMockDeployment()]);

      const demoDeploymentReview = await DemoDeploymentReview.createDemoReview(moctokit, { owner: 'octodemo', repo: 'bootstrap' });

      expect(moctokit.paginate).toBeCalledTimes(1);
      await demoDeploymentReview.getAllDemoDeployments();
      expect(moctokit.paginate).toBeCalledTimes(1);
    });
  });

  describe("analyze()", async () => {
    it('returns empty results if no deployments are returned', async () => {
      const moctokit = createMocktokit();
      moctokit.paginate.mockResolvedValueOnce( []);

      const demoDeploymentReview = await DemoDeploymentReview.createDemoReview(moctokit, { owner: 'octodemo', repo: 'bootstrap' });

      const results = await demoDeploymentReview.analyze();

      expect(results.errored).toHaveLength(0);
      expect(results.on_hold).toHaveLength(0);
      expect(results.processed).toHaveLength(0);
      expect(results.to_terminate).toHaveLength(0);
    });

    it('correctly identifies demos on hold', async () => {
      const moctokit = createMocktokit();
      const demoDeployment = createMockDeployment({ task: 'demo:deployment' });

      moctokit.paginateCalledWith("GET /repos/{owner}/{repo}/deployments").mockResolvedValueOnce([demoDeployment]);

      moctokit.rest.repos.getDeployment.mockResolvedValueOnce({ data: demoDeployment, headers: {}, status: 200, url: '' });

      moctokit.paginateCalledWith("GET /repos/{owner}/{repo}/deployments/{deployment_id}/statuses").mockResolvedValue([createMockDeploymentStatus({ description: 'demo::lifecycle_hold' })]);

      const demoDeploymentReview = await DemoDeploymentReview.createDemoReview(moctokit, { owner: 'octodemo', repo: 'bootstrap' });

      const results = await demoDeploymentReview.analyze();

      expect(results.on_hold).toHaveLength(1);
      expect(results.on_hold[0].demo.id).toBe(demoDeployment.id);
    });
  });

});
