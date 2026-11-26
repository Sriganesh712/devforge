import { jsonFormatter, jsonDiff, jsonToTypescript } from './json';
import { csvViewer, xmlFormatter, yamlFormatter } from './text-formats';
import { markdownPreviewer, textDiff } from './diff-markdown';
import { base64Codec, timestampConverter, urlCodec, uuidGenerator } from './encoding';
import { regexTester } from './regex';

export const codeTools = [
  jsonFormatter,
  jsonDiff,
  jsonToTypescript,
  yamlFormatter,
  xmlFormatter,
  csvViewer,
  textDiff,
  markdownPreviewer,
  urlCodec,
  base64Codec,
  uuidGenerator,
  timestampConverter,
  regexTester,
];
