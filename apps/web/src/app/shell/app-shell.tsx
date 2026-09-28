"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Badge } from "../shared/badge";
import { statusBadgeTone } from "../shared/status-tone";
import { BuildSessionProvider, useBuildSession } from "./build-session";

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/build", label: "Build" },
  { href: "/build#passives", label: "Passives" },
  { href: "/build#gear", label: "Gear" },
  { href: "/build/crafting", label: "Crafting" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <BuildSessionProvider>
      <ShellFrame>{children}</ShellFrame>
    </BuildSessionProvider>
  );
}

function ShellFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { build } = useBuildSession();
  const [hash, setHash] = useState("");

  useEffect(() => {
    const readHash = () => setHash(window.location.hash);
    readHash();
    window.addEventListener("hashchange", readHash);
    return () => window.removeEventListener("hashchange", readHash);
  }, [pathname]);

  return (
    <div className="shell">
      <a className="skip-link" href="#content">
        Skip to content
      </a>
      <header className="shell-header">
        <div className="shell-bar">
          <Link className="brand" href="/">
            PoE2 Buddy
          </Link>
          <nav className="shell-nav" aria-label="Primary">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={
                  isCurrent(pathname, hash, item.href) ? "page" : undefined
                }
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="shell-build" aria-label="Current build">
          {build ? (
            <>
              <p className="shell-build-name">{build.name}</p>
              {build.detail ? <p>{build.detail}</p> : null}
              <p>Primary skill: {build.primarySkill}</p>
              <p>Source: {build.sourceLabel}</p>
              <p>
                Status:{" "}
                <Badge tone={statusBadgeTone(build.statusLabel)}>
                  {build.statusLabel}
                </Badge>
              </p>
            </>
          ) : (
            <p>No build loaded. Analyze a build to keep it visible here.</p>
          )}
        </div>
      </header>
      <div className="shell-main">
        <h1 className="page-title">{pageTitle(pathname, hash)}</h1>
        <div id="content">{children}</div>
      </div>
    </div>
  );
}

function isCurrent(pathname: string, hash: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  if (href === "/build/crafting") return pathname.startsWith("/build/crafting");
  if (href === "/build") {
    return pathname === "/build" && (hash === "" || hash === "#build");
  }
  return pathname === "/build" && hash === href.slice(href.indexOf("#"));
}

function pageTitle(pathname: string, hash: string): string {
  if (pathname.startsWith("/build/crafting")) return "Build / Crafting";
  if (pathname === "/build" && hash === "#passives") return "Build / Passives";
  if (pathname === "/build" && hash === "#gear") return "Build / Gear";
  return pathname === "/build" ? "Build" : "Dashboard";
}
