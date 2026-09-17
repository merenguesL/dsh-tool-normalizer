/**
 * Stylesheet validation for the client bundle's CSS-module processor.
 *
 * The browser discards CSS silently: one unterminated declaration swallows
 * every following rule until the next `}`, and an unbalanced brace drops the
 * remainder of the file. v0.5.1 shipped a `.ruleTag` block ending in a bare
 * `font-weight`, which removed the guidance editor's rules from the dashboard
 * with no build error and no runtime warning. This guard turns that silent
 * corruption into a failed build.
 *
 * @module dsh-tool-normalizer/build/css-guard
 */

/** Strip comments while preserving newlines so reported lines stay accurate. */
function withoutComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, (comment) =>
    comment.replace(/[^\n]/g, " "),
  );
}

/**
 * Validate one stylesheet for the two defects the browser swallows silently.
 * @param css - Raw stylesheet text.
 * @param filename - Name used in the thrown message.
 * @returns Nothing; throws when the stylesheet cannot parse as intended.
 */
export function validateCssModule(css, filename) {
  const stripped = withoutComments(css);
  const problems = [];
  const lineAt = (index) => stripped.slice(0, index).split("\n").length;

  // Walk blocks with a stack. A plain rule may only open at the top level; an
  // at-rule (@media/@supports) may wrap plain rules. A rule opening inside a
  // rule is the signature of a missing `}`, which is what drops the rest of a
  // stylesheet.
  const stack = [];
  let prelude = "";
  for (let i = 0; i < stripped.length; i += 1) {
    const ch = stripped[i];
    if (ch === ";") {
      prelude = "";
    } else if (ch === "{") {
      const selector = prelude.trim();
      const isAtRule = selector.startsWith("@");
      const parent = stack[stack.length - 1];
      if (parent !== undefined && !parent.isAtRule) {
        problems.push(
          `line ${lineAt(i)}: block ${JSON.stringify(selector)} opens inside a ` +
            "declaration block; the previous rule is probably missing a }",
        );
      }
      stack.push({ isAtRule, line: lineAt(i) });
      prelude = "";
    } else if (ch === "}") {
      if (stack.length === 0) {
        problems.push(`line ${lineAt(i)}: stray closing brace`);
      } else {
        stack.pop();
      }
      prelude = "";
    } else {
      prelude += ch;
    }
  }
  for (const open of stack) {
    problems.push(`line ${open.line}: unclosed block (missing })`);
  }

  // A bare `property` line with no `:`, `;`, `{` or `}` means the declaration
  // was never terminated, which is what made the browser drop later rules.
  const lines = stripped.split("\n");
  for (let i = 0; i < lines.length; i += 1) {
    const text = lines[i].trim();
    if (text !== "" && /^[a-zA-Z-]+$/.test(text)) {
      problems.push(
        `line ${i + 1}: unterminated declaration ${JSON.stringify(text)} ` +
          "(missing value, semicolon and closing brace)",
      );
    }
  }

  if (problems.length > 0) {
    throw new Error(
      `${filename} would be silently dropped by the browser:\n  - ${problems.join("\n  - ")}`,
    );
  }
}
