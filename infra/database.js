import { Client } from "pg";

import { ServiceError } from "infra/errors";

async function query(queryObject) {
  let client;

  try {
    client = await getNewClient();
    return await client.query(queryObject);
  } catch (error) {
    if (error instanceof ServiceError) {
      throw error;
    }

    throw new ServiceError({
      message: "Erro ao executar a consulta no banco de dados.",
      cause: error,
    });
  } finally {
    await client?.end();
  }
}

async function getNewClient() {
  const client = new Client({
    host: process.env.POSTGRES_HOST,
    port: process.env.POSTGRES_PORT,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
  });

  try {
    await client.connect();
  } catch (error) {
    throw new ServiceError({
      message: "Erro na conexão com o banco de dados.",
      cause: error,
    });
  }

  return client;
}

const database = {
  query,
  getNewClient,
};

export default database;
