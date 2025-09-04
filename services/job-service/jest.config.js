/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: './',
  // ensure Jest only picks up tests under src
  testMatch: ['<rootDir>/src/**/*.test.ts'],
  // ignore compiled output and node_modules
  testPathIgnorePatterns: ['<rootDir>/dist/', '<rootDir>/node_modules/'],
  coveragePathIgnorePatterns: ['<rootDir>/dist/'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  moduleNameMapper: {
    '^@job-service/(.*)$': '<rootDir>/src/$1',
  },
};
