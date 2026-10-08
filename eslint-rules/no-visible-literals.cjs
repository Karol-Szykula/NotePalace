const visibleAttributes = new Set([
  "alt",
  "aria-label",
  "placeholder",
  "title",
]);

const visibleSetters = new Set([
  "setButtonText",
  "setDesc",
  "setName",
  "setPlaceholder",
  "setText",
  "setTitle",
]);

function hasLetters(text) {
  return /\p{L}/u.test(text);
}

function staticStringOf(node) {
  if (node.type === "Literal" && typeof node.value === "string") {
    return node.value;
  }
  if (node.type === "TemplateLiteral" && node.expressions.length === 0) {
    return node.quasis.map((quasi) => quasi.value.cooked ?? "").join("");
  }
  return undefined;
}

const noVisibleLiterals = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Require user-visible text to come from the i18n catalog via t().",
    },
    messages: {
      literal: "User-visible text must come from the i18n catalog via t(key).",
    },
    schema: [],
  },
  create(context) {
    function report(node) {
      context.report({ node, messageId: "literal" });
    }

    function reportIfVisible(node, text) {
      if (text !== undefined && hasLetters(text)) {
        report(node);
      }
    }

    return {
      JSXText(node) {
        if (hasLetters(node.value)) {
          report(node);
        }
      },
      JSXAttribute(node) {
        if (node.name.type !== "JSXIdentifier") {
          return;
        }
        if (!visibleAttributes.has(node.name.name)) {
          return;
        }
        const value = node.value;
        if (value === null) {
          return;
        }
        if (value.type === "Literal") {
          reportIfVisible(value, value.value);
          return;
        }
        if (value.type === "JSXExpressionContainer") {
          reportIfVisible(value.expression, staticStringOf(value.expression));
        }
      },
      "NewExpression, CallExpression"(node) {
        const firstArgument = node.arguments[0];
        if (firstArgument === undefined) {
          return;
        }
        const text = staticStringOf(firstArgument);
        if (text === undefined) {
          return;
        }
        const { callee } = node;
        const isNotice =
          node.type === "NewExpression" &&
          callee.type === "Identifier" &&
          callee.name === "Notice";
        const isSetter =
          callee.type === "MemberExpression" &&
          callee.property.type === "Identifier" &&
          visibleSetters.has(callee.property.name);
        if (isNotice || isSetter) {
          reportIfVisible(firstArgument, text);
        }
      },
    };
  },
};

module.exports = noVisibleLiterals;
