import { describe, expect, it } from "vitest";

import { resolveFlashToast, stripFlashParams } from "@/lib/feedback/flash-toast-map";

describe("resolveFlashToast", () => {
  it("maps saved=1 on invoice detail to an update toast", () => {
    const params = new URLSearchParams("saved=1");
    const result = resolveFlashToast("/app/sales/invoices/inv_123", params);

    expect(result?.message.title).toBe("Invoice updated");
    expect(result?.paramKeys).toEqual(["saved"]);
  });

  it("maps created=1 on invoice detail to a create toast", () => {
    const params = new URLSearchParams("created=1");
    const result = resolveFlashToast("/app/sales/invoices/inv_123", params);

    expect(result?.message.title).toBe("Invoice created");
    expect(result?.paramKeys).toEqual(["created"]);
  });

  it("maps entityCreated on form return targets", () => {
    const params = new URLSearchParams(
      "customerId=cust_1&entityCreated=customer"
    );
    const result = resolveFlashToast("/app/sales/payments/new", params);

    expect(result?.message.title).toBe("Customer created");
    expect(result?.message.description).toBe("Continue on this form.");
    expect(result?.paramKeys).toEqual(["entityCreated"]);
  });

  it("maps invited=1 on members page", () => {
    const params = new URLSearchParams("invited=1");
    const result = resolveFlashToast("/app/settings/members", params);

    expect(result?.message.title).toBe("Invitation sent");
  });

  it("maps saved=autonomy on settings page", () => {
    const params = new URLSearchParams("saved=autonomy");
    const result = resolveFlashToast("/app/settings", params);

    expect(result?.message.title).toBe("Autonomy policy saved");
  });

  it("returns null for unknown params", () => {
    const params = new URLSearchParams("foo=bar");
    expect(resolveFlashToast("/app/settings", params)).toBeNull();
  });
});

describe("stripFlashParams", () => {
  it("removes requested keys", () => {
    const params = new URLSearchParams("saved=1&page=2");
    const next = stripFlashParams(params, ["saved"]);

    expect(next.toString()).toBe("page=2");
  });
});
