import {
  BarChart3,
  FileText,
  LayoutDashboard,
  Package,
  Receipt,
  Settings,
  ShoppingCart,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { roleHasPermission, type Permission } from "@/lib/security/permissions";
import type { MembershipRole } from "@/modules/tenant/domain/types";

export const SIDEBAR_NAV_GROUPS_STORAGE_KEY = "sidebar-nav-groups";

export type WorkspaceNavLeaf = {
  type: "leaf";
  label: string;
  href: string;
  icon?: LucideIcon;
  permission?: Permission;
  keywords: string;
};

export type WorkspaceNavGroup = {
  type: "group";
  id: string;
  label: string;
  icon: LucideIcon;
  defaultOpen: boolean;
  /** When set, the parent row navigates (Settings). Otherwise it toggles only. */
  href?: string;
  children: WorkspaceNavLeaf[];
};

export type WorkspaceNavItem = WorkspaceNavLeaf | WorkspaceNavGroup;

export type WorkspaceNavLeafRoute = {
  label: string;
  href: string;
  keywords: string;
};

const dashboardLeaf: WorkspaceNavLeaf = {
  type: "leaf",
  label: "Dashboard",
  href: "/app",
  icon: LayoutDashboard,
  keywords: "home overview dashboard",
};

const salesGroup: WorkspaceNavGroup = {
  type: "group",
  id: "sales",
  label: "Sales",
  icon: Receipt,
  defaultOpen: true,
  children: [
    {
      type: "leaf",
      label: "Quotations",
      href: "/app/sales/quotations",
      permission: "quotation:read",
      keywords: "quote pricing sales",
    },
    {
      type: "leaf",
      label: "Invoices",
      href: "/app/sales/invoices",
      permission: "invoice:read",
      keywords: "sales bill receivables",
    },
    {
      type: "leaf",
      label: "Customers",
      href: "/app/sales/customers",
      permission: "customer:read",
      keywords: "party buyer",
    },
    {
      type: "leaf",
      label: "Customer payments",
      href: "/app/sales/payments",
      permission: "payment:read",
      keywords: "receipt collection customer",
    },
  ],
};

const purchasesGroup: WorkspaceNavGroup = {
  type: "group",
  id: "purchases",
  label: "Purchases",
  icon: ShoppingCart,
  defaultOpen: true,
  children: [
    {
      type: "leaf",
      label: "Suppliers",
      href: "/app/purchases/suppliers",
      permission: "supplier:read",
      keywords: "vendor party",
    },
    {
      type: "leaf",
      label: "Bills",
      href: "/app/purchases/bills",
      permission: "purchase:read",
      keywords: "supplier bills payables",
    },
    {
      type: "leaf",
      label: "Supplier payments",
      href: "/app/purchases/payments",
      permission: "payment:read",
      keywords: "payout supplier payment",
    },
  ],
};

const inventoryGroup: WorkspaceNavGroup = {
  type: "group",
  id: "inventory",
  label: "Inventory",
  icon: Package,
  defaultOpen: true,
  children: [
    {
      type: "leaf",
      label: "Products",
      href: "/app/inventory/products",
      permission: "product:read",
      keywords: "catalog sku",
    },
    {
      type: "leaf",
      label: "Stock",
      href: "/app/inventory/stock",
      permission: "product:read",
      keywords: "stock levels low",
    },
  ],
};

const expensesLeaf: WorkspaceNavLeaf = {
  type: "leaf",
  label: "Expenses",
  href: "/app/expenses",
  icon: Wallet,
  permission: "expense:read",
  keywords: "spend costs",
};

const accountingGroup: WorkspaceNavGroup = {
  type: "group",
  id: "accounting",
  label: "Accounting",
  icon: FileText,
  defaultOpen: false,
  children: [
    {
      type: "leaf",
      label: "Chart of accounts",
      href: "/app/accounting/accounts",
      permission: "report:read",
      keywords: "accounts chart ledger",
    },
    {
      type: "leaf",
      label: "Journals",
      href: "/app/accounting/journals",
      permission: "report:read",
      keywords: "journal entries posting",
    },
    {
      type: "leaf",
      label: "Ledger",
      href: "/app/accounting/ledger",
      permission: "report:read",
      keywords: "account ledger lines",
    },
    {
      type: "leaf",
      label: "Trial balance",
      href: "/app/accounting/trial-balance",
      permission: "report:read",
      keywords: "trial balance debits credits",
    },
    {
      type: "leaf",
      label: "Periods",
      href: "/app/accounting/periods",
      permission: "report:read",
      keywords: "period close accounting",
    },
  ],
};

const reportsGroup: WorkspaceNavGroup = {
  type: "group",
  id: "reports",
  label: "Reports",
  icon: BarChart3,
  defaultOpen: false,
  children: [
    {
      type: "leaf",
      label: "Sales",
      href: "/app/reports/sales",
      permission: "report:read",
      keywords: "sales report revenue",
    },
    {
      type: "leaf",
      label: "Expenses",
      href: "/app/reports/expenses",
      permission: "report:read",
      keywords: "expense report spend",
    },
    {
      type: "leaf",
      label: "Profit",
      href: "/app/reports/profit",
      permission: "report:read",
      keywords: "profit loss margin",
    },
    {
      type: "leaf",
      label: "Receivables",
      href: "/app/reports/receivables",
      permission: "report:read",
      keywords: "receivables outstanding customers",
    },
    {
      type: "leaf",
      label: "Payables",
      href: "/app/reports/payables",
      permission: "report:read",
      keywords: "payables suppliers owed",
    },
    {
      type: "leaf",
      label: "Inventory",
      href: "/app/reports/inventory",
      permission: "report:read",
      keywords: "inventory stock report",
    },
    {
      type: "leaf",
      label: "GST summary",
      href: "/app/reports/gst",
      permission: "report:read",
      keywords: "gst tax summary",
    },
  ],
};

const settingsGroup: WorkspaceNavGroup = {
  type: "group",
  id: "settings",
  label: "Settings",
  icon: Settings,
  defaultOpen: false,
  href: "/app/settings",
  children: [
    {
      type: "leaf",
      label: "Members",
      href: "/app/settings/members",
      permission: "settings:read",
      keywords: "team invite roles",
    },
    {
      type: "leaf",
      label: "Documents",
      href: "/app/settings/documents",
      permission: "document:read",
      keywords: "files uploads",
    },
  ],
};

export const WORKSPACE_MAIN_NAV: WorkspaceNavItem[] = [
  dashboardLeaf,
  salesGroup,
  purchasesGroup,
  inventoryGroup,
  expensesLeaf,
  accountingGroup,
  reportsGroup,
];

export const WORKSPACE_FOOTER_NAV: WorkspaceNavItem[] = [settingsGroup];

export const COMMAND_MENU_EXTRA_ROUTES: WorkspaceNavLeafRoute[] = [
  {
    label: "Search",
    href: "/app/search",
    keywords: "find records global search",
  },
];

export function pathMatches(pathname: string, href: string): boolean {
  if (href === "/app") return pathname === "/app";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function canAccessLeaf(role: MembershipRole, leaf: WorkspaceNavLeaf): boolean {
  if (!leaf.permission) return true;
  return roleHasPermission(role, leaf.permission);
}

function filterNavItem(role: MembershipRole, item: WorkspaceNavItem): WorkspaceNavItem | null {
  if (item.type === "leaf") {
    return canAccessLeaf(role, item) ? item : null;
  }

  const children = item.children.filter((child) => canAccessLeaf(role, child));
  if (children.length === 0) {
    return null;
  }

  return { ...item, children };
}

export function filterWorkspaceNav(
  role: MembershipRole,
  items: WorkspaceNavItem[] = [...WORKSPACE_MAIN_NAV, ...WORKSPACE_FOOTER_NAV],
): WorkspaceNavItem[] {
  return items
    .map((item) => filterNavItem(role, item))
    .filter((item): item is WorkspaceNavItem => item !== null);
}

export function flattenWorkspaceNavLeaves(
  items: WorkspaceNavItem[],
): WorkspaceNavLeafRoute[] {
  const routes: WorkspaceNavLeafRoute[] = [];

  for (const item of items) {
    if (item.type === "leaf") {
      routes.push({
        label: item.label,
        href: item.href,
        keywords: item.keywords,
      });
      continue;
    }

    for (const child of item.children) {
      routes.push({
        label: child.label,
        href: child.href,
        keywords: child.keywords,
      });
    }

    if (item.href) {
      routes.push({
        label: item.label,
        href: item.href,
        keywords: `${item.label.toLowerCase()} business profile`,
      });
    }
  }

  return routes;
}

export function findGroupIdForPath(
  pathname: string,
  items: WorkspaceNavItem[] = [...WORKSPACE_MAIN_NAV, ...WORKSPACE_FOOTER_NAV],
): string | null {
  for (const item of items) {
    if (item.type !== "group") continue;
    if (item.href && pathMatches(pathname, item.href)) {
      return item.id;
    }
    if (item.children.some((child) => pathMatches(pathname, child.href))) {
      return item.id;
    }
  }
  return null;
}

export function getDefaultOpenGroupState(
  items: WorkspaceNavItem[] = [...WORKSPACE_MAIN_NAV, ...WORKSPACE_FOOTER_NAV],
): Record<string, boolean> {
  const state: Record<string, boolean> = {};
  for (const item of items) {
    if (item.type === "group") {
      state[item.id] = item.defaultOpen;
    }
  }
  return state;
}

export const EMPTY_SIDEBAR_GROUP_STATE: Record<string, boolean> = {};

let cachedClientPersistedGroups: Record<string, boolean> | undefined;

export function getSidebarPersistClientSnapshot(): Record<string, boolean> {
  if (cachedClientPersistedGroups === undefined) {
    cachedClientPersistedGroups =
      readPersistedGroupState() ?? EMPTY_SIDEBAR_GROUP_STATE;
  }
  return cachedClientPersistedGroups;
}

export function getSidebarPersistServerSnapshot(): Record<string, boolean> {
  return EMPTY_SIDEBAR_GROUP_STATE;
}

export function readPersistedGroupState(): Record<string, boolean> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SIDEBAR_NAV_GROUPS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed as Record<string, boolean>;
  } catch {
    return null;
  }
}

export function writePersistedGroupState(state: Record<string, boolean>): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    SIDEBAR_NAV_GROUPS_STORAGE_KEY,
    JSON.stringify(state),
  );
  cachedClientPersistedGroups = state;
}
