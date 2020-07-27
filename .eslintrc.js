module.exports = {
  "parserOptions": {
    "ecmaVersion": 8,
    "sourceType": "module",
  },
  "plugins": [
    "babel",
    "prettier",
    "jest"
  ],
  "extends": ["eslint:recommended", "plugin:prettier/recommended", "plugin:jest/recommended"],
  "env": {
    "es6": true,
    "browser": true,
    "commonjs": true,
  },
  "globals": {
    process: true,
    describe: true,
    test: true,
    __dirname: true,
    expect: true,
    jest: true
  },
  "rules": {
    "prettier/prettier": "error",
    "no-var": "error",
    "no-unused-vars": "off"
  }
}
