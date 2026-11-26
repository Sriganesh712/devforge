import {
  changelogGenerator,
  commitMessageGenerator,
  gitCommandExplainer,
  gitignoreGenerator,
  prDescriptionGenerator,
} from './git';
import { gitLogVisualizer, githubExplorer } from './graph';

export const gitTools = [
  gitCommandExplainer,
  gitignoreGenerator,
  commitMessageGenerator,
  changelogGenerator,
  prDescriptionGenerator,
  gitLogVisualizer,
  githubExplorer,
];
