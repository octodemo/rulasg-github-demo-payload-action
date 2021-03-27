export type Repository = {
  owner: string,
  repo: string
}

export type DeploymentState = 'error' | 'failure' | 'inactive' | 'in_progress' | 'queued' | 'pending' | 'success'

export type DeploymentStatus = {
  id: number,
  state: DeploymentState,
  description: string,
  environment: string,
  created_at: string,
  updated_at: string,
}

export type DeploymentPayload = {
  name: string,
  payload: {
    [key: string]: any
  }
}

export type EnvironmentDeployment = {
  [key: string]: any,

  id: number,
  node_id: string,

  created_at: string,
  updated_at: string,

  description?: string,
  ref: string,
  task: string,
  payload: {
    [key: string]: any,
  }
}

// Same object type today
export type DemoDeployment = EnvironmentDeployment;