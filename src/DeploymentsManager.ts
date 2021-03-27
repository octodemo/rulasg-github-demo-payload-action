const DEMO_DEPLOYMENT_TASK = 'demo:deployment';

class DeploymentsManager {

  constructor(context, github) {
    this.context = context;
    this.github = github;
  }

  deactivateDeployment(id) {
    return this.github.repos.createDeploymentStatus({
      ...this.context.repo,
      deployment_id: id,
      state: 'inactive',
      mediaType: {
        previews: ['ant-man']
      }
    })
  }

  deleteDeployment(id) {
    return this.github.repos.deleteDeployment({
      ...this.context.repo,
      deployment_id: id,
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
      ...this.context.repo,
      environment: name,
      task: 'deploy'
    });
  }

  getEnvironmentDeploymentId(name) {
    return this.getEnvironmentDeployments(name)
      .then(results => {
        if (results && results.data && results.data.length > 0) {
          return results.data[0].id;
        }
        return undefined;
      });
  }

  getDemoDeployments(name) {
    return this.github.repos.listDeployments({
      ...this.context.repo,
      environment: `demo/${name}`,
      task: DEMO_DEPLOYMENT_TASK,
    });
  }

  getDemoDeployment(name) {
    return this.getDemoDeployments(name)
      .then(results => {
        if (results && results.data && results.data.length > 0) {
          return results.data[0];
        }
        return undefined;
      });
  }

  createDemoDeployment(data) {
    if (!data.name) {
      throw new Error('A name is required in the data');
    }

    if (!data.payload) {
      throw new Error('A payload is required in the data');
    }

    return this.github.repos.createDeployment({
      ...this.context.repo,
      ref: this.context.ref,
      task: DEMO_DEPLOYMENT_TASK,
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
      return result.data;
    });
  }

  updateDeploymentStatus(id, status) {
    return this.github.repos.createDeploymentStatus({
      ...this.context.repo,
      deployment_id: id,
      state: status,
      auto_inactive: true,
      mediaType: {
        previews: ['ant-man', 'flash'],
      },
    });
  }
}

module.exports.create = (context, github) => {
  return new DeploymentsManager(context, github);
}