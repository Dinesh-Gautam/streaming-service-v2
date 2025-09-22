/** @type {import('ts-jest/dist').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@ai-worker/(.*)$': '<rootDir>/src/$1',
  },
};
