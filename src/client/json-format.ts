/**
 * Tolerant JSON pretty-printing for argument previews.
 *
 * Previews are bounded head/tail slices joined by {@link ELLIPSIS_MARKER}, so
 * long payloads are not valid JSON and `JSON.parse` cannot format them. This
 * formatter walks the text once, tracks string/escape state, and breaks lines
 * on structural characters without ever requiring the input to parse. Plain
 * text without JSON structure passes through unchanged.
 *
 * @module dsh-tool-normalizer/client/json-format
 */

/** Omission marker joining the retained head and tail of a preview. */
export const ELLIPSIS_MARKER = " … ";

/**
 * Format serialized arguments for display: one structural token per line.
 * @param text - Raw preview text, valid JSON or a truncated slice of it.
 * @returns Display text with newlines and two-space indentation applied.
 */
export function prettyPrintJson(text: string): string {
  let out = "";
  let indent = 0;
  let inString = false;
  let escaped = false;
  const depth = (): string => "  ".repeat(indent);

  const peekNext = (from: number): string => {
    for (let j = from; j < text.length; j += 1) {
      const c = text[j] as string;
      if (c !== " " && c !== "\t" && c !== "\n" && c !== "\r") return c;
    }
    return "";
  };

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i] as string;
    if (inString) {
      out += ch;
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    switch (ch) {
      case '"':
        inString = true;
        out += ch;
        break;
      case "{":
      case "[": {
        // Keep empty pairs together instead of exploding them.
        const closer = ch === "{" ? "}" : "]";
        if (peekNext(i + 1) === closer) {
          out += ch + closer;
          i = text.indexOf(closer, i + 1);
        } else {
          out += ch + "\n" + "  ".repeat(indent + 1);
          indent += 1;
        }
        break;
      }
      case "}":
      case "]":
        indent = Math.max(0, indent - 1);
        out += "\n" + depth() + ch;
        break;
      case ",":
        out += ch + "\n" + depth();
        break;
      case ":":
        out += ": ";
        break;
      case " ":
      case "\t":
      case "\n":
      case "\r":
        // Collapse incidental whitespace outside strings; indentation is owned.
        if (out !== "" && !out.endsWith(" ") && !out.endsWith("\n")) out += " ";
        break;
      default:
        out += ch;
    }
  }
  return out.replace(/[ \t]+\n/g, "\n").trim();
}
