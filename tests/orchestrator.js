import retry from "async-retry";

const WEB_SERVER_URL = "http://localhost:3000";

async function waitForAllServices() {
  await waitForWebServer();
}

async function waitForWebServer() {
  return retry(fetchStatusEndpoint, {
    retries: 100,
    minTimeout: 100,
    maxTimeout: 1000,
  });

  async function fetchStatusEndpoint() {
    const response = await fetch(`${WEB_SERVER_URL}/api/v1/status`);

    if (response.status !== 200) {
      throw new Error(`Web server respondeu ${response.status}.`);
    }
  }
}

const orchestrator = {
  waitForAllServices,
  webServerUrl: WEB_SERVER_URL,
};

export default orchestrator;
