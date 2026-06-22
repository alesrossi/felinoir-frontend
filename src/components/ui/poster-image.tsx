"use client";

import { useState } from "react";
import { Film } from "lucide-react";

interface PosterImageProps {
  primary?: string;
  fallback?: string;
  alt: string;
  className?: string;
  placeholderClassName?: string;
  /** Mark the LCP candidate (e.g. first poster above the fold) to load it eagerly. */
  priority?: boolean;
}

/**
 * Renders a poster image with automatic fallback chain:
 *   primary (TMDb) → fallback (scraped) → Film icon placeholder
 * Handles broken URLs (404, network errors) silently on the client.
 */
export function PosterImage({
  primary,
  fallback,
  alt,
  className,
  placeholderClassName,
  priority,
}: PosterImageProps) {
  const [src, setSrc] = useState<string | undefined>(primary ?? fallback);
  const [showPlaceholder, setShowPlaceholder] = useState(!primary && !fallback);

  function handleError() {
    // If we were showing primary and there's a fallback, try it
    if (src === primary && fallback && fallback !== primary) {
      setSrc(fallback);
    } else {
      setShowPlaceholder(true);
    }
  }

  if (showPlaceholder) {
    return (
      <div className={`flex items-center justify-center ${placeholderClassName ?? className ?? ""}`}>
        <Film className="size-6 text-muted-foreground/20" />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      onError={handleError}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={priority ? "high" : "auto"}
    />
  );
}
