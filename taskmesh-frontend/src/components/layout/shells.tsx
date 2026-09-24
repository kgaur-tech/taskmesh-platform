"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { signOut, useSession } from "next-auth/react";
import { ArrowRight, Bell, BookOpen, CalendarDays, ChevronRight, LayoutGrid, Menu, ShieldCheck, Sparkles, Target, Users, X } from "lucide-react";
import { Avatar, Badge, Button, NavLink } from "@/components/ui";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

const studentNav = [
  { href: "/app/dashboard", label: "Dashboard", icon: <LayoutGrid className="h-4 w-4" /> },
  { href: "/app/initiatives", label: "Initiatives", icon: <Sparkles className="h-4 w-4" /> },
  { href: "/app/tasks", label: "Tasks", icon: <Target className="h-4 w-4" /> },
  { href: "/app/leaderboard", label: "Leaderboard", icon: <Users className="h-4 w-4" /> },
  { href: "/app/groups", label: "Groups", icon: <ShieldCheck className="h-4 w-4" /> },
  { href: "/app/notifications", label: "Notifications", icon: <Bell className="h-4 w-4" /> }
];

const leaderNav = [
  { href: "/leader/dashboard", label: "Dashboard", icon: <LayoutGrid className="h-4 w-4" /> },
  { href: "/leader/initiatives", label: "Initiatives", icon: <BookOpen className="h-4 w-4" /> },
  { href: "/leader/groups", label: "Groups", icon: <Users className="h-4 w-4" /> },
  { href: "/leader/notifications", label: "Notifications", icon: <Bell className="h-4 w-4" /> }
];

export function TopBrand() {
  return (
    <Link href="/" className="flex min-w-0 items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-soft">
        <span className="text-base font-bold">T</span>
      </div>
      <div>
        <p className="text-sm font-semibold tracking-tight text-slate-950">TaskMesh</p>
        <p className="text-xs text-slate-500">AI-guided growth and initiative tracking</p>
      </div>
    </Link>
  );
}

export function MarketingShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const links = [
    { href: "/", label: "Home" },
    { href: "/english", label: "English" },
    { href: "/dsa", label: "DSA" },
    { href: "/more", label: "More" },
    { href: "/about", label: "About us" }
  ];
  const isSignedIn = status === "authenticated" && !!session?.user;

  return (
    <div className="marketing-shell flex min-h-screen flex-col bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
      <header className="marketing-header sticky top-0 z-40 border-b backdrop-blur">
        <div className="page-container flex min-h-[4.75rem] items-center justify-between gap-4">
          <TopBrand />
          <nav className="hidden items-center gap-1 md:flex" aria-label="Primary navigation">
            {links.map((link) => <Link key={link.href} href={link.href} aria-current={pathname === link.href ? "page" : undefined} className="marketing-nav-link">{link.label}</Link>)}
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {!isSignedIn ? (
              <>
                <Button className="hidden sm:inline-flex" variant="ghost" asChild><Link href="/sign-in">Sign in</Link></Button>
                <Button className="hidden md:inline-flex" asChild><Link href="/sign-in">Get started <ArrowRight className="h-4 w-4" /></Link></Button>
              </>
            ) : (
              <>
                <Button className="hidden sm:inline-flex" variant="ghost" asChild><Link href="/app/dashboard">Open workspace</Link></Button>
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  Sign out
                </button>
              </>
            )}
            <button className="mobile-menu-button md:hidden" type="button" onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen} aria-controls="mobile-public-navigation" aria-label="Toggle navigation">
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {menuOpen ? <nav id="mobile-public-navigation" className="mobile-public-nav md:hidden" aria-label="Mobile primary navigation">{links.map((link) => <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)} aria-current={pathname === link.href ? "page" : undefined}>{link.label}</Link>)}{!isSignedIn ? <Link href="/sign-in" onClick={() => setMenuOpen(false)}>Sign in <ArrowRight className="h-4 w-4" /></Link> : <Link href="/app/dashboard" onClick={() => setMenuOpen(false)}>Open workspace <ArrowRight className="h-4 w-4" /></Link>}</nav> : null}
      </header>
      <div className="flex-1">{children}</div>
      <footer className="marketing-footer border-t"><div className="page-container flex flex-col gap-2 py-6 text-sm sm:flex-row sm:items-center sm:justify-between"><span>© {new Date().getFullYear()} TaskMesh</span><span>Structured practice for steady growth.</span></div></footer>
    </div>
  );
}

