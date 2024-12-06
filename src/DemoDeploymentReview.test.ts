import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockDeployment } from '../test/moctokit/DeploymentMockFactory.js';
import { createMockDeploymentStatus } from '../test/moctokit/DeploymentStatusMockFactory.js';
import { createMocktokit } from '../test/moctokit/Mocktokit.js';
import { DemoDeploymentReview } from './DemoDeploymentReview.js';
import { DEMO_STATES } from './constants.js';

describe('DemoDeploymentReview', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

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

      moctokit.paginateCalledWith("GET /repos/{owner}/{repo}/deployments/{deployment_id}/statuses").mockResolvedValue([createMockDeploymentStatus({ description: 'demo::lifecycle_hold' })]);

      const demoDeploymentReview = await DemoDeploymentReview.createDemoReview(moctokit, { owner: 'octodemo', repo: 'bootstrap' });

      const results = await demoDeploymentReview.analyze();

      expect(results.on_hold).toHaveLength(1);
      expect(results.on_hold[0].demo.id).toBe(demoDeployment.id);
    });

    it('correctly identifies demos to warn when the deployment state is older than 7 days', async () => {
      const fakeStatusDate = '2024-10-02T00:00:00.000Z';
      const fakeToday = new Date('2024-10-10T00:00:00.000Z');
      vi.setSystemTime(fakeToday);

      const moctokit = createMocktokit();
      const demoDeployment = createMockDeployment({ task: 'demo:deployment' });

      moctokit.paginateCalledWith("GET /repos/{owner}/{repo}/deployments").mockResolvedValueOnce([demoDeployment]);

      moctokit.paginateCalledWith("GET /repos/{owner}/{repo}/deployments/{deployment_id}/statuses").mockResolvedValue([createMockDeploymentStatus({ description: DEMO_STATES.provisioned, created_at: fakeStatusDate })]);

      const demoDeploymentReview = await DemoDeploymentReview.createDemoReview(moctokit, { owner: 'octodemo', repo: 'bootstrap' });

      const results = await demoDeploymentReview.analyze();

      expect(results.to_warn).toHaveLength(1);
      expect(results.to_warn[0].demo.id).toBe(demoDeployment.id);
    });

    it('correctly identifies demos to terminate when they are in warning state and older than 15 days', async () => {
      const fakeStatusDate = '2024-10-04T00:00:00.000Z';
      const fakeToday = new Date('2024-10-20T00:00:00.000Z');
      vi.setSystemTime(fakeToday);

      const moctokit = createMocktokit();
      const demoDeployment = createMockDeployment({ task: 'demo:deployment' });

      moctokit.paginateCalledWith("GET /repos/{owner}/{repo}/deployments").mockResolvedValueOnce([demoDeployment]);

      moctokit.paginateCalledWith("GET /repos/{owner}/{repo}/deployments/{deployment_id}/statuses").mockResolvedValue([createMockDeploymentStatus({ description:DEMO_STATES.marked_warning, created_at: fakeStatusDate })]);

      const demoDeploymentReview = await DemoDeploymentReview.createDemoReview(moctokit, { owner: 'octodemo', repo: 'bootstrap' });

      const results = await demoDeploymentReview.analyze();

      expect(results.to_terminate).toHaveLength(1);
      expect(results.to_terminate[0].demo.id).toBe(demoDeployment.id);
    });

    it('does not categorize demos already marked for termination', async () => {
      const fakeStatusDate = '2024-10-04T00:00:00.000Z';
      const fakeToday = new Date('2024-10-20T00:00:00.000Z');
      vi.setSystemTime(fakeToday);

      const moctokit = createMocktokit();
      const demoDeployment = createMockDeployment({ task: 'demo:deployment' });

      moctokit.paginateCalledWith("GET /repos/{owner}/{repo}/deployments").mockResolvedValueOnce([demoDeployment]);

      moctokit.paginateCalledWith("GET /repos/{owner}/{repo}/deployments/{deployment_id}/statuses").mockResolvedValue([createMockDeploymentStatus({ description:DEMO_STATES.marked_termination, created_at: fakeStatusDate })]);

      const demoDeploymentReview = await DemoDeploymentReview.createDemoReview(moctokit, { owner: 'octodemo', repo: 'bootstrap' });

      const results = await demoDeploymentReview.analyze();

      expect(results.processed).toHaveLength(1);
      expect(results.on_hold).toHaveLength(0);
      expect(results.errored).toHaveLength(0);
      expect(results.to_warn).toHaveLength(0);
      expect(results.to_terminate).toHaveLength(0);
    });

    it('handles multiple demo-deployments correctly', async () => {
      const fakeToday = new Date('2024-10-20T00:00:00.000Z');
      vi.setSystemTime(fakeToday);

      const moctokit = createMocktokit();

      const demoDeployment1 = createMockDeployment({ id: 1, task: 'demo:deployment' });
      const mockStatus1 = createMockDeploymentStatus({ description: DEMO_STATES.provisioned, created_at: '2024-10-12T00:00:00.000Z' });
      const demoDeployment2 = createMockDeployment({ id: 2, task: 'demo:deployment' });
      const mockStatus2 = createMockDeploymentStatus({ description: DEMO_STATES.marked_warning, created_at: '2024-10-04T00:00:00.000Z' });

      moctokit.paginateCalledWith("GET /repos/{owner}/{repo}/deployments").mockResolvedValueOnce([demoDeployment1, demoDeployment2]);

      moctokit.paginateCalledWith("GET /repos/{owner}/{repo}/deployments/{deployment_id}/statuses", { deployment_id: 1 }).mockResolvedValue([mockStatus1]);

      moctokit.paginateCalledWith("GET /repos/{owner}/{repo}/deployments/{deployment_id}/statuses", { deployment_id: 2 }).mockResolvedValue([mockStatus2]);


      const demoDeploymentReview = await DemoDeploymentReview.createDemoReview(moctokit, { owner: 'octodemo', repo: 'bootstrap' });

      const results = await demoDeploymentReview.analyze();

      expect(results.processed).toHaveLength(2);
      expect(results.on_hold).toHaveLength(0);
      expect(results.errored).toHaveLength(0);
      expect(results.to_warn).toHaveLength(1);
      expect(results.to_terminate).toHaveLength(1);
    });

  });

});
