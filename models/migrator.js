import { join } from "node:path";

import { runner } from "node-pg-migrate";

import database from "infra/database";

const migrationsDirectory = join(process.cwd(), "infra", "migrations");

const defaultMigrationOptions = {
  dir: migrationsDirectory,
  direction: "up",
  migrationsTable: "pgmigrations",
  verbose: false,
  log: () => {},
};

async function listPendingMigrations() {
  return await executeMigrations({ dryRun: true });
}

async function runPendingMigrations() {
  return await executeMigrations({ dryRun: false });
}

async function executeMigrations({ dryRun }) {
  let dbClient;

  try {
    dbClient = await database.getNewClient();

    return await runner({
      ...defaultMigrationOptions,
      dbClient,
      dryRun,
    });
  } finally {
    await dbClient?.end();
  }
}

const migrator = {
  listPendingMigrations,
  runPendingMigrations,
};

export default migrator;
