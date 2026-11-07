import type { ReactNode } from "react";

/**
 * Renders a safe, lightweight subset of Markdown commonly returned by
 * the DroneOptAI Customer AI. No third-party package or HTML injection.
 *
 * Supported: **bold**, *italic*, `code`, HTTPS/HTTP links,
 * headings, bullet/numbered lists, paragraphs, and line breaks.
 * Also formats common AI LaTeX inline math ($...$, \( ... \)) as readable text.
 */

type Block =
  | { kind: "paragraph"; lines: string[] }
  | { kind: "heading"; text: string }
  | { kind: "bullets"; items: string[] }
  | { kind: "numbers"; items: string[]; start: number }
  | { kind: "quote"; lines: string[] }
  | { kind: "rule" };

const HEADING_RE = /^\s{0,3}#{1,6}\s+(.+?)\s*$/;
const BULLET_RE = /^\s{0,3}[-*•]\s+(.+)$/;
const NUMBER_RE = /^\s{0,3}(\d+)[.)]\s+(.+)$/;
const QUOTE_RE = /^\s{0,3}>\s?(.*)$/;
const RULE_RE = /^\s{0,3}(?:-{3,}|\*{3,}|_{3,})\s*$/;

function isBlockStart(line: string) {
  return (
    HEADING_RE.test(line) ||
    BULLET_RE.test(line) ||
    NUMBER_RE.test(line) ||
    QUOTE_RE.test(line) ||
    RULE_RE.test(line)
  );
}

function parseBlocks(content: string): Block[] {
  const lines = content.replace(/\r\n?/g, "\n").split("\n");
  const result: Block[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      index += 1;
      continue;
    }

    const heading = line.match(HEADING_RE);
    if (heading) {
      result.push({ kind: "heading", text: heading[1] });
      index += 1;
      continue;
    }

    if (RULE_RE.test(line)) {
      result.push({ kind: "rule" });
      index += 1;
      continue;
    }

    const listType = BULLET_RE.test(line)
      ? "bullets"
      : NUMBER_RE.test(line)
        ? "numbers"
        : null;
    if (listType) {
      const matcher = listType === "bullets" ? BULLET_RE : NUMBER_RE;
      const items: string[] = [];
      const start = listType === "numbers"
        ? Number(lines[index].match(NUMBER_RE)?.[1] ?? 1)
        : 1;
      while (index < lines.length) {
        const match = lines[index].match(matcher);
        if (!match) break;
        items.push(listType === "numbers" ? match[2] : match[1]);
        index += 1;
      }
      if (listType === "numbers") {
        result.push({ kind: "numbers", items, start });
      } else {
        result.push({ kind: "bullets", items });
      }
      continue;
    }

    if (QUOTE_RE.test(line)) {
      const quotedLines: string[] = [];
      while (index < lines.length) {
        const match = lines[index].match(QUOTE_RE);
        if (!match) break;
        quotedLines.push(match[1]);
        index += 1;
      }
      result.push({ kind: "quote", lines: quotedLines });
      continue;
    }

    const paragraphLines: string[] = [];
    while (
      index < lines.length &&
      lines[index].trim() &&
      !isBlockStart(lines[index])
    ) {
      paragraphLines.push(lines[index]);
      index += 1;
    }
    result.push({ kind: "paragraph", lines: paragraphLines });
  }

  return result;
}


/**
 * The Customer AI sometimes returns Markdown together with inline LaTeX:
 *   $\\le 3\\text{ kg}$, $20 \\times 20 \\times 15\\text{ cm}$.
 * We want a readable result without introducing a math rendering dependency.
 * The contents stay ordinary React text; no HTML or arbitrary evaluation.
 */
function readableInlineMath(expression: string): string {
  let result = expression.trim();

  // Simple textual groups commonly used for units (kg, cm, etc.).
  result = result.replace(/\\(?:text|mathrm|operatorname)\s*\{([^{}]*)\}/g, "$1");

  // Common fractions. Do this after textual groups for predictable output.
  result = result.replace(/\\(?:dfrac|tfrac|frac)\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, "($1)/($2)");

  const symbols: Record<string, string> = {
    le: "≤", leq: "≤", leqslant: "≤",
    ge: "≥", geq: "≥", geqslant: "≥",
    times: "×", cdot: "·", pm: "±",
    neq: "≠", ne: "≠", approx: "≈",
    to: "→", rightarrow: "→",
    degree: "°", circ: "°", percent: "%",
    infty: "∞",
  };
  result = result.replace(/\\([a-zA-Z]+)\b/g, (original, command: string) => {
    return symbols[command] ?? original;
  });

  // Preserve simple powers and subscripts in a compact, readable form.
  result = result.replace(/\^\{([^{}]+)\}/g, "^$1");
  result = result.replace(/_\{([^{}]+)\}/g, "_$1");
  result = result.replace(/\\[,;!: ]/g, " ");
  result = result.replace(/\\%/g, "%");
  result = result.replace(/\s+/g, " ").trim();
  return result;
}

