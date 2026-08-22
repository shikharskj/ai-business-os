import { describe, expect, it } from "vitest";

import {
  buildEntityCreateHref,
  buildRedirectAfterEntityCreate,
  buildReturnToUrl,
  parseReturnTo,
  parseReturnToValue,
} from "@/lib/navigation/entity-create-return";

describe("entity-create-return", () => {
  it("rejects external and traversal return targets", () => {
    expect(parseReturnTo("https://evil.example/phish")).toBeNull();
    expect(parseReturnTo("//evil.example/phish")).toBeNull();
    expect(parseReturnTo("/app/../settings")).toBeNull();
    expect(parseReturnTo("/app/sales/customers/new")).toBeNull();
  });

  it("accepts allowlisted return targets with preserve query keys", () => {
    expect(
      parseReturnToValue(
        "/app/sales/invoices/new?customerId=cust_1&lineIndex=2"
      )
    ).toEqual({
      pathname: "/app/sales/invoices/new",
      href: "/app/sales/invoices/new?customerId=cust_1&lineIndex=2",
    });
    expect(
      parseReturnToValue("/app/sales/invoices/new?invoiceId=bad")
    ).toBeNull();
  });

  it("builds entity create href with encoded returnTo", () => {
    expect(
      buildEntityCreateHref({
        entity: "customer",
        returnTo: "/app/sales/payments/new",
      })
    ).toBe(
      "/app/sales/customers/new?returnTo=%2Fapp%2Fsales%2Fpayments%2Fnew"
    );
  });

  it("builds returnTo urls with preserve query params", () => {
    expect(
      buildReturnToUrl("/app/sales/invoices/new", {
        customerId: "cust_1",
        lineIndex: "1",
      })
    ).toBe("/app/sales/invoices/new?customerId=cust_1&lineIndex=1");
  });

  it("builds redirect urls after entity create", () => {
    expect(
      buildRedirectAfterEntityCreate({
        entity: "customer",
        entityId: "cust_new",
        returnTo: "/app/sales/payments/new",
      })
    ).toBe(
      "/app/sales/payments/new?customerId=cust_new&entityCreated=customer"
    );

    expect(
      buildRedirectAfterEntityCreate({
        entity: "product",
        entityId: "prod_new",
        returnTo: "/app/purchases/bills/new?supplierId=sup_1&lineIndex=2",
      })
    ).toBe(
      "/app/purchases/bills/new?supplierId=sup_1&lineIndex=2&productId=prod_new&entityCreated=product"
    );

    expect(
      buildRedirectAfterEntityCreate({
        entity: "customer",
        entityId: "cust_new",
        returnTo: "/app/purchases/bills/new",
      })
    ).toBeNull();
  });
});
