import { describe, expect, it } from "vitest";

import { auditActionLabel } from "@/components/business/entity-activity-panel";

describe("auditActionLabel", () => {
  it("maps known invoice and quotation actions and falls back to the raw action", () => {
    expect(auditActionLabel("invoice.created")).toBe("Invoice created");
    expect(auditActionLabel("invoice.posted")).toBe("Invoice posted");
    expect(auditActionLabel("quotation.sent")).toBe("Quotation sent");
    expect(auditActionLabel("credit_note.posted")).toBe("Credit note posted");
    expect(auditActionLabel("sales_order.confirmed")).toBe("Sales order confirmed");
    expect(auditActionLabel("purchase_return.created")).toBe("Purchase return created");
    expect(auditActionLabel("payment.advance_applied")).toBe("Customer credit applied");
    expect(auditActionLabel("invoice.mystery")).toBe("invoice.mystery");
  });
});
