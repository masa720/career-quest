"use client";

import { Home, ListTodo, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "TOP", icon: Home },
  { href: "/tasks/new", label: "追加", icon: Plus },
  { href: "/tasks", label: "タスク", icon: ListTodo },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/tasks") return pathname === "/tasks";
  return pathname.startsWith(href);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-dvh">
      <header className="app-header">
        <div className="header-inner">
          <Link href="/" className="brand" aria-label="CareerQuest TOP">
            <span className="brand-mark" aria-hidden="true">
              CQ
            </span>
            <span>
              <strong>CareerQuest</strong>
              <small>次のキャリアへ、今日の一歩。</small>
            </span>
          </Link>
          <nav className="desktop-nav" aria-label="メインナビゲーション">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={isActive(pathname, href) ? "active" : undefined}
              >
                <Icon size={17} aria-hidden="true" />
                {label === "追加" ? "タスク登録" : label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="page-shell">{children}</main>

      <nav className="mobile-nav" aria-label="メインナビゲーション">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={isActive(pathname, href) ? "active" : undefined}
          >
            <Icon size={21} aria-hidden="true" />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
