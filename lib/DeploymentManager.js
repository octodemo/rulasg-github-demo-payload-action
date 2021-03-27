"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeploymentManager = exports.DEMO_DEPLOYMENT_TASK = void 0;
exports.DEMO_DEPLOYMENT_TASK = 'demo:deployment';
class DeploymentManager {
    constructor(repo, github, ref) {
        this.repo = repo;
        this.github = github;
        this.ref = ref || 'main';
    }
    getDeploymentStatus(id) {
        return this.github.repos.listDeploymentStatuses({
            ...this.repo,
            deployment_id: id,
        }).then(resp => {
            if (resp.status === 200 && resp.data && resp.data.length > 0) {
                const status = resp.data[0];
                return createDeploymentStatus(status);
            }
            return undefined;
        });
    }
    deactivateDeployment(id) {
        return this.github.repos.createDeploymentStatus({
            ...this.repo,
            deployment_id: id,
            state: 'inactive',
            mediaType: {
                previews: ['ant-man']
            }
        }).then(resp => {
            return resp.status === 201;
        });
    }
    deleteDeployment(id) {
        return this.github.repos.deleteDeployment({
            ...this.repo,
            deployment_id: id,
        }).then(resp => {
            return resp.status === 204;
        });
    }
    deactivateAndDeleteDeployment(id) {
        const self = this;
        return self.deactivateDeployment(id)
            .then(() => {
            return self.deleteDeployment(id);
        });
    }
    getEnvironmentDeployments(name) {
        return this.github.repos.listDeployments({
            ...this.repo,
            environment: name,
            task: 'deploy'
        }).then(resp => {
            if (resp.status === 200 && resp.data) {
                return resp.data.map(mapDeploymentToEnvironment);
            }
            return undefined;
        });
    }
    getEnvironmentDeploymentId(name) {
        return this.getEnvironmentDeployments(name)
            .then(results => {
            if (results && results.length > 0) {
                return results[0].id;
            }
            return undefined;
        });
    }
    getDemoDeployments(name) {
        return this.github.repos.listDeployments({
            ...this.repo,
            environment: `demo/${name}`,
            task: exports.DEMO_DEPLOYMENT_TASK,
        }).then(resp => {
            if (resp.status === 200 && resp.data) {
                return resp.data.map(mapDeploymentToEnvironment);
            }
            return undefined;
        });
    }
    getDemoDeployment(name) {
        return this.getDemoDeployments(name)
            .then(results => {
            if (results && results.length > 0) {
                return results[0];
            }
            return undefined;
        });
    }
    createDemoDeployment(data) {
        return this.github.repos.createDeployment({
            ...this.repo,
            ref: this.ref,
            task: exports.DEMO_DEPLOYMENT_TASK,
            auto_merge: false,
            required_contexts: [],
            environment: `demo/${data.name}`,
            payload: data.payload,
            description: 'Tracking deployment for demo metadata',
            transient_environment: true,
            mediaType: {
                previews: ['ant-man'],
            },
        }).then(result => {
            return mapDeploymentToEnvironment(result.data);
        });
    }
    updateDeploymentStatus(id, state) {
        return this.github.repos.createDeploymentStatus({
            ...this.repo,
            deployment_id: id,
            state: state,
            auto_inactive: true,
            mediaType: {
                previews: ['ant-man', 'flash'],
            },
        }).then(resp => {
            if (resp.status !== 201) {
                throw new Error(`Failed to create deployment status, unexpected status code; ${resp.status}`);
            }
            return createDeploymentStatus(resp.data);
        });
    }
}
exports.DeploymentManager = DeploymentManager;
function mapDeploymentToEnvironment(deployment) {
    // @ts-ignore
    const result = {};
    ['id', 'node_id', 'created_at', 'updated_at', 'description', 'ref', 'task', 'payload', 'environment', 'original_environment'].forEach(key => {
        result[key] = deployment[key];
    });
    return result;
}
function createDeploymentStatus(status) {
    return {
        id: status.id,
        state: status.state,
        description: status.description || '',
        environment: status.environment || '',
        created_at: status.created_at,
        updated_at: status.updated_at,
    };
}
//# sourceMappingURL=DeploymentManager.js.map