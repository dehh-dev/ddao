import orchestrator from "tests/orchestrator";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
});

describe("GET /api/v1/status", () => {
  describe("Anonymous user", () => {
    test("retrieves current system status", async () => {
      const response = await fetch(
        `${orchestrator.webServerUrl}/api/v1/status`,
      );

      expect(response.status).toBe(200);

      const responseBody = await response.json();

      const parsedUpdatedAt = new Date(responseBody.updated_at).toISOString();
      expect(responseBody.updated_at).toEqual(parsedUpdatedAt);

      const databaseStatus = responseBody.dependencies.database;

      expect(databaseStatus.version).toMatch(/^17\./);
      expect(databaseStatus.max_connections).toBeGreaterThan(0);
      expect(databaseStatus.opened_connections).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Anonymous user with unsupported method", () => {
    test("receives 405 from the status endpoint", async () => {
      const response = await fetch(
        `${orchestrator.webServerUrl}/api/v1/status`,
        { method: "POST" },
      );

      expect(response.status).toBe(405);

      const responseBody = await response.json();

      expect(responseBody.name).toBe("MethodNotAllowedError");
      expect(responseBody.status_code).toBe(405);
    });
  });
});
