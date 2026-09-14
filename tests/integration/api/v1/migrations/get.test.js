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
});

describe("GET /api/v1/migrations", () => {
  describe("Anonymous user", () => {
    test("lists pending migrations without applying them", async () => {
      const firstResponse = await fetch(endpoint);
      expect(firstResponse.status).toBe(200);

      const firstBody = await firstResponse.json();
      expect(Array.isArray(firstBody)).toBe(true);
      expect(firstBody.map((migration) => migration.name)).toContain(
        fixtureMigrationName,
      );

      // Um dry run que aplicasse algo devolveria uma lista menor na segunda
      // chamada. Igualdade entre as duas é a prova de que nada foi gravado.
      const secondResponse = await fetch(endpoint);
      const secondBody = await secondResponse.json();

      expect(secondBody).toEqual(firstBody);
    });
  });

  describe("Anonymous user with unsupported method", () => {
    test("receives 405 from the migrations endpoint", async () => {
      const response = await fetch(endpoint, { method: "DELETE" });
      expect(response.status).toBe(405);

      const responseBody = await response.json();
      expect(responseBody.name).toBe("MethodNotAllowedError");
      expect(responseBody.status_code).toBe(405);
    });
  });
});
