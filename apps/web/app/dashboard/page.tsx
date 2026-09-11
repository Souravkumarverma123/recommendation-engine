import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { RecommendationSearch } from "~/app/_components/recommendation-search";

export default function RecommendPage() {
  return (
    <div className="flex h-screen flex-col bg-canvas">
      <header className="z-50 flex h-14 shrink-0 items-center border-b border-hairline px-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-body transition-colors hover:text-ink"
        >
          <ArrowLeft className="size-4" />
          <span className="flex size-5 items-center justify-center rounded-sm bg-primary text-[10px] font-bold text-on-primary">
            IS
          </span>
          Standards Engine
        </Link>
      </header>
      <main className="flex-1 overflow-hidden">
        <RecommendationSearch />
      </main>
    </div>
  );
}
