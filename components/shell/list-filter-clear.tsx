import Link from "next/link";

export function ListFilterClear({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="inline-flex h-10 items-center text-base font-medium text-muted-foreground hover:text-foreground"
    >
      Clear
    </Link>
  );
}
