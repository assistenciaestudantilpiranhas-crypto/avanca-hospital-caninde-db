import globals from "globals";

export default [
  {
    ignores: [
      "node_modules/**",
      "script.js",
      "api.js",
      "auth.js",
      "index.html",
      "style.css",
      "supabase/migrations/**",
    ],
  },
  {
    files: ["tests/**/*.js", "src/**/*.js", "*.config.mjs"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.vitest,
      },
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-undef": "error",
      "no-console": "off",
    },
  },
];
