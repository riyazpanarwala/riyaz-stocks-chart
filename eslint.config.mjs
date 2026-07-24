import nextPlugin from "@next/eslint-plugin-next";

export default [
  {
    files: ["**/*.js", "**/*.jsx", "**/*.mjs"],
    plugins: {
      "@next/next": nextPlugin,
      "react-hooks": {
        rules: {
          "exhaustive-deps": { meta: { type: "suggestion" }, create: () => ({}) },
          "rules-of-hooks": { meta: { type: "problem" }, create: () => ({}) },
        },
      },
    },
    languageOptions: {
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
    },
  },
  {
    ignores: [".next/**", "node_modules/**"],
  },
];
