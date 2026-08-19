import { describe, expect, it } from "vitest";

import { formatDevLogChunk, formatDevLogLine, flushPending } from "@/lib/observability/format-dev-output";

describe("formatDevLogLine", () => {
  it("formats Next.js request logs as a single colored line with a blank line after", () => {
    const formatted = formatDevLogLine(
      " GET /app/sales/customers 200 in 409ms (next.js: 3ms, proxy.ts: 7ms, application-code: 400ms)\n"
    );

    expect(formatted).toBe(
      `\u001B[36mGET   \u001B[0m \u001B[32m200\u001B[0m    409ms  /app/sales/customers\n\n`
    );
    expect(formatted).not.toContain("next.js");
    expect(formatted).not.toContain("proxy");
  });

  it("colors POST green and DELETE red", () => {
    expect(formatDevLogLine(" POST /api/me 201 in 12ms\n")).toContain(
      "\u001B[32mPOST  \u001B[0m"
    );
    expect(formatDevLogLine(" DELETE /api/documents/1 204 in 8ms\n")).toContain(
      "\u001B[31mDELETE\u001B[0m"
    );
  });

  it("drops Clerk privacy-policy noise", () => {
    expect(
      formatDevLogLine(" GET /privacy-policy 404 in 24ms (next.js: 4ms, proxy.ts: 5ms, application-code: 15ms)\n")
    ).toBe("");
  });

  it("drops Clerk development-key browser warnings", () => {
    expect(
      formatDevLogLine(
        "[browser] Clerk: Clerk has been loaded with development keys. Development instances have strict usage limits\n"
      )
    ).toBe("");
  });

  it("formats server action logs", () => {
    const formatted = formatDevLogLine(
      "  └─ ƒ createCustomerAction({\"error\":undefined}, {}) in 12ms app/app/(workspace)/sales/customers/actions.ts\n"
    );
    expect(formatted).toContain("ƒ createCustomerAction");
    expect(formatted).toContain("customers/actions.ts");
  });
});

describe("formatDevLogChunk", () => {
  it("holds a partial line until a newline arrives", () => {
    const first = formatDevLogChunk(" GET /app", "");
    expect(first.output).toBe("");
    const second = formatDevLogChunk(" 200 in 10ms\n", first.pending);
    expect(second.output).toContain("\u001B[36mGET   \u001B[0m");
    expect(second.output).toContain("/app");
    expect(second.pending).toBe("");
  });
});

describe("flushPending", () => {
  it("formats leftover buffered text on shutdown", () => {
    expect(flushPending(" GET /app/sales/customers 200 in 10ms")).toContain(
      "\u001B[36mGET   \u001B[0m",
    );
    expect(flushPending("")).toBe("");
  });
});
