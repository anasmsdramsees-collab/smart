module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: { project: 'tsconfig.eslint.json', sourceType: 'module' },
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  root: true,
  env: { node: true },
  ignorePatterns: ['.eslintrc.cjs', 'dist'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
  },
};
