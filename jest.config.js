const dotenv = require("dotenv");
const nextJest = require("next/jest");

dotenv.config({ path: ".env.development", quiet: true });

const createJestConfig = nextJest({ dir: "." });

module.exports = createJestConfig({
  testEnvironment: "node",
  moduleDirectories: ["node_modules", "<rootDir>"],
  testTimeout: 60000,
});
