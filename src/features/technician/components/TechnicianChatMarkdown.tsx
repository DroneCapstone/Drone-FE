import { type ReactNode } from "react";

/**
 * A small, dependency-free Markdown renderer for chat replies.
 * It renders plain React elements (never HTML injection). Supported: headings,
 * strong/emphasis, inline code, links, fenced code, bullets, numbered lists,
 * quotes, horizontal rules, and simple GFM tables.
 */

const inlinePattern = /(\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|\*\*([^*\n]+)\*\*|__([^_\n]+)__|`([^`\n]+)`|\*([^*\n]+)\*|_([^_\n]+)_)/g;

function inlineMarkdown(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const matcher = new RegExp(inlinePattern.source, "g");
  let previous = 0;
  let match: RegExpExecArray | null;

  while ((match = matcher.exec(text)) !== null) {
    if (match.index > previous) nodes.push(text.slice(previous, match.index));
    const key = `inline-${match.index}`;
    if (match[2] && match[3]) {
      nodes.push(
        <a key={key} href={match[3]} target="_blank" rel="noopener noreferrer"
          className="font-medium text-orange-500 underline underline-offset-2 hover:text-orange-600">
          {match[2]}
        </a>,
      );
    } else if (match[4] || match[5]) {
      nodes.push(<strong key={key} className="font-semibold text-[var(--tech-text)]">{inlineMarkdown(match[4] || match[5])}</strong>);
    } else if (match[6]) {
      nodes.push(<code key={key} className="rounded bg-black/5 px-1 py-0.5 font-mono text-[0.9em] dark:bg-white/10">{match[6]}</code>);
    } else if (match[7] || match[8]) {
      nodes.push(<em key={key}>{inlineMarkdown(match[7] || match[8])}</em>);
    }
    previous = matcher.lastIndex;
  }
  if (previous < text.length) nodes.push(text.slice(previous));
  return nodes;
}

const headingPattern = /^\s{0,3}(#{1,6})\s+(.+)$/;
const bulletPattern = /^\s*[-*+]\s+(.+)$/;
const numberedPattern = /^\s*\d+[.)]\s+(.+)$/;
const quotePattern = /^\s*>\s?(.*)$/;
const separatorPattern = /^\s*(?:---+|___+|\*\*\*+)\s*$/;
const fencePattern = /^\s*```/;
const tableDelimiter = /^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/;

function tableCells(line: string): string[] {
  return line.replace(/^\s*\|/, "").replace(/\|\s*$/, "").split("|").map((item) => item.trim());
}

function isSpecialLine(line: string): boolean {
  return headingPattern.test(line) || bulletPattern.test(line) || numberedPattern.test(line)
    || quotePattern.test(line) || fencePattern.test(line) || separatorPattern.test(line);
}

function renderMarkdownBlocks(markdown: string): ReactNode[] {
  const lines = markdown.replace(/\r\n?/g, "\n").trim().split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i += 1; continue; }

    if (fencePattern.test(line)) {
      const language = line.trim().slice(3).trim();
      const code: string[] = [];
      i += 1;
      while (i < lines.length && !fencePattern.test(lines[i])) { code.push(lines[i]); i += 1; }
      if (i < lines.length) i += 1;
      blocks.push(
        <pre key={key++} className="overflow-x-auto rounded-xl bg-black/5 p-3 text-[12px] leading-5 dark:bg-white/10">
          <code data-language={language || undefined}>{code.join("\n")}</code>
        </pre>,
      );
      continue;
    }

    const heading = line.match(headingPattern);
    if (heading) {
      const level = heading[1].length;
      const style = level <= 2 ? "text-[15px] font-bold" : "text-[14px] font-semibold";
      blocks.push(<h3 key={key++} className={`mt-3 first:mt-0 leading-6 text-[var(--tech-text)] ${style}`}>
        {inlineMarkdown(heading[2])}
      </h3>);
      i += 1;
      continue;
    }

    if (separatorPattern.test(line)) {
      blocks.push(<hr key={key++} className="my-3 border-[var(--tech-border)]" />);
      i += 1;
      continue;
    }

    if (line.includes("|") && i + 1 < lines.length && tableDelimiter.test(lines[i + 1])) {
      const headers = tableCells(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim() && lines[i].includes("|")) {
        rows.push(tableCells(lines[i])); i += 1;
      }
      blocks.push(
        <div key={key++} className="max-w-full overflow-x-auto rounded-lg border border-[var(--tech-border)]">
          <table className="w-full min-w-[280px] border-collapse text-left text-[12px]">
            <thead className="bg-black/5 dark:bg-white/5"><tr>
              {headers.map((header, index) => <th key={index} className="border-b border-[var(--tech-border)] px-2 py-2 font-semibold">{inlineMarkdown(header)}</th>)}
            </tr></thead>
            <tbody>{rows.map((row, rowIndex) => <tr key={rowIndex} className="border-b border-[var(--tech-border)] last:border-b-0">
              {headers.map((_, cellIndex) => <td key={cellIndex} className="px-2 py-2 align-top">{inlineMarkdown(row[cellIndex] || "")}</td>)}
            </tr>)}</tbody>
          </table>
        </div>,
      );
      continue;
    }

    const listType = bulletPattern.test(line) ? "bullet" : numberedPattern.test(line) ? "ordered" : null;
    if (listType) {
      const listEntries: string[] = [];
      const pattern = listType === "bullet" ? bulletPattern : numberedPattern;
      while (i < lines.length) {
        const matched = lines[i].match(pattern);
        if (!matched) break;
        let itemText = matched[1];
        i += 1;
        // Wrap continuation lines into the preceding item, never into another list item.
        while (i < lines.length && /^\s{2,}\S/.test(lines[i]) && !bulletPattern.test(lines[i]) && !numberedPattern.test(lines[i])) {
          itemText += ` ${lines[i].trim()}`;
          i += 1;
        }
        listEntries.push(itemText);
      }
      const children = listEntries.map((item, index) => <li key={index} className="pl-0.5">{inlineMarkdown(item)}</li>);
      blocks.push(listType === "bullet"
        ? <ul key={key++} className="list-disc space-y-1 pl-5 marker:text-orange-500">{children}</ul>
        : <ol key={key++} className="list-decimal space-y-1 pl-5 marker:text-orange-500">{children}</ol>);
      continue;
    }

    if (quotePattern.test(line)) {
      const quotes: string[] = [];
      while (i < lines.length && quotePattern.test(lines[i])) {
        quotes.push(lines[i].replace(quotePattern, "$1")); i += 1;
      }
      blocks.push(<blockquote key={key++} className="border-l-2 border-orange-400 pl-3 italic">
        {inlineMarkdown(quotes.join(" "))}
      </blockquote>);
      continue;
    }

    const paragraph: string[] = [];
    while (i < lines.length && lines[i].trim() && !isSpecialLine(lines[i]) &&
      !(lines[i].includes("|") && i + 1 < lines.length && tableDelimiter.test(lines[i + 1]))) {
      paragraph.push(lines[i].trim()); i += 1;
    }
    // A normal Markdown soft line break is rendered as a space.
    blocks.push(<p key={key++} className="leading-[1.7]">{inlineMarkdown(paragraph.join(" "))}</p>);
  }
  return blocks;
}

export function TechnicianChatMarkdown({ text }: { text: string }) {
  return <div className="min-w-0 space-y-2 break-words">{renderMarkdownBlocks(text)}</div>;
}
