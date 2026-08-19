const ANSI = /\u001B\[[0-9;]*m/g;

const REQUEST_LOG =
  /^\s*(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+(\S+)\s+(\d{3})\s+in\s+(\S+)(?:\s+\((.+)\))?\s*$/;

const SERVER_ACTION_LOG =
  /^\s*└─\s*ƒ\s+([^(]+)\((.*)\)\s+in\s+(\S+)\s+(.+)\s*$/;

const IGNORED_PATHS = [
  /^\/privacy-policy(?:\?|$)/,
  /^\/__clerk(?:\/|$)/,
  /^\/favicon\.ico(?:\?|$)/,
  /^\/icon\.svg(?:\?|$)/,
];

function stripAnsi(value: string): string {
  return value.replace(ANSI, "");
}

function shouldIgnorePath(url: string): boolean {
  const path = url.split("?")[0] ?? url;
  return IGNORED_PATHS.some((pattern) => pattern.test(path));
}

function colorStatus(status: string): string {
  const code = Number(status);
  const color =
    code < 300 ? "32" : code < 400 ? "36" : code < 500 ? "33" : "31";
  return `\u001B[${color}m${status}\u001B[0m`;
}

const METHOD_COLORS: Record<string, string> = {
  GET: "36",
  POST: "32",
  PUT: "33",
  PATCH: "35",
  DELETE: "31",
  HEAD: "90",
  OPTIONS: "90",
};

function colorMethod(method: string): string {
  const color = METHOD_COLORS[method] ?? "37";
  return `\u001B[${color}m${method.padEnd(6)}\u001B[0m`;
}

function formatRequestLog(plain: string): string | null {
  const match = REQUEST_LOG.exec(plain);
  if (!match) {
    return null;
  }

  const method = match[1]!;
  const url = match[2]!;
  const status = match[3]!;
  const total = match[4]!;

  if (shouldIgnorePath(url)) {
    return "";
  }

  return `${colorMethod(method)} ${colorStatus(status)}  ${total.padStart(7)}  ${url}\n\n`;
}

function formatServerActionLog(plain: string): string | null {
  const match = SERVER_ACTION_LOG.exec(plain);
  if (!match) {
    return null;
  }

  const name = match[1]!.trim();
  const args = match[2] ?? "";
  const duration = match[3]!;
  const location = match[4]!.trim();
  const argsDisplay = args.length > 80 ? `${args.slice(0, 77)}...` : args;

  return `       ƒ ${name}(${argsDisplay})\n         ${duration.padStart(7)}  ${location}\n`;
}

function shouldDropLine(plain: string): boolean {
  return (
    plain.startsWith("[browser] Clerk: Clerk has been loaded with development keys") ||
    plain.includes("Clerk has been loaded with development keys")
  );
}

export function formatDevLogLine(rawLine: string): string {
  const withoutNewline = rawLine.replace(/\n$/, "");
  if (withoutNewline.length === 0) {
    return "\n";
  }

  const plain = stripAnsi(withoutNewline).trimEnd();
  if (shouldDropLine(plain)) {
    return "";
  }

  const request = formatRequestLog(plain);
  if (request !== null) {
    return request;
  }

  const action = formatServerActionLog(plain);
  if (action !== null) {
    return action;
  }

  return `${withoutNewline}\n`;
}

export function formatDevLogChunk(chunk: string, pending: string): {
  output: string;
  pending: string;
} {
  const combined = pending + chunk;
  const parts = combined.split("\n");
  const nextPending = parts.pop() ?? "";
  const output = parts.map((line) => formatDevLogLine(`${line}\n`)).join("");
  return { output, pending: nextPending };
}
