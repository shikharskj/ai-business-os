"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bot,
  Building2,
  FileText,
  LayoutDashboard,
  Package,
  Receipt,
  Settings,
  ShoppingCart,
  Wallet,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: { label: string; href: string }[];
};

const mainNav: NavItem[] = [
  { label: "Dashboard", href: "/app", icon: LayoutDashboard },
];

const salesNav: NavItem[] = [
  {
    label: "Sales",
    href: "/app/sales",
    icon: Receipt,
    children: [
      { label: "Invoices", href: "/app/sales/invoices" },
      { label: "Customers", href: "/app/sales/customers" },
      { label: "Payments", href: "/app/sales/payments" },
    ],
  },
];

const purchasesNav: NavItem[] = [
  {
    label: "Purchases",
    href: "/app/purchases",
    icon: ShoppingCart,
    children: [
      { label: "Suppliers", href: "/app/purchases/suppliers" },
      { label: "Bills", href: "/app/purchases/bills" },
      { label: "Payments", href: "/app/purchases/payments" },
    ],
  },
];

const inventoryNav: NavItem[] = [
  {
    label: "Inventory",
    href: "/app/inventory",
    icon: Package,
    children: [
      { label: "Products", href: "/app/inventory/products" },
      { label: "Stock", href: "/app/inventory/stock" },
    ],
  },
];

const operationsNav: NavItem[] = [
  { label: "Expenses", href: "/app/expenses", icon: Wallet },
  { label: "Accounting", href: "/app/accounting", icon: FileText },
  { label: "Reports", href: "/app/reports", icon: BarChart3 },
];

const footerNav: NavItem[] = [
  { label: "AI Assistant", href: "/app/assistant", icon: Bot },
  { label: "Settings", href: "/app/settings", icon: Settings },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/app") return pathname === "/app";
  return pathname === href || pathname.startsWith(href + "/");
}

function isSectionActive(pathname: string, item: NavItem): boolean {
  if (isActive(pathname, item.href)) return true;
  return item.children?.some((c) => isActive(pathname, c.href)) ?? false;
}

function NavGroup({
  items,
  pathname,
  label,
}: {
  items: NavItem[];
  pathname: string;
  label?: string;
}) {
  return (
    <SidebarGroup>
      {label ? <SidebarGroupLabel>{label}</SidebarGroupLabel> : null}
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                render={<Link href={item.href} />}
                isActive={isSectionActive(pathname, item)}
                tooltip={item.label}
              >
                <item.icon className="size-4" />
                <span>{item.label}</span>
              </SidebarMenuButton>
              {item.children ? (
                <SidebarMenuSub>
                  {item.children.map((child) => (
                    <SidebarMenuSubItem key={child.href}>
                      <SidebarMenuSubButton
                        render={<Link href={child.href} />}
                        isActive={isActive(pathname, child.href)}
                      >
                        {child.label}
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  ))}
                </SidebarMenuSub>
              ) : null}
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function AppSidebar({ businessName }: { businessName: string }) {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              render={<Link href="/app" />}
              tooltip={businessName}
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Building2 className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{businessName}</span>
                <span className="truncate text-xs text-muted-foreground">
                  Workspace
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <NavGroup items={mainNav} pathname={pathname} />
        <SidebarSeparator />
        <NavGroup items={salesNav} pathname={pathname} />
        <NavGroup items={purchasesNav} pathname={pathname} />
        <NavGroup items={inventoryNav} pathname={pathname} />
        <SidebarSeparator />
        <NavGroup items={operationsNav} pathname={pathname} />
      </SidebarContent>

      <SidebarFooter>
        <SidebarSeparator />
        <NavGroup items={footerNav} pathname={pathname} />
      </SidebarFooter>
    </Sidebar>
  );
}
