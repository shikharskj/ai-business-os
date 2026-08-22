import { describe, expect, it } from "vitest";

import { auditActionLabel } from "@/components/business/entity-activity-panel";

describe("auditActionLabel", () => {
  it("maps known invoice and quotation actions and falls back to the raw action", () => {
    expect(auditActionLabel("invoice.created")).toBe("Invoice created");
    expect(auditActionLabel("invoice.posted")).toBe("Invoice posted");
    expect(auditActionLabel("quotation.sent")).toBe("Quotation sent");
    expect(auditActionLabel("quotation.converted")).toBe("Quotation converted to invoice");
    expect(auditActionLabel("invoice.mystery")).toBe("invoice.mystery");
  });
});
