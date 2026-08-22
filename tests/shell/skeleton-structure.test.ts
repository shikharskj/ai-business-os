/** @vitest-environment jsdom */

import { createRoot } from "react-dom/client";
import { act, createElement } from "react";
import { describe, expect, it } from "vitest";

import { DashboardPageSkeleton } from "@/components/shell/page-skeletons/dashboard-page-skeleton";
import { LIST_TABLE_PRESETS } from "@/components/shell/page-skeletons/list-table-presets";
import {
  DataTableSkeleton,
  NativeTableSkeleton,
} from "@/components/shell/page-skeletons/shared";

function render(ui: React.ReactElement) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(ui);
  });

  return {
    container,
    cleanup: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

describe("DashboardPageSkeleton", () => {
  it("mirrors DashboardCanvas three-column layout", () => {
    const view = render(createElement(DashboardPageSkeleton));

    expect(view.container.querySelector(".lg\\:grid-cols-3")).not.toBeNull();
    expect(view.container.querySelectorAll(".min-h-36")).toHaveLength(4);
    expect(view.container.querySelector(".h-64")).not.toBeNull();
    expect(view.container.querySelector(".min-h-48")).not.toBeNull();

    view.cleanup();
  });
});

describe("DataTableSkeleton", () => {
  it("uses native table chrome and pagination footer", () => {
    const view = render(
      createElement(DataTableSkeleton, { columns: 5, rows: 3 })
    );

    expect(view.container.querySelector("table")).not.toBeNull();
    expect(view.container.querySelector("thead")).not.toBeNull();
    expect(view.container.querySelectorAll("tbody tr")).toHaveLength(3);
    expect(
      view.container.querySelector(".border-t.border-border.px-4.py-3")
    ).not.toBeNull();

    view.cleanup();
  });
});

describe("NativeTableSkeleton", () => {
  it("renders table without pagination footer", () => {
    const view = render(
      createElement(NativeTableSkeleton, { columns: 4, rows: 2 })
    );

    expect(view.container.querySelector("table")).not.toBeNull();
    expect(
      view.container.querySelector(".border-t.border-border.px-4.py-3")
    ).toBeNull();

    view.cleanup();
  });
});

describe("LIST_TABLE_PRESETS", () => {
  it("matches data-table column counts for list pages", () => {
    expect(LIST_TABLE_PRESETS.invoices.columns).toBe(7);
    expect(LIST_TABLE_PRESETS.customers.columns).toBe(5);
    expect(LIST_TABLE_PRESETS.expenses.columns).toBe(5);
    expect(LIST_TABLE_PRESETS.quotations.columns).toBe(6);
    expect(LIST_TABLE_PRESETS.bills.columns).toBe(6);
    expect(LIST_TABLE_PRESETS.products.columns).toBe(5);
    expect(LIST_TABLE_PRESETS.stock.columns).toBe(4);
    expect(LIST_TABLE_PRESETS.payments.columns).toBe(6);
    expect(LIST_TABLE_PRESETS.suppliers.columns).toBe(4);
    expect(LIST_TABLE_PRESETS.ledger.columns).toBe(6);
    expect(LIST_TABLE_PRESETS.journals.columns).toBe(6);
    expect(LIST_TABLE_PRESETS.accounts.columns).toBe(4);
  });
});
