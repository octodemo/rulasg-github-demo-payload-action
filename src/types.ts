export type Repository = {
  owner: string,
  repo: string
}

export type Template = {
  repo: Repository,
  ref: string,
}

export type DeploymentState = 'error' | 'failure' | 'inactive' | 'in_progress' | 'queued' | 'pending' | 'success'




export type DeploymentStatus = {
  id: number,
  state: DeploymentState,
  description?: string,
  environment?: string,
  log_url?: string,
  created_at: string,
  updated_at: string,
}

export type DeploymentPayload = {
  name: string,
  payload: {
    [key: string]: any
  }
}

export type GitHubDeployment = {
  [key: string]: any,

  id: number,
  node_id: string,
  environment: string,
  created_at: string,
  updated_at: string,
  description?: string,
  ref: string,
  task: string,
  payload?: DemoPayloadContext,
}


export type DemoPayloadContext = {
  github_context: {
    actor: string,

    template_repository: {
      repo: string,
      owner: string,
      ref: string,
    },

    target_repository: {
      owner: string,
      repo: string,
    },

    tracking_issue?: {
      id: number
    }
  },

  azure_context?: {
    [key: string]: any
  },
  gcp_context?: {
    [key: string]: any
  },
  aws_context?: {[
    key: string]: any
  },
};