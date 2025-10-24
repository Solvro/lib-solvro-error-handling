import { solvro } from "@solvro/config/eslint";

export default solvro({
  rules: {
    "@typescript-eslint/restrict-template-expressions": [
      "error",
      {
        allowBoolean: true,
        allowNullish: true,
        allowNumber: true,
      },
    ],
    "@typescript-eslint/no-dynamic-delete": "off",
    "unicorn/no-negated-condition": "off",
  },
  languageOptions: {
    parserOptions: {
      projectService: {
        allowDefaultProject: ["eslint.config.js"],
      },
    },
  },
});
