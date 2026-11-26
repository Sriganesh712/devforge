'use client';

import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import type { CustomToolUi } from '@/packages/tool-sdk/types';
import type { ToolUiProps } from './types';

/**
 * Each custom view is a separate client chunk. The tool page only downloads the
 * view it needs, and never imports the server-side registry.
 */
export const customToolComponents: Record<
  CustomToolUi,
  LazyExoticComponent<ComponentType<ToolUiProps>>
> = {
  regex: lazy(() => import('./code-ui').then((module) => ({ default: module.RegexUi }))),
  markdown: lazy(() => import('./code-ui').then((module) => ({ default: module.MarkdownUi }))),
  html: lazy(() => import('./code-ui').then((module) => ({ default: module.HtmlUi }))),
  schema: lazy(() => import('./code-ui').then((module) => ({ default: module.SchemaUi }))),
  'git-graph': lazy(() => import('./code-ui').then((module) => ({ default: module.GitGraphUi }))),
  compare: lazy(() => import('./code-ui').then((module) => ({ default: module.CompareUi }))),
  gradient: lazy(() => import('./css-ui').then((module) => ({ default: module.GradientUi }))),
  shadow: lazy(() => import('./css-ui').then((module) => ({ default: module.ShadowUi }))),
  color: lazy(() => import('./css-ui').then((module) => ({ default: module.ColorUi }))),
  contrast: lazy(() => import('./css-ui').then((module) => ({ default: module.ContrastUi }))),
  flexbox: lazy(() => import('./css-ui').then((module) => ({ default: module.FlexboxUi }))),
  jwt: lazy(() => import('./security-ui').then((module) => ({ default: module.JwtUi }))),
  password: lazy(() => import('./security-ui').then((module) => ({ default: module.PasswordUi }))),
  http: lazy(() => import('./network-ui').then((module) => ({ default: module.HttpUi }))),
  github: lazy(() => import('./network-ui').then((module) => ({ default: module.GithubUi }))),
  cron: lazy(() => import('./cron-ui').then((module) => ({ default: module.CronUi }))),
};
