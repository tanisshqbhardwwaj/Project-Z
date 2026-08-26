"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

type LoadMoreTriggerProps = {
  hasMore: boolean;
  isLoading: boolean;
  onLoadMore: () => void;
  label?: string;
};

/** IntersectionObserver load-more with an accessible manual fallback button. */
export function LoadMoreTrigger({
  hasMore,
  isLoading,
  onLoadMore,
  label = "Load more",
}: LoadMoreTriggerProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasMore || isLoading) return;
    const node = sentinelRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onLoadMore();
      },
      { rootMargin: "200px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, isLoading, onLoadMore]);

  if (!hasMore && !isLoading) return null;

  return (
    <div className="flex flex-col items-center gap-2 py-4">
      <div ref={sentinelRef} className="h-1 w-full" aria-hidden />
      {isLoading ? (
        <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </span>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-xl"
          onClick={onLoadMore}
        >
          {label}
        </Button>
      )}
    </div>
  );
}
