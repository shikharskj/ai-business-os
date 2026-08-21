"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type Block =
  | { type: "paragraph"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] };

/**
 * Parses a light markdown subset into blocks. Escapes are not supported;
 * this is display-only for assistant prose (never trusted HTML).
 */
export function parseAssistantProse(raw: string): Block[] {
  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let list: { kind: "ul" | "ol"; items: string[] } | null = null;

  function flushParagraph() {
    if (paragraph.length === 0) return;
    const text = paragraph.join(" ").trim();
    if (text) blocks.push({ type: "paragraph", text });
    paragraph = [];
  }

  function flushList() {
    if (!list || list.items.length === 0) {
      list = null;
      return;
    }
    blocks.push({ type: list.kind, items: list.items });
    list = null;
  }

  for (const line of lines) {
    const unordered = line.match(/^\s*[-*]\s+(.+)$/);
    const ordered = line.match(/^\s*\d+[.)]\s+(.+)$/);

    if (unordered) {
      flushParagraph();
      if (!list || list.kind !== "ul") {
        flushList();
        list = { kind: "ul", items: [] };
      }
      list.items.push(unordered[1]!.trim());
      continue;
    }

    if (ordered) {
      flushParagraph();
      if (!list || list.kind !== "ol") {
        flushList();
        list = { kind: "ol", items: [] };
      }
      list.items.push(ordered[1]!.trim());
      continue;
    }

    if (line.trim() === "") {
      flushParagraph();
      flushList();
      continue;
    }

    flushList();
    paragraph.push(line.trim());
  }

  flushParagraph();
  flushList();
  return blocks;
}

function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  // **bold** then *italic* — non-greedy, no nesting
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) {
      nodes.push(text.slice(last, match.index));
    }
    const token = match[0]!;
    if (token.startsWith("**") && token.endsWith("**")) {
      nodes.push(
        <strong key={key++} className="font-semibold text-foreground">
          {token.slice(2, -2)}
        </strong>,
      );
    } else {
      nodes.push(
        <em key={key++} className="italic">
          {token.slice(1, -1)}
        </em>,
      );
    }
    last = match.index + token.length;
  }

  if (last < text.length) {
    nodes.push(text.slice(last));
  }

  return nodes;
}

/**
 * Renders assistant analysis text: first block as bold lead, then
 * paragraphs / lists with a safe markdown subset (no raw * ** left visible).
 */
export function AssistantProse({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const blocks = parseAssistantProse(text);
  if (blocks.length === 0) return null;

  const [lead, ...rest] = blocks;

  return (
    <div className={cn("flex flex-col gap-2 text-base leading-relaxed", className)}>
      {lead ? <LeadBlock block={lead} /> : null}
      {rest.map((block, index) => (
        <BodyBlock key={index} block={block} />
      ))}
    </div>
  );
}

function LeadBlock({ block }: { block: Block }) {
  if (block.type === "paragraph") {
    return (
      <p className="font-semibold text-foreground">
        {renderInline(block.text)}
      </p>
    );
  }

  // If the model leads with a list, still emphasize the first item.
  const Tag = block.type === "ul" ? "ul" : "ol";
  return (
    <Tag
      className={cn(
        "flex flex-col gap-1 pl-4 text-foreground",
        block.type === "ul" ? "list-disc" : "list-decimal",
      )}
    >
      {block.items.map((item, index) => (
        <li
          key={index}
          className={index === 0 ? "font-semibold" : "font-normal"}
        >
          {renderInline(item)}
        </li>
      ))}
    </Tag>
  );
}

function BodyBlock({ block }: { block: Block }) {
  if (block.type === "paragraph") {
    return (
      <p className="font-normal text-foreground">{renderInline(block.text)}</p>
    );
  }

  const Tag = block.type === "ul" ? "ul" : "ol";
  return (
    <Tag
      className={cn(
        "flex flex-col gap-1 pl-4 font-normal text-foreground",
        block.type === "ul" ? "list-disc" : "list-decimal",
      )}
    >
      {block.items.map((item, index) => (
        <li key={index}>{renderInline(item)}</li>
      ))}
    </Tag>
  );
}