export function AppShell({ children, role = "student" }: { children: ReactNode; role?: "student" | "leader" }) {
  const pathname = usePathname();
  const [commandOpen, setCommandOpen] = useState(false);
  const nav = role === "leader" ? leaderNav : studentNav;
  const profile = role === "leader" ? { name: "Leader workspace", subtitle: "Manage initiative operations when data is available." } : { name: "Participant workspace", subtitle: "Build a steady practice rhythm." };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((open) => !open);
      }
      if (event.key === "Escape") setCommandOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_42%,#f4f7fb_100%)] text-slate-950">
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <aside className="sticky top-0 hidden h-screen w-[274px] shrink-0 border-r border-slate-200/70 bg-white/88 px-4 py-5 backdrop-blur xl:flex xl:flex-col">
          <TopBrand />
          <div className="mt-5 rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,#0f172a_0%,#111827_100%)] p-4 text-white shadow-soft">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-white/60">{role === "leader" ? "Leader view" : "Student view"}</p>
                <p className="mt-2 text-lg font-semibold">{profile.name}</p>
              </div>
              <Avatar name={profile.name} className="bg-white text-slate-950" />
            </div>
              <p className="mt-3 text-sm leading-6 text-white/72">{profile.subtitle}</p>
          </div>
          <div className="mt-5 space-y-1">
            {nav.map((item) => (
              <NavLink key={item.href} href={item.href} active={pathname.startsWith(item.href)}>
                <span className="opacity-80">{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </div>
          <div className="mt-5 rounded-[28px] border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-950">Quick switch</p>
              <Badge tone="orange">{role === "leader" ? "Owner" : "Participant"}</Badge>
            </div>
            <p className="mt-2 text-sm text-slate-600">{role === "leader" ? "Inspect initiative health and manage cohorts." : "Track streaks, tasks, and growth momentum."}</p>
            <div className="mt-4 space-y-2">
              <Button className="w-full justify-between" variant="outline" asChild>
                <Link href={role === "leader" ? "/app/dashboard" : "/leader/dashboard"}>
                  Open {role === "leader" ? "student" : "leader"} view
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
          <div className="mt-auto pt-6"><div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs uppercase tracking-[0.2em] text-slate-500">Core initiatives</p><Link className="mt-3 block text-sm font-medium text-slate-900" href="/english">English →</Link><Link className="mt-2 block text-sm font-medium text-slate-900" href="/dsa">DSA →</Link></div></div>
        </aside>

        <main className="min-w-0 flex-1">
          <div className="border-b border-slate-200/70 bg-white/74 px-4 py-4 backdrop-blur md:px-6 xl:px-8">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 xl:hidden">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-white">
                  <span className="text-sm font-semibold">T</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-950">TaskMesh</p>
                  <p className="text-xs text-slate-500">{role === "leader" ? "Leader workspace" : "Student workspace"}</p>
                </div>
              </div>
              <button onClick={() => setCommandOpen(true)} className="hidden flex-1 items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-2 text-left shadow-sm transition hover:border-slate-300 hover:shadow-md md:flex" aria-label="Open search">
                <CalendarDays className="h-4 w-4 text-slate-400" />
                <span className="text-sm text-slate-500">Search initiatives, tasks, members, and reports</span>
                <kbd className="ml-auto rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-500">Ctrl K</kbd>
              </button>
              <div className="flex items-center gap-2">
                <Badge tone="green">Workspace ready</Badge>
                <Button variant="outline" className="hidden sm:inline-flex">Invite</Button>
                <Avatar name={profile.name} />
              </div>
            </div>
          </div>
          <div className="mx-auto w-full max-w-[1280px] px-4 py-6 md:px-6 xl:px-8">{children}</div>
        </main>
      </div>
      {commandOpen ? <CommandMenu onClose={() => setCommandOpen(false)} role={role} /> : null}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/92 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur xl:hidden">
        <div className="mx-auto flex max-w-4xl items-center gap-2 overflow-x-auto pb-1">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-w-[72px] flex-1 flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium",
                pathname.startsWith(item.href) ? "bg-slate-950 text-white" : "text-slate-500"
              )}
            >
              {item.icon}
              <span className="truncate">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function CommandMenu({ onClose, role }: { onClose: () => void; role: "student" | "leader" }) {
  const items = role === "leader"
    ? [{ label: "Overview", href: "/leader/dashboard" }, { label: "Initiatives", href: "/leader/initiatives" }, { label: "Groups", href: "/leader/groups" }, { label: "Reports", href: "/leader/initiatives/dsa-30/reports" }]
    : [{ label: "Dashboard", href: "/app/dashboard" }, { label: "Today's tasks", href: "/app/tasks" }, { label: "Initiatives", href: "/app/initiatives" }, { label: "Progress", href: "/app/progress" }, { label: "Leaderboard", href: "/app/leaderboard" }];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/32 px-4 pt-[12vh] backdrop-blur-sm" onMouseDown={onClose}>
      <div className="taskmesh-enter w-full max-w-xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_30px_100px_-30px_rgba(15,23,42,0.45)]" onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="Quick navigation">
        <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4">
          <Sparkles className="h-4 w-4 text-slate-500" />
          <input autoFocus className="min-w-0 flex-1 text-sm outline-none" placeholder="Jump to a page..." aria-label="Search pages" />
          <kbd className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-500">Esc</kbd>
        </div>
        <div className="p-2">
          <p className="px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Navigate</p>
          {items.map((item) => <Link key={item.href} href={item.href} onClick={onClose} className="flex items-center justify-between rounded-2xl px-3 py-3 text-sm text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"><span>{item.label}</span><ChevronRight className="h-4 w-4 text-slate-400" /></Link>)}
        </div>
      </div>
    </div>
  );
}

export function SurfaceGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-5 xl:grid-cols-12">{children}</div>;
}

export function HeroHeader({
  title,
  subtitle,
  actions
}: {
  title: string;
  subtitle: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
      <div className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">TaskMesh</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 md:text-5xl">{title}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 md:text-base">{subtitle}</p>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
