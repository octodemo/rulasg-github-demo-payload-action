import { Repository as VineRepository } from './demo-payload/TypeValidations.js';
export type Repository = VineRepository;

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

//TODO delete this file entirely