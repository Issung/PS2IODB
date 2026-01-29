import type { Config } from 'jest';

// https://jestjs.io/docs/getting-started
const config: Config = {
  verbose: true,
  preset: "ts-jest",
  testEnvironment: "node",
  reporters: [
    'default',
    ['jest-junit', { outputDirectory: 'reports', outputName: 'report.xml' }],
  ],
  setupFilesAfterEnv: [ "jest-expect-message", "<rootDir>/tests/setupTests.ts" ],
  roots: ["<rootDir>/tests", "<rootDir>/src"]
};

export default config;