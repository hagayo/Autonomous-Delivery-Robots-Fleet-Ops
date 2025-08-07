module.exports = {
  ...require('./jest.config.js'),
  testMatch: ['**/tests/stress/**/*.test.ts'],
  testTimeout: 60000,
  maxWorkers: 1, // Run stress tests sequentially
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup.ts',
    '<rootDir>/tests/setup/stress-test-setup.ts'
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/app.ts',
    '!src/frontend/**/*'
  ],
  coverageDirectory: 'coverage-stress',
  verbose: true
};