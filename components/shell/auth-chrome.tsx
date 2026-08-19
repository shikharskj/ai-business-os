import { ThemeToggle } from "@/components/shell/theme-toggle";

export function AuthChrome() {
  return (
    <header className="flex h-16 shrink-0 items-center justify-end border-b border-border bg-background px-4">
      <ThemeToggle />
    </header>
  );
}
