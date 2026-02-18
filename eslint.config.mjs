import eslintConfigPrettier from "eslint-config-prettier";
import eslintPluginImport from "eslint-plugin-import";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["node_modules/", "cdk.out/", "**/*.js", "**/*.mjs"],
  },
  ...tseslint.configs.recommended,
  eslintConfigPrettier,
  {
    plugins: {
      import: eslintPluginImport,
    },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "import/order": [
        "warn",
        {
          alphabetize: { order: "asc", caseInsensitive: true },
          "newlines-between": "always",
        },
      ],
      "import/no-duplicates": "warn",
    },
  },
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
);
