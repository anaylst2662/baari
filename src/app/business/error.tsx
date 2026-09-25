"use client";

import { PageError } from "@/experiences/shared/states";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <PageError reset={reset} homeHref="/business" />;
}
