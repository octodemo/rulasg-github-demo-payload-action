import { Octokit } from '@octokit/rest';
import { describe, beforeAll, beforeEach, afterAll, afterEach, it, expect } from 'vitest';
// import { expect } from 'chai';
import { GitHubDeploymentManager } from './GitHubDeploymentManager';
import { Repository } from './types';
import { getOctokit, getRepository } from './util';

describe('DeploymentManager', function () {

  let deploymentManager: GitHubDeploymentManager;

  let octokit: Octokit;

  let repo: Repository;

  beforeAll(() => {
    octokit = getOctokit();
    repo = getRepository();

    console.log(`Repository: ${repo.owner}/${repo.repo}`);

    deploymentManager = new GitHubDeploymentManager(repo, octokit);
  });


  describe('environments', () => {

    let environment;

    beforeAll(async () => {
      environment = await createEnvironmentDeployment('octodemo/pm-automation-001');
    });

    afterAll(async () => {
      if (environment) {
        // The tests could have already removed it, so do not fail on a 404
        try {
          await octokit.rest.repos.deleteDeployment({
            ...repo,
            deployment_id: environment.id
          })
        } catch (err: any) {
          if (err.status !== 404) {
            throw err;
          }
        }
      }
    });

    function getEnvironmentName(): string {
      return environment.environment;
    }

    async function createEnvironmentDeployment(name): Promise<{ [key: string]: any }> {
      const resp = await octokit.rest.repos.createDeployment({
        ...repo,
        ref: 'main',
        task: 'deploy',
        environment: name
      });

      if (resp.status === 201) {
        return resp.data
      } else {
        throw new Error(`Failed to create environment, unexpected status code ${resp.status}`);
      }
    }

    describe('#getEnvironmentDeployments()', () => {

      it('should get all environment deployments', async () => {
        const envName: string = getEnvironmentName();

        const results = await deploymentManager.getEnvironmentDeployments(envName);

        expect(results).to.not.be.undefined;
        expect(results).to.have.length.greaterThan(0);

        // @ts-ignore
        const env: EnvironmentDeployment = results[0];
        expect(env).to.have.property('environment').to.equal(envName);
      });

      it('should not find non-existant environments', async () => {
        const envName: string = `${getEnvironmentName()}-${Date.now()}`;

        const results = await deploymentManager.getEnvironmentDeployments(envName);

        expect(results).to.not.undefined;
      });
    });


    describe('#getEnvironmentId()', () => {

      it('should get the latest environment id', async () => {
        const id = await deploymentManager.getEnvironmentDeploymentId(getEnvironmentName());
        expect(id).to.equal(environment.id);
      });

      it('should get the latest environment id when there is more than one', async () => {
        // Create a second environment under the same name
        const envName = getEnvironmentName();
        const latestEnv = await createEnvironmentDeployment(envName);

        const id = await deploymentManager.getEnvironmentDeploymentId(envName);
        expect(id).to.equal(latestEnv.id);

        // Remove the latestEnv
        // @ts-ignore
        await deploymentManager.deleteDeployment(id);
      })
    });

    describe('#deactivateDeployment()', () => {

      it('should deactivate environment deployment', async () => {
        const id = environment.id;

        let status = await deploymentManager.getDeploymentStatus(id);
        expect(status).to.be.undefined;

        const result = await deploymentManager.deactivateDeployment(id);
        expect(result).to.be.true;

        status = await deploymentManager.getDeploymentStatus(id);
        expect(status).to.have.property('state').to.equal('inactive');
      });
    });

    describe('#deactivateAndDeleteDeployment()', () => {

      it('should delete and environment deployment', async () => {
        const id = environment.id;

        const result = await deploymentManager.deactivateAndDeleteDeployment(id);
        expect(result).to.be.true;
      });
    });
  });


  describe('demo deployments', () => {

    const DEPLOYMENT_NAME = 'test-demo-deployment'

    const UUID = '4129d60f-db50-4227-a404-c2f4416623cd';

    let deployment;

    beforeAll(async () => {
      deployment = await deploymentManager.createDemoDeployment(DEPLOYMENT_NAME, UUID, { name: 'value' });
    });

    afterAll(async () => {
      if (deployment) {
        // The tests could have already removed it, so do not fail on a 404
        try {
          await octokit.rest.repos.deleteDeployment({
            ...repo,
            deployment_id: deployment.id
          })
        } catch (err: any) {
          if (err.status !== 404) {
            throw err;
          }
        }
      }
    });

    function getDeploymentName(): string {
      return deployment.environment;
    }

    describe('#getDemoDeploymentForUUID()', () => {

      it('should fetch and existing UUID', async () => {
        const deployment = await deploymentManager.getDemoDeploymentForUUID(UUID);
        expect(deployment?.uuid).to.equal(UUID);
      });
    });

    describe('#updateDeploymentStatus()', () => {
      it('should update the status', async () => {
        const id = deployment.id;

        let update = await deploymentManager.updateDeploymentStatus(id, 'queued');
        expect(update).to.have.property('id');

        let currentState = await deploymentManager.getDeploymentStatus(id);
        expect(currentState).to.have.property('id').to.equal(update.id);
        expect(currentState).to.have.property('state').to.equal('queued');

        update = await deploymentManager.updateDeploymentStatus(id, 'success');
        expect(update).to.have.property('id');

        currentState = await deploymentManager.getDeploymentStatus(id);
        expect(currentState).to.have.property('id').to.equal(update.id);
        expect(currentState).to.have.property('state').to.equal('success');

        update = await deploymentManager.updateDeploymentStatus(id, 'error');
        expect(update).to.have.property('id');

        currentState = await deploymentManager.getDeploymentStatus(id);
        expect(currentState).to.have.property('id').to.equal(update.id);
        expect(currentState).to.have.property('state').to.equal('error');
      });
    });

    describe('#getDemoDeployment()', () => {

      it('should get an existing demo deployment', async () => {
        const name = DEPLOYMENT_NAME;

        const result = await deploymentManager.getDemoDeployment(name);
        expect(result).to.have.property('id').to.equal(deployment.id);
        expect(result).to.have.property('environment').to.equal(getDeploymentName());
        expect(result?.uuid).to.equal(UUID);
      });

      // it('should get an existing demo deployment', async () => {
      //   const name = `demo/octodemo/colinbealesDemo`;

      //   const result = await deploymentManager.getDemoDeployment(name);
      //   expect(result).to.have.property('id').to.equal(deployment.id);
      //   expect(result).to.have.property('environment').to.equal(getDeploymentName());
      // });

      it('should not retrive an non-existant demo deployment', async () => {
        const name = DEPLOYMENT_NAME + Date.now();

        const result = await deploymentManager.getDemoDeployment(name);
        expect(result).to.be.undefined;
      });
    });

    describe('#getAllDemoDeployments()', () => {

      it('should obtain all deployments', async () => {
        const allDeployments = await deploymentManager.getAllDemoDeployments();
        expect(allDeployments).to.have.length.greaterThan(0);
      });
    });
  });
});