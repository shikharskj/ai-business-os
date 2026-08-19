"use client";

import { CheckIcon, MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

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
