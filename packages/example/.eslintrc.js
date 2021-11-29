module.exports = {
  root: true,
  extends: [
    'eslint:recommended'
  ],
  env: {
    es2021: true,
    jest: true,
    node: true,
  },
  parserOptions: {
    sourceType: 'module',
  },
  plugins: ['prettier'],
  rules: {
    'prettier/prettier': 'error'
  }
};
