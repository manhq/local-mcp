// Converts lightweight Markdown into Atlassian Document Format (ADF), the JSON
// body Jira's REST v3 API requires. Plain text alone renders unformatted, so this
// parses the common inline marks, block elements, and [~accountid:...] mention
// tokens agents produce.
//
// Supported syntax:
//   **bold**   *italic*   ++underline++   ~~strike~~   `code`
//   [text](url)                    -> link
//   [~accountid:ACCOUNT_ID]        -> user mention (notifies the user)
//   # .. ###### heading            bullet list (- / *)   ordered list (1.)
//   > blockquote                   ``` fenced code block ```

export type AdfNode = Record<string, unknown>;
type Mark = { type: string; attrs?: Record<string, unknown> };

function textNode(text: string, marks: Mark[]): AdfNode {
  return marks.length ? { type: "text", text, marks } : { type: "text", text };
}

function pushText(nodes: AdfNode[], text: string, marks: Mark[]): void {
  if (text) nodes.push(textNode(text, marks));
}

interface InlineRule {
  re: RegExp;
  // `render` receives the currently-active marks and returns the ADF node(s)
  // for the matched span. Recurse via parseInline so marks nest correctly.
  render(match: RegExpExecArray, marks: Mark[]): AdfNode[];
}

// Ordered by priority: on a tie at the same index, the earlier rule wins, so
// `**` (bold) is matched before `*` (italic) and code before everything.
const INLINE_RULES: InlineRule[] = [
  { re: /`([^`\n]+)`/g, render: (m, marks) => [textNode(m[1], [...marks, { type: "code" }])] },
  { re: /\*\*\*([\s\S]+?)\*\*\*/g, render: (m, marks) => parseInline(m[1], [...marks, { type: "strong" }, { type: "em" }]) },
  { re: /\*\*([\s\S]+?)\*\*/g, render: (m, marks) => parseInline(m[1], [...marks, { type: "strong" }]) },
  { re: /\+\+([\s\S]+?)\+\+/g, render: (m, marks) => parseInline(m[1], [...marks, { type: "underline" }]) },
  { re: /~~([\s\S]+?)~~/g, render: (m, marks) => parseInline(m[1], [...marks, { type: "strike" }]) },
  { re: /\[~accountid:([^\]]+)\]/g, render: (m) => [{ type: "mention", attrs: { id: m[1] } }] },
  { re: /\[([^\]\n]+)\]\(([^)\s]+)\)/g, render: (m, marks) => parseInline(m[1], [...marks, { type: "link", attrs: { href: m[2] } }]) },
  { re: /\*([\s\S]+?)\*/g, render: (m, marks) => parseInline(m[1], [...marks, { type: "em" }]) },
];

function parseInline(text: string, marks: Mark[] = []): AdfNode[] {
  const nodes: AdfNode[] = [];
  let pos = 0;
  while (pos < text.length) {
    let best: { index: number; rule: InlineRule; match: RegExpExecArray } | null = null;
    for (const rule of INLINE_RULES) {
      rule.re.lastIndex = pos;
      const match = rule.re.exec(text);
      if (match && (best === null || match.index < best.index)) {
        best = { index: match.index, rule, match };
        if (match.index === pos) break; // nothing can start earlier; highest-priority tie wins
      }
    }
    if (!best) {
      pushText(nodes, text.slice(pos), marks);
      break;
    }
    pushText(nodes, text.slice(pos, best.index), marks);
    nodes.push(...best.rule.render(best.match, marks));
    pos = best.index + best.match[0].length;
  }
  return nodes;
}

// Join wrapped lines within a single paragraph using ADF hardBreak nodes.
function parseParagraph(lines: string[]): AdfNode[] {
  const out: AdfNode[] = [];
  lines.forEach((line, idx) => {
    if (idx > 0) out.push({ type: "hardBreak" });
    out.push(...parseInline(line));
  });
  return out;
}

const FENCE = /^```(\w+)?\s*$/;
const HEADING = /^(#{1,6})\s+(.*)$/;
const QUOTE = /^>\s?/;
const BULLET = /^[-*]\s+/;
const ORDERED = /^\d+\.\s+/;

function isBlockStart(trimmed: string): boolean {
  return (
    trimmed === "" ||
    FENCE.test(trimmed) ||
    HEADING.test(trimmed) ||
    QUOTE.test(trimmed) ||
    BULLET.test(trimmed) ||
    ORDERED.test(trimmed)
  );
}

function listItems(lines: string[], start: number, marker: RegExp): { items: AdfNode[]; next: number } {
  const items: AdfNode[] = [];
  let i = start;
  while (i < lines.length && marker.test(lines[i].trim())) {
    const content = lines[i].trim().replace(marker, "");
    items.push({ type: "listItem", content: [{ type: "paragraph", content: parseInline(content) }] });
    i++;
  }
  return { items, next: i };
}

export function textToAdf(text: string): AdfNode {
  const lines = text.split("\n");
  const blocks: AdfNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    const fence = trimmed.match(FENCE);
    if (fence) {
      const code: string[] = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i].trim())) { code.push(lines[i]); i++; }
      i++; // skip closing fence
      blocks.push({
        type: "codeBlock",
        ...(fence[1] ? { attrs: { language: fence[1] } } : {}),
        content: code.length ? [{ type: "text", text: code.join("\n") }] : [],
      });
      continue;
    }

    if (trimmed === "") { i++; continue; }

    const heading = trimmed.match(HEADING);
    if (heading) {
      blocks.push({ type: "heading", attrs: { level: heading[1].length }, content: parseInline(heading[2]) });
      i++;
      continue;
    }

    if (QUOTE.test(trimmed)) {
      const quote: string[] = [];
      while (i < lines.length && QUOTE.test(lines[i].trim())) { quote.push(lines[i].trim().replace(QUOTE, "")); i++; }
      blocks.push({ type: "blockquote", content: [{ type: "paragraph", content: parseParagraph(quote) }] });
      continue;
    }

    if (BULLET.test(trimmed)) {
      const { items, next } = listItems(lines, i, BULLET);
      blocks.push({ type: "bulletList", content: items });
      i = next;
      continue;
    }

    if (ORDERED.test(trimmed)) {
      const { items, next } = listItems(lines, i, ORDERED);
      blocks.push({ type: "orderedList", content: items });
      i = next;
      continue;
    }

    const para: string[] = [];
    while (i < lines.length && !isBlockStart(lines[i].trim())) { para.push(lines[i]); i++; }
    blocks.push({ type: "paragraph", content: parseParagraph(para) });
  }

  if (blocks.length === 0) blocks.push({ type: "paragraph", content: [] });
  return { type: "doc", version: 1, content: blocks };
}
