import type { Config } from 'jest';

// https://jestjs.io/docs/getting-started
const config: Config = {
    verbose: true,
    testEnvironment: "node",
    // Jest only handles plain JS by default — this tells it to use SWC to transpile .ts/.tsx files first.
    transform: {
        "^.+\\.tsx?$": "@swc/jest",
    },
    reporters: [
        'default',
        ['jest-junit', { outputDirectory: 'reports', outputName: 'report.xml' }],
    ],
    setupFilesAfterEnv: ["jest-expect-message", "<rootDir>/tests/setupTests.ts"],
    roots: ["<rootDir>/tests", "<rootDir>/src"]
};

export default config;
