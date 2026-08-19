"use client";

import { CheckIcon, MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label="Toggle theme"
          />
        }
      >
        <SunIcon className="dark:hidden" />
        <MoonIcon className="hidden dark:inline" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-auto min-w-40">
        {mounted ? (
          <>
            <ThemeMenuItem
              label="Light"
              selected={theme === "light"}
              onSelect={() => setTheme("light")}
            />
            <ThemeMenuItem
              label="Dark"
              selected={theme === "dark"}
              onSelect={() => setTheme("dark")}
            />
            <ThemeMenuItem
              label="System"
              selected={theme === "system"}
              onSelect={() => setTheme("system")}
            />
          </>
        ) : (
          <>
            <ThemeMenuItem
              label="Light"
              selected={false}
              onSelect={() => {}}
            />
            <ThemeMenuItem
              label="Dark"
              selected={false}
              onSelect={() => {}}
            />
            <ThemeMenuItem
              label="System"
              selected={false}
              onSelect={() => {}}
            />
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ThemeMenuItem({
  label,
  selected,
  onSelect,
}: {
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <DropdownMenuItem onClick={onSelect}>
      {label}
      {selected ? <CheckIcon className="ml-auto" /> : null}
    </DropdownMenuItem>
  );
}
