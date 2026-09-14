const { exec } = require("node:child_process");

const RETRY_DELAY_IN_MS = 300;

function checkPostgres() {
  exec("docker exec ddao-database pg_isready --host localhost", handleReturn);

  function handleReturn(error, stdout) {
    if (!stdout || !stdout.includes("accepting connections")) {
      process.stdout.write(".");
      setTimeout(checkPostgres, RETRY_DELAY_IN_MS);
      return;
    }

    console.log("\n🟢 Postgres aceitando conexões.\n");
  }
}

process.stdout.write("\n🔴 Aguardando Postgres aceitar conexões");
checkPostgres();
