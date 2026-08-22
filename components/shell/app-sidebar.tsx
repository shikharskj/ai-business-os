"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Building2, ChevronRight } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  filterWorkspaceNav,
  findGroupIdForPath,
  getDefaultOpenGroupState,
  pathMatches,
  readPersistedGroupState,
  writePersistedGroupState,
  WORKSPACE_FOOTER_NAV,
  WORKSPACE_MAIN_NAV,
  type WorkspaceNavGroup,
  type WorkspaceNavItem,
} from "@/components/shell/workspace-nav";
import type { MembershipRole } from "@/modules/tenant/domain/types";
import { cn } from "@/lib/utils";

function NavItems({
  items,
  pathname,
  openGroups,
  onToggleGroup,
}: {
  items: WorkspaceNavItem[];
  pathname: string;
  openGroups: Record<string, boolean>;
  onToggleGroup: (groupId: string) => void;
}) {
  return (
    <SidebarMenu>
      {items.map((item) => {
        if (item.type === "leaf") {
          const Icon = item.icon;
          const isActive = pathMatches(pathname, item.href);
          const isExact = pathname === item.href;

          return (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                render={<Link href={item.href} />}
                isActive={isActive}
                aria-current={isExact ? "page" : undefined}
                tooltip={item.label}
              >
                {Icon ? <Icon className="size-5" /> : null}
                <span>{item.label}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        }

        return (
          <NavGroupItem
            key={item.id}
            group={item}
            pathname={pathname}
            isOpen={openGroups[item.id] ?? item.defaultOpen}
            onToggle={() => onToggleGroup(item.id)}
          />
        );
      })}
    </SidebarMenu>
  );
}

function NavGroupChildren({
  group,
  pathname,
}: {
  group: WorkspaceNavGroup;
  pathname: string;
}) {
  return (
    <SidebarMenuSub>
      {group.children.map((child) => {
        const isActive = pathMatches(pathname, child.href);
        const isExact = pathname === child.href;

        return (
          <SidebarMenuSubItem key={child.href}>
            <SidebarMenuSubButton
              render={<Link href={child.href} />}
              isActive={isActive}
              aria-current={isExact ? "page" : undefined}
            >
              {child.label}
            </SidebarMenuSubButton>
          </SidebarMenuSubItem>
        );
      })}
    </SidebarMenuSub>
  );
}

function IconModeGroupMenu({
  group,
  isChildActive,
}: {
  group: WorkspaceNavGroup;
  isChildActive: boolean;
}) {
  const Icon = group.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <SidebarMenuButton
            isActive={isChildActive}
            tooltip={group.label}
          />
        }
      >
        <Icon className="size-5" />
        <span>{group.label}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="right" align="start" className="min-w-48">
        {group.href ? (
          <DropdownMenuItem render={<Link href={group.href} />}>
            {group.label}
          </DropdownMenuItem>
        ) : null}
        {group.children.map((child) => (
          <DropdownMenuItem key={child.href} render={<Link href={child.href} />}>
            {child.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function NavGroupItem({
  group,
  pathname,
  isOpen,
  onToggle,
}: {
  group: WorkspaceNavGroup;
  pathname: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const { state, isMobile } = useSidebar();
  const sidebarCollapsed = !isMobile && state === "collapsed";
  const Icon = group.icon;

  const isChildActive = group.children.some((child) =>
    pathMatches(pathname, child.href),
  );
  const isSettingsPage =
    group.href !== undefined && pathMatches(pathname, group.href);
  const isLinkableGroup = group.href !== undefined;

  if (sidebarCollapsed) {
    return (
      <SidebarMenuItem>
        <IconModeGroupMenu
          group={group}
          isChildActive={isChildActive || isSettingsPage}
        />
      </SidebarMenuItem>
    );
  }

  if (isLinkableGroup && group.href) {
    return (
      <SidebarMenuItem>
        <div className="flex w-full items-center gap-0">
          <SidebarMenuButton
            className="min-w-0 flex-1"
            render={<Link href={group.href} />}
            isActive={isSettingsPage && !isChildActive}
            aria-current={isSettingsPage && !isChildActive ? "page" : undefined}
            tooltip={group.label}
          >
            <Icon className="size-5" />
            <span>{group.label}</span>
          </SidebarMenuButton>
          <button
            type="button"
            className="flex size-10 shrink-0 items-center justify-center rounded-md text-sidebar-foreground ring-sidebar-ring outline-hidden hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2"
            aria-expanded={isOpen}
            aria-label={`${isOpen ? "Collapse" : "Expand"} ${group.label}`}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onToggle();
            }}
          >
            <ChevronRight
              className={cn(
                "size-4 transition-transform",
                isOpen && "rotate-90",
              )}
            />
          </button>
        </div>
        {isOpen ? <NavGroupChildren group={group} pathname={pathname} /> : null}
      </SidebarMenuItem>
    );
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        type="button"
        aria-expanded={isOpen}
        onClick={onToggle}
        tooltip={group.label}
      >
        <Icon className="size-5" />
        <span className="flex-1">{group.label}</span>
        <ChevronRight
          className={cn(
            "size-4 shrink-0 transition-transform",
            isOpen && "rotate-90",
          )}
        />
      </SidebarMenuButton>
      {isOpen ? <NavGroupChildren group={group} pathname={pathname} /> : null}
    </SidebarMenuItem>
  );
}

function NavSection({
  items,
  pathname,
  openGroups,
  onToggleGroup,
}: {
  items: WorkspaceNavItem[];
  pathname: string;
  openGroups: Record<string, boolean>;
  onToggleGroup: (groupId: string) => void;
}) {
  if (items.length === 0) return null;

  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <NavItems
          items={items}
          pathname={pathname}
          openGroups={openGroups}
          onToggleGroup={onToggleGroup}
        />
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function AppSidebar({
  businessName,
  role,
}: {
  businessName: string;
  role: MembershipRole;
}) {
  const pathname = usePathname();
  const mainNav = useMemo(() => filterWorkspaceNav(role, WORKSPACE_MAIN_NAV), [role]);
  const footerNav = useMemo(
    () => filterWorkspaceNav(role, WORKSPACE_FOOTER_NAV),
    [role],
  );

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(
    getDefaultOpenGroupState,
  );
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const persisted = readPersistedGroupState();
    if (persisted) {
      setOpenGroups((current) => ({ ...current, ...persisted }));
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    const activeGroupId = findGroupIdForPath(pathname);
    if (!activeGroupId) return;
    setOpenGroups((current) => {
      if (current[activeGroupId]) return current;
      return { ...current, [activeGroupId]: true };
    });
  }, [pathname]);

  useEffect(() => {
    if (!hydrated) return;
    writePersistedGroupState(openGroups);
  }, [openGroups, hydrated]);

  const onToggleGroup = useCallback((groupId: string) => {
    setOpenGroups((current) => ({
      ...current,
      [groupId]: !(current[groupId] ?? getDefaultOpenGroupState()[groupId]),
    }));
  }, []);

  const moduleNav = mainNav.filter(
    (item) => item.type === "group" || item.href !== "/app",
  );
  const dashboardNav = mainNav.filter(
    (item) => item.type === "leaf" && item.href === "/app",
  );

  return (
    <Sidebar
      collapsible="icon"
      className="shadow-[0_0_10px_0_rgba(0,0,0,0.1)] dark:shadow-[0_0_10px_0_rgba(255,255,255,0.1)]"
    >
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              render={<Link href="/app" />}
              tooltip={businessName}
            >
              <div className="flex aspect-square size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <Building2 className="size-5" />
              </div>
              <div className="grid flex-1 text-left text-base leading-tight">
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
        <NavSection
          items={dashboardNav}
          pathname={pathname}
          openGroups={openGroups}
          onToggleGroup={onToggleGroup}
        />
        <SidebarSeparator />
        <NavSection
          items={moduleNav.slice(0, 3)}
          pathname={pathname}
          openGroups={openGroups}
          onToggleGroup={onToggleGroup}
        />
        <SidebarSeparator />
        <NavSection
          items={moduleNav.slice(3)}
          pathname={pathname}
          openGroups={openGroups}
          onToggleGroup={onToggleGroup}
        />
      </SidebarContent>

      <SidebarFooter>
        <SidebarSeparator />
        <NavSection
          items={footerNav}
          pathname={pathname}
          openGroups={openGroups}
          onToggleGroup={onToggleGroup}
        />
      </SidebarFooter>
    </Sidebar>
  );
}
