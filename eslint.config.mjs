export default [
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "build/**",
      ".expo/**",
      "web-client/dist/**",
      "web-client/node_modules/**",
      "admin-dashboard/dist/**",
      "admin-dashboard/node_modules/**"
    ]
  },
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        }
      }
    },
    rules: {
      "no-unused-vars": "off",
      "no-undef": "off",
      "no-empty": "off"
    }
  }
];
