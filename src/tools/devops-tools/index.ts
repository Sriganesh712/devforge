import { actionsGenerator, composeGenerator, cronBuilder, dockerfileGenerator, envValidator } from './devops';

export const devopsTools = [
  dockerfileGenerator,
  composeGenerator,
  actionsGenerator,
  cronBuilder,
  envValidator,
];
