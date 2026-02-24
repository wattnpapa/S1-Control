import type { Config } from 'drizzle-kit';

export default {
  schema: './src/main/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.S1_DB_PATH || './data/s1-control.sqlite',
  },
} satisfies Config;
