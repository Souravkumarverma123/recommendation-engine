import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { RecommendationSearch } from "~/app/_components/recommendation-search";

export default function RecommendPage() {
  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-50 border-b border-hairline bg-canvas/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center px-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-body transition-colors hover:text-ink"
          >
            <ArrowLeft className="size-4" />
            Standards Engine
          </Link>
        </div>
      </header>
      <main>
        <RecommendationSearch />
      </main>
    </div>
  );
}
