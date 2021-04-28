export const DEMO_DEPLOYMENT_TASK: string = 'demo:deployment';

export const DEMO_STATES = {
  provisioning: 'demo::provisioning',
  provisioned: 'demo::provisioned',

  destroying: 'demo::destroying',
  destroyed: 'demo::destroyed',

  error: 'demo::error',

  marked_hold: 'demo::lifecycle_hold',
  marked_warning: 'demo::lifecycle_warning',
  marked_termination: 'demo::lifecycle_terminate',
}
