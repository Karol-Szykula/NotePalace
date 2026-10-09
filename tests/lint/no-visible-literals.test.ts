import { RuleTester, type Rule } from "eslint";
import tsParser from "@typescript-eslint/parser";
import noVisibleLiterals from "../../eslint-rules/no-visible-literals.cjs";

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    parser: tsParser,
    parserOptions: { ecmaFeatures: { jsx: true } },
    sourceType: "module",
  },
});

ruleTester.run(
  "no-visible-literals",
  noVisibleLiterals as unknown as Rule.RuleModule,
  {
    invalid: [
      {
        code: "<p>Hello</p>",
        errors: [{ messageId: "literal" }],
      },
      {
        code: '<input title="Hello" />',
        errors: [{ messageId: "literal" }],
      },
      {
        code: 'new Notice("Hello", 1000)',
        errors: [{ messageId: "literal" }],
      },
      {
        code: 'setting.setName("Hello")',
        errors: [{ messageId: "literal" }],
      },
    ],
    valid: [
      { code: '<p>{t("key")}</p>' },
      { code: '<p>{" "}</p>' },
      { code: "<p>✓ ─ / →</p>" },
      { code: 'new Notice(t("key"), 1000)' },
      { code: 'setting.setName(t("key"))' },
      { code: 'statusBar.setText("")' },
      { code: "<input title={tooltip} />" },
      { code: '<input name="deck-selection" />' },
    ],
  },
);
