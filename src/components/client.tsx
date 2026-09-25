"use client";

import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useI18n } from "@/lib/i18n/client";
import { PinIcon } from "./icons";

export function SubmitButton({
  children,
  className = "btn-primary",
  confirm,
  disabled,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { confirm?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      {...rest}
      type="submit"
      disabled={pending || disabled}
      className={className}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {pending ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : null}
      {children}
    </button>
  );
}

/** Re-fetches the server component tree periodically — keeps queue positions live without websockets. */
export function AutoRefresh({ seconds = 15 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, seconds * 1000);
    const onVisible = () => document.visibilityState === "visible" && router.refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router, seconds]);
  return null;
}

/** Adds the visitor's coordinates to the URL so the server can sort salons by distance. */
export function NearMeButton() {
  const { t } = useI18n();
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  const [state, setState] = useState<"idle" | "locating" | "denied">("idle");
  const active = params.has("lat");

  function locate() {
    if (active) {
      const next = new URLSearchParams(params);
      next.delete("lat");
      next.delete("lng");
      router.push(`${path}?${next}`);
      return;
    }
    if (!navigator.geolocation) return setState("denied");
    setState("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = new URLSearchParams(params);
        next.set("lat", pos.coords.latitude.toFixed(4));
        next.set("lng", pos.coords.longitude.toFixed(4));
        setState("idle");
        router.push(`${path === "/" ? "/salons" : path}?${next}`);
      },
      () => setState("denied"),
      { timeout: 10_000, maximumAge: 300_000 },
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={locate} className={active ? "chip-active" : "chip"}>
        <PinIcon className="h-4 w-4" />
        {state === "locating" ? t.locating : t.nearMe}
      </button>
      {state === "denied" && <span className="text-xs text-slate-500">{t.locationDenied}</span>}
    </div>
  );
}

export function RegisterSWInner() {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
