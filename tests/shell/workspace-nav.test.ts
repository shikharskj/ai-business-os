import { describe, expect, it } from "vitest";

import {
  filterWorkspaceNav,
  findGroupIdForPath,
  flattenWorkspaceNavLeaves,
  getDefaultOpenGroupState,
  WORKSPACE_FOOTER_NAV,
  WORKSPACE_MAIN_NAV,
} from "@/components/shell/workspace-nav";

describe("filterWorkspaceNav", () => {
  it("shows the full tree for OWNER", () => {
    const nav = filterWorkspaceNav("OWNER");
    const labels = nav.flatMap((item) =>
      item.type === "leaf" ? [item.label] : [item.label, ...item.children.map((c) => c.label)],
    );

    expect(labels).toContain("Dashboard");
    expect(labels).toContain("Accounting");
    expect(labels).toContain("Journals");
    expect(labels).toContain("GST summary");
    expect(labels).toContain("Documents");
  });

  it("hides Accounting and Reports for STAFF without report:read", () => {
    const nav = filterWorkspaceNav("STAFF");
    const groupLabels = nav
      .filter((item) => item.type === "group")
      .map((item) => item.label);

    expect(groupLabels).not.toContain("Accounting");
    expect(groupLabels).not.toContain("Reports");
    expect(groupLabels).toContain("Sales");
  });

  it("includes Documents for roles with document:read", () => {
    const nav = filterWorkspaceNav("STAFF", WORKSPACE_FOOTER_NAV);
    const settings = nav.find(
      (item) => item.type === "group" && item.id === "settings",
    );
    expect(settings?.type).toBe("group");
    if (settings?.type === "group") {
      expect(settings.children.map((child) => child.label)).toContain(
        "Documents",
      );
    }
  });

  it("omits groups with no visible children", () => {
    const nav = filterWorkspaceNav("ACCOUNTANT");
    const sales = nav.find(
      (item) => item.type === "group" && item.id === "sales",
    );
    expect(sales?.type).toBe("group");
    if (sales?.type === "group") {
      expect(sales.children.length).toBeGreaterThan(0);
    }
  });
});

describe("flattenWorkspaceNavLeaves", () => {
  it("includes dashboard and leaf pages but not toggle-only group hubs", () => {
    const routes = flattenWorkspaceNavLeaves(filterWorkspaceNav("OWNER"));
    const hrefs = routes.map((route) => route.href);

    expect(hrefs).toContain("/app");
    expect(hrefs).toContain("/app/sales/invoices");
    expect(hrefs).toContain("/app/sales/orders");
    expect(hrefs).toContain("/app/sales/credit-notes");
    expect(hrefs).toContain("/app/purchases/returns");
    expect(hrefs).not.toContain("/app/sales");
    expect(hrefs).not.toContain("/app/reports");
    expect(hrefs).toContain("/app/settings");
  });
});

describe("findGroupIdForPath", () => {
  it("returns accounting for journal pages", () => {
    expect(findGroupIdForPath("/app/accounting/journals")).toBe("accounting");
  });

  it("returns settings for members page", () => {
    expect(findGroupIdForPath("/app/settings/members")).toBe("settings");
  });
});

describe("getDefaultOpenGroupState", () => {
  it("collapses accounting, reports, and settings by default", () => {
    const state = getDefaultOpenGroupState();
    expect(state.sales).toBe(true);
    expect(state.purchases).toBe(true);
    expect(state.inventory).toBe(true);
    expect(state.accounting).toBe(false);
    expect(state.reports).toBe(false);
    expect(state.settings).toBe(false);
  });
});
