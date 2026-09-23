"use client";

import { Home, ListTodo, LogOut, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { signOut } from "@/app/login/actions";

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

  if (pathname === "/login") {
    return <main className="auth-shell">{children}</main>;
  }

  return (
    <div className="min-h-dvh">
      <main className="page-shell">{children}</main>

      <Link
        href="/tasks/new"
        className="floating-add-button"
        aria-label="タスクを追加"
        title="タスクを追加"
      >
        <Plus size={27} strokeWidth={2.4} aria-hidden="true" />
      </Link>

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
        <form action={signOut}>
          <button type="submit" aria-label="ログアウト">
            <LogOut size={21} aria-hidden="true" />
            <span>ログアウト</span>
          </button>
        </form>
      </nav>
    </div>
  );
}
