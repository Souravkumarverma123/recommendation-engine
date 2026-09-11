import Link from "next/link";

const GITHUB_URL = "https://github.com/Souravkumarverma123/recommendation-engine";

type FooterLink = { label: string; href?: string; external?: boolean };

const COLUMNS: { title: string; links: FooterLink[] }[] = [
  {
    title: "Product",
    links: [
      { label: "How it works", href: "#how-it-works" },
      { label: "Features", href: "#features" },
      { label: "Try the tool", href: "/dashboard" },
    ],
  },
  {
    title: "Standards coverage",
    links: [
      { label: "Cement & concrete" },
      { label: "Structural steel" },
      { label: "Electronics & IT hardware" },
      { label: "PPE & helmets" },
      { label: "Furniture" },
    ],
  },
  {
    title: "Compliance",
    links: [
      { label: "GFR Rule 144" },
      { label: "BIS Act, 2016" },
      { label: "Quality Control Orders" },
    ],
  },
  {
    title: "Project",
    links: [{ label: "GitHub", href: GITHUB_URL, external: true }],
  },
];

function FooterColumn({ title, links }: { title: string; links: FooterLink[] }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.88px] text-muted-foreground">
        {title}
      </p>
      <ul className="mt-4 flex flex-col gap-3">
        {links.map((link) => (
          <li key={link.label} className="text-sm text-body">
            {link.href ? (
              link.external ? (
                <a
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="transition-colors hover:text-ink"
                >
                  {link.label}
                </a>
              ) : (
                <Link href={link.href} className="transition-colors hover:text-ink">
                  {link.label}
                </Link>
              )
            ) : (
              link.label
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-hairline bg-canvas px-6 py-16">
      <div className="mx-auto grid max-w-[1200px] gap-10 sm:grid-cols-2 lg:grid-cols-5">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-ink">
            <span className="flex size-6 items-center justify-center rounded-sm bg-primary text-[11px] font-semibold text-white">
              IS
            </span>
            Standards Engine
          </div>
          <p className="mt-3 text-sm leading-[1.5] text-body">
            SIH 2026 · Government procurement, made defensible.
          </p>
        </div>

        {COLUMNS.map((col) => (
          <FooterColumn key={col.title} title={col.title} links={col.links} />
        ))}
      </div>

      <div className="mx-auto mt-12 max-w-[1200px] border-t border-hairline-soft pt-6">
        <p className="text-xs leading-[1.4] text-muted-foreground">
          Standard numbers, titles, and QCO citations are sourced from the
          Bureau of Indian Standards and referenced ISO/IEC equivalents. Full
          standard text is not reproduced (BIS Act, 2016, s.11).
        </p>
      </div>
    </footer>
  );
}
