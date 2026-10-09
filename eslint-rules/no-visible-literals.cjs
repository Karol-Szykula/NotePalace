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

function containsLetters(text) {
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

function isVisibleAttribute(node) {
  return (
    node.name.type === "JSXIdentifier" && visibleAttributes.has(node.name.name)
  );
}

function attributeStringOf(node) {
  const value = node.value;
  if (value === null) {
    return undefined;
  }
  if (value.type === "Literal") {
    return value.value;
  }
  if (value.type === "JSXExpressionContainer") {
    return staticStringOf(value.expression);
  }
  return undefined;
}

function isNoticeConstruction(node) {
  return (
    node.type === "NewExpression" &&
    node.callee.type === "Identifier" &&
    node.callee.name === "Notice"
  );
}

function isVisibleSetterCall(node) {
  const { callee } = node;
  return (
    callee.type === "MemberExpression" &&
    callee.property.type === "Identifier" &&
    visibleSetters.has(callee.property.name)
  );
}

function isVisibleStringCall(node) {
  return isNoticeConstruction(node) || isVisibleSetterCall(node);
}

function firstArgumentOf(node) {
  return node.arguments[0];
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
    function reportIfVisible(node, text) {
      if (text !== undefined && containsLetters(text)) {
        context.report({ node, messageId: "literal" });
      }
    }

    return {
      JSXText(node) {
        reportIfVisible(node, node.value);
      },
      JSXAttribute(node) {
        if (isVisibleAttribute(node)) {
          reportIfVisible(node, attributeStringOf(node));
        }
      },
      "NewExpression, CallExpression"(node) {
        const argument = firstArgumentOf(node);
        if (isVisibleStringCall(node) && argument !== undefined) {
          reportIfVisible(argument, staticStringOf(argument));
        }
      },
    };
  },
};

module.exports = noVisibleLiterals;
