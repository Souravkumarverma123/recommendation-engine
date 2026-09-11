"use client";

import { useEffect, useState } from "react";
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
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isTransparent = !scrolled && !open;

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-300 ${
        isTransparent
          ? "bg-transparent border-transparent"
          : "border-b border-hairline bg-canvas/80 backdrop-blur supports-[backdrop-filter]:bg-canvas/80"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-6">
        <Link
          href="/"
          className={`flex items-center gap-2 text-[15px] font-medium transition-colors ${
            isTransparent ? "text-white drop-shadow-sm" : "text-ink"
          }`}
        >
          <span
            className={`flex size-6 items-center justify-center rounded-sm text-[11px] font-semibold shadow-sm ${
              isTransparent ? "bg-white text-sky-700" : "bg-primary text-on-primary"
            }`}
          >
            IS
          </span>
          Standards Engine
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={`text-sm font-medium transition-colors ${
                isTransparent ? "text-white/90 hover:text-white" : "text-body hover:text-ink"
              }`}
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
            className={`inline-flex items-center gap-1.5 text-sm font-medium transition-colors ${
              isTransparent ? "text-white/90 hover:text-white" : "text-body hover:text-ink"
            }`}
          >
            <Github className="size-4" />
            GitHub
          </a>
          <Link
            href="/dashboard"
            className={`inline-flex h-10 items-center justify-center rounded-full px-[18px] text-sm font-semibold shadow-md transition-all hover:-translate-y-0.5 ${
              isTransparent
                ? "bg-white text-sky-700 hover:bg-white/90"
                : "bg-primary text-on-primary hover:bg-primary-active"
            }`}
          >
            Try it now
          </Link>
        </div>

        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
          className={`flex size-9 items-center justify-center rounded-md md:hidden transition-colors ${
            isTransparent ? "text-white" : "text-ink"
          }`}
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
              className="inline-flex h-10 items-center justify-center rounded-full bg-primary px-[18px] text-sm font-semibold text-on-primary"
            >
              Try it now
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
