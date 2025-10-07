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
    "unicorn/no-negated-condition": "off",
  },
});
