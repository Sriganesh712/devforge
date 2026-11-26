import { connectionParser, sqlFormatter } from './sql';
import { schemaVisualizer } from './schema';

export const databaseTools = [sqlFormatter, connectionParser, schemaVisualizer];
