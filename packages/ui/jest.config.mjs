import { createDefaultEsmPreset } from 'ts-jest';

const preset = createDefaultEsmPreset({
    tsconfig: '<rootDir>/tsconfig.jest.json',
});

/** @type {import('jest').Config} */
const config = {
    ...preset,
    testEnvironment: 'node',
    roots: ['<rootDir>/src'],
    testMatch: ['**/*.test.ts'],
    moduleNameMapper: {
        '^@ui/(.*)$': '<rootDir>/src/$1',
        '^(\\.{1,2}/.*)\\.js$': '$1',
    },
    clearMocks: true,
};

export default config;
