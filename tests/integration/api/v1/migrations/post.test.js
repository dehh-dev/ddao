import {
  createFixtureMigration,
  fixtureMigrationName,
  removeFixtureMigration,
} from "tests/fixtures/migrations";
import orchestrator from "tests/orchestrator";

const endpoint = `${orchestrator.webServerUrl}/api/v1/migrations`;

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await createFixtureMigration();
});

afterAll(async () => {
  await removeFixtureMigration();
  await orchestrator.clearDatabase();
});

describe("POST /api/v1/migrations", () => {
  describe("Anonymous user", () => {
    test("applies pending migrations once and then becomes a no-op", async () => {
      const firstResponse = await fetch(endpoint, { method: "POST" });
      expect(firstResponse.status).toBe(201);

      const firstBody = await firstResponse.json();
      expect(firstBody.map((migration) => migration.name)).toContain(
        fixtureMigrationName,
      );

      const secondResponse = await fetch(endpoint, { method: "POST" });
      expect(secondResponse.status).toBe(200);

      const secondBody = await secondResponse.json();
      expect(secondBody).toEqual([]);
    });
  });
});
