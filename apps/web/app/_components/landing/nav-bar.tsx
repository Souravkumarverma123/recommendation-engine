"use client";

import { useState } from "react";
import Link from "next/link";
import { Github, Menu, X } from "lucide-react";

const NAV_LINKS = [
  { href: "#problem", label: "Problem" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#features", label: "Features" },
];

const GITHUB_URL = "https://github.com/Souravkumarverma123/recommendation-engine";

export function NavBar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-hairline bg-canvas/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2 text-[15px] font-medium text-ink">
          <span className="flex size-6 items-center justify-center rounded-sm bg-primary text-[11px] font-semibold text-white">
            IS
          </span>
          Standards Engine
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-body transition-colors hover:text-ink"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-body transition-colors hover:text-ink"
          >
            <Github className="size-4" />
            GitHub
          </a>
          <Link
            href="/dashboard"
            className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-[18px] text-sm font-medium text-white transition-colors hover:bg-primary-active"
          >
            Try it now
          </Link>
        </div>

        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
          className="flex size-9 items-center justify-center rounded-md text-ink md:hidden"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-hairline bg-canvas px-6 py-4 md:hidden">
          <nav className="flex flex-col gap-4">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="text-sm font-medium text-body"
              >
                {link.label}
              </a>
            ))}
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-body"
            >
              <Github className="size-4" />
              GitHub
            </a>
            <Link
              href="/dashboard"
              className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-[18px] text-sm font-medium text-white"
            >
              Try it now
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