function inlineMathAt(source: string, offset: number): {
  length: number;
  text: string;
} | null {
  const isDollar = source[offset] === "$" && source[offset + 1] !== "$";
  const isParenthesis = source.startsWith("\\(", offset);
  if (!isDollar && !isParenthesis) return null;

  const openingLength = isDollar ? 1 : 2;
  const ending = isDollar
    ? source.indexOf("$", offset + openingLength)
    : source.indexOf("\\)", offset + openingLength);
  if (ending < offset + openingLength + 1) return null;

  const expression = source.slice(offset + openingLength, ending);
  // An ordinary price such as "$100 and $200" must not be treated as math.
  if (isDollar && !/\\[a-zA-Z]+|[=<>^_×≤≥]/.test(expression)) {
    return null;
  }

  return {
    length: ending - offset + (isDollar ? 1 : 2),
    text: readableInlineMath(expression),
  };
}

function renderInline(source: string, prefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let buffer = "";
  let index = 0;
  let tokenNumber = 0;

  function flushText() {
    if (buffer) {
      nodes.push(buffer);
      buffer = "";
    }
  }

  while (index < source.length) {
    const character = source[index];

    // Convert AI-generated LaTeX into readable units/math symbols.
    const math = inlineMathAt(source, index);
    if (math) {
      flushText();
      nodes.push(
        <span key={`${prefix}-math-${tokenNumber++}`} className="whitespace-normal font-medium text-white/90">
          {math.text}
        </span>,
      );
      index += math.length;
      continue;
    }

    // Markdown escape, e.g. \\* should display a literal *.
    if (
      character === "\\" &&
      index + 1 < source.length &&
      /[\\*_`\[\]()#]/.test(source[index + 1])
    ) {
      buffer += source[index + 1];
      index += 2;
      continue;
    }

    // Links are allowed only with explicit http(s) destinations.
    if (character === "[") {
      const link = source.slice(index).match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/i);
      if (link) {
        flushText();
        nodes.push(
          <a
            key={`${prefix}-link-${tokenNumber++}`}
            href={link[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="break-all font-medium text-orange-300 underline decoration-orange-300/50 underline-offset-2 hover:text-orange-200"
          >
            {link[1]}
          </a>,
        );
        index += link[0].length;
        continue;
      }
    }

    if (character === "`") {
      const closeIndex = source.indexOf("`", index + 1);
      if (closeIndex > index + 1) {
        flushText();
        nodes.push(
          <code
            key={`${prefix}-code-${tokenNumber++}`}
            className="rounded bg-white/10 px-1 py-0.5 font-mono text-[0.94em] text-orange-200"
          >
            {source.slice(index + 1, closeIndex)}
          </code>,
        );
        index = closeIndex + 1;
        continue;
      }
    }

    const markers: Array<{ delimiter: string; kind: "bold" | "italic" }> = [
      { delimiter: "**", kind: "bold" },
      { delimiter: "__", kind: "bold" },
      { delimiter: "*", kind: "italic" },
      { delimiter: "_", kind: "italic" },
    ];
    let matched = false;

    for (const { delimiter, kind } of markers) {
      if (!source.startsWith(delimiter, index)) continue;
      const ending = source.indexOf(delimiter, index + delimiter.length);
      if (ending <= index + delimiter.length) continue;

      const inner = source.slice(index + delimiter.length, ending);
      flushText();
      const key = `${prefix}-${kind}-${tokenNumber++}`;
      nodes.push(
        kind === "bold" ? (
          <strong key={key} className="font-bold text-white">
            {renderInline(inner, key)}
          </strong>
        ) : (
          <em key={key} className="italic text-white/90">
            {renderInline(inner, key)}
          </em>
        ),
      );
      index = ending + delimiter.length;
      matched = true;
      break;
    }

    if (matched) continue;
    buffer += character;
    index += 1;
  }

  flushText();
  return nodes;
}

function renderLines(lines: string[], prefix: string) {
  return lines.map((line, index) => (
    <span key={`${prefix}-line-${index}`}>
      {index > 0 && <br />}
      {renderInline(line, `${prefix}-${index}`)}
    </span>
  ));
}

export type CustomerChatMarkdownProps = {
  content: string;
  className?: string;
};

export function CustomerChatMarkdown({
  content,
  className = "",
}: CustomerChatMarkdownProps) {
  const blocks = parseBlocks(content || "");

  return (
    <div className={`min-w-0 max-w-full space-y-2 break-words text-white/85 ${className}`}>
      {blocks.map((block, index) => {
        const key = `chat-md-${index}`;

        switch (block.kind) {
          case "heading":
            return (
              <p key={key} className="font-bold leading-5 text-white">
                {renderInline(block.text, key)}
              </p>
            );
          case "bullets":
            return (
              <ul key={key} className="list-disc space-y-1 pl-4 leading-5 marker:text-orange-400">
                {block.items.map((item, itemIndex) => (
                  <li key={`${key}-${itemIndex}`}>{renderInline(item, `${key}-${itemIndex}`)}</li>
                ))}
              </ul>
            );
          case "numbers":
            return (
              <ol key={key} start={block.start} className="list-decimal space-y-1 pl-4 leading-5 marker:text-orange-400">
                {block.items.map((item, itemIndex) => (
                  <li key={`${key}-${itemIndex}`}>{renderInline(item, `${key}-${itemIndex}`)}</li>
                ))}
              </ol>
            );
          case "quote":
            return (
              <blockquote key={key} className="border-l-2 border-orange-400/60 pl-3 text-white/75">
                {renderLines(block.lines, key)}
              </blockquote>
            );
          case "rule":
            return <hr key={key} className="border-white/10" />;
          case "paragraph":
            return <p key={key} className="m-0 leading-5">{renderLines(block.lines, key)}</p>;
        }
      })}
    </div>
  );
}
