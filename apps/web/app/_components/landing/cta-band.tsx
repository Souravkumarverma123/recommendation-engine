import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function CtaBand() {
  return (
    <section className="border-t border-hairline bg-canvas px-6 py-24">
      <div className="mx-auto flex max-w-[720px] flex-col items-center text-center">
        <h2 className="text-[32px] font-normal leading-[1.2] tracking-[-0.72px] text-ink sm:text-[36px]">
          Stop guessing which standard applies.
        </h2>
        <p className="mt-4 text-base leading-[1.5] text-body">
          Paste your next procurement requirement and see the ranked
          standards, the regulatory badge, and the draft clause in seconds.
        </p>
        <Link
          href="/dashboard"
          className="mt-8 inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-6 text-[15px] font-medium text-white transition-colors hover:bg-primary-active"
        >
          Try the recommendation engine
          <ArrowRight className="size-4" />
        </Link>
      </div>
    </section>
  );
}
