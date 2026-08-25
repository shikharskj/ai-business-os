import { PublicBrand } from "@/components/shell/public-brand";
import { ThemeToggle } from "@/components/shell/theme-toggle";

export function AuthChrome() {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border bg-background px-4">
      <PublicBrand size="sm" />
      <ThemeToggle />
    </header>
  );
}
