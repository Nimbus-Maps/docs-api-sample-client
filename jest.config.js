/** @type {import('jest').Config} */
const config = {
    preset: 'ts-jest',
    testEnvironment: 'jsdom',
    roots: ['<rootDir>'],
    testMatch: ['**/__tests__/**/*.test.ts?(x)', '**/*.test.ts?(x)'],
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/$1',
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
        '^iron-session$': '<rootDir>/__tests__/mocks/iron-session.ts',
    },
    setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
    collectCoverageFrom: [
        'lib/**/*.{ts,tsx}',
        '!**/*.d.ts',
        '!**/node_modules/**',
        '!**/__tests__/**',
        '!**/coverage/**',
        '!**/.next/**',
    ],
    coverageThreshold: {
        global: {
            lines: 35,
            branches: 55,
            functions: 30,
            statements: 35,
        },
    },
    coverageProvider: 'v8',
    coverageDirectory: 'coverage',
    testPathIgnorePatterns: ['/node_modules/', '/.next/', '/coverage/'],
    transformIgnorePatterns: [
        '/node_modules/(?!(uncrypto|@tanstack)/)',
        '^.+\\.module\\.(css|sass|scss)$',
    ],
    moduleDirectories: ['node_modules', '<rootDir>'],
    testTimeout: 10000,
};

module.exports = config;
