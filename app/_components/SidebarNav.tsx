"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function SidebarNav() {
  const pathname = usePathname();

  const items = [
    { href: "/", label: "Home" },
    { href: "/projects", label: "Projects" },
    { href: "/tasks", label: "Tasks" },
    { href: "/focus", label: "Focus" },
    { href: "/calendar", label: "Calendar" },
    { href: "/settings", label: "Settings" },
  ];

  return (
    <nav className="h-full flex flex-col items-center py-6 gap-6 text-xs">
      {items.map((it) => {
        const active = it.href === "/" ? pathname === "/" : pathname.startsWith(it.href);
        return <NavItem key={it.href} href={it.href} label={it.label} active={active} />;
      })}
    </nav>
  );
}

function NavItem({
  label,
  href,
  active = false,
}: {
  label: string;
  href: string;
  active?: boolean;
}) {
  return (
    <div className="relative w-full flex justify-center">
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-full bg-[--accent]" />
      )}
      <Link
        href={href}
        className={`w-10 h-10 rounded-xl border border-[--border] bg-[--bg-soft] text-[11px] flex items-center justify-center hover:bg-neutral-100 transition ${active ? "ring-1 ring-[--accent]" : ""}`}
        aria-current={active ? "page" : undefined}
        title={label}
      >
        {label.slice(0, 1)}
      </Link>
    </div>
  );
}
