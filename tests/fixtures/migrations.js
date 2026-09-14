import { rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * O endpoint de migrations só tem o que provar se existir alguma migration
 * pendente. Como o projeto ainda não tem entidades, o teste cria uma migration
 * descartável de verdade em disco e a remove no final — sem mock, o runner lê
 * o mesmo diretório que leria em produção.
 */

export const fixtureMigrationName = "0000000000000_fixture-migrations-endpoint";

const fixtureMigrationPath = join(
  process.cwd(),
  "infra",
  "migrations",
  `${fixtureMigrationName}.js`,
);

const fixtureMigrationContent = `exports.up = (pgm) => {
  pgm.createTable("fixture_migrations_endpoint", { id: "id" });
};
`;

export async function createFixtureMigration() {
  await writeFile(fixtureMigrationPath, fixtureMigrationContent);
}

export async function removeFixtureMigration() {
  await rm(fixtureMigrationPath, { force: true });
}
