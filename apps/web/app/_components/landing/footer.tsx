import { Wordmark } from "~/app/_components/landing/hero";

export function Footer() {
  return (
    <footer className="border-t border-hairline bg-canvas">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-5 py-10 md:flex-row md:items-start md:justify-between md:px-8">
        <div className="max-w-xs">
          <Wordmark dark />
          <p className="mt-3 text-[13px] leading-[1.6] text-muted-foreground">
            Ranked Indian Standards for a procurement requirement, with
            verified certification status and audit-ready evidence.
          </p>
        </div>
        <div className="flex gap-10 text-[13px]">
          <div className="flex flex-col gap-2">
            <span className="font-medium text-ink">Product</span>
            <a href="#mechanism" className="text-muted-foreground hover:text-ink">
              How it works
            </a>
            <a href="#capabilities" className="text-muted-foreground hover:text-ink">
              What you get
            </a>
            <a href="#faq" className="text-muted-foreground hover:text-ink">
              FAQ
            </a>
          </div>
        </div>
      </div>
      <div className="border-t border-hairline px-5 py-5 md:px-8">
        <p className="mx-auto max-w-5xl text-[11.5px] text-muted-foreground">
          Standards are sourced from the Bureau of Indian Standards catalogue.
          Full standard text is not reproduced (BIS Act, 2016, s.11).
        </p>
      </div>
    </footer>
  );
}
