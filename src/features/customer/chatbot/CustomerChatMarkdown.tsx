import type { ReactNode } from "react";

/**
 * Renders a safe, lightweight subset of Markdown commonly returned by
 * the DroneOptAI Customer AI. No third-party package or HTML injection.
 *
 * Supported: **bold**, *italic*, `code`, HTTPS/HTTP links,
 * headings, bullet/numbered lists, paragraphs, and line breaks.
 */

type Block =
  | { kind: "paragraph"; lines: string[] }
  | { kind: "heading"; text: string }
  | { kind: "bullets"; items: string[] }
  | { kind: "numbers"; items: string[] }
  | { kind: "quote"; lines: string[] }
  | { kind: "rule" };

const HEADING_RE = /^\s{0,3}#{1,6}\s+(.+?)\s*$/;
const BULLET_RE = /^\s{0,3}[-*•]\s+(.+)$/;
const NUMBER_RE = /^\s{0,3}\d+[.)]\s+(.+)$/;
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
      while (index < lines.length) {
        const match = lines[index].match(matcher);
        if (!match) break;
        items.push(match[1]);
        index += 1;
      }
      result.push({ kind: listType, items });
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
              <ol key={key} className="list-decimal space-y-1 pl-4 leading-5 marker:text-orange-400">
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
