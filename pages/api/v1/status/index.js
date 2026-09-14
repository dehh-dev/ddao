import { createRouter } from "next-connect";

import controller from "infra/controller";
import database from "infra/database";

const router = createRouter();

router.get(getHandler);

export default router.handler(controller.errorHandlers);

async function getHandler(request, response) {
  const updatedAt = new Date().toISOString();

  const databaseName = process.env.POSTGRES_DB;

  const versionResult = await database.query("SHOW server_version;");
  const maxConnectionsResult = await database.query("SHOW max_connections;");
  const openedConnectionsResult = await database.query({
    text: "SELECT count(*)::int FROM pg_stat_activity WHERE datname = $1;",
    values: [databaseName],
  });

  response.status(200).json({
    updated_at: updatedAt,
    dependencies: {
      database: {
        version: versionResult.rows[0].server_version,
        max_connections: Number(maxConnectionsResult.rows[0].max_connections),
        opened_connections: openedConnectionsResult.rows[0].count,
      },
    },
  });
}
