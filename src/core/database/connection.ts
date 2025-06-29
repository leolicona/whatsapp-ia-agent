import { drizzle } from 'drizzle-orm/d1';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import * as schema from './schema';
import type { Env } from '../../bindings';

export type Database = DrizzleD1Database<typeof schema>;

export const createDatabase = (env: Env): Database => {
  return drizzle(env.DB, { schema });
};