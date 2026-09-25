"use client";

import dynamic from "next/dynamic";

export type MapPin = { id: number; lat: number; lng: number; label: string; href?: string; open?: boolean };

/** Leaflet touches `window`, so it's loaded on the client only. */
export const SalonMap = dynamic(() => import("./map-inner").then((m) => m.MapInner), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse rounded-2xl bg-slate-200" />,
});

export const LocationPicker = dynamic(() => import("./map-inner").then((m) => m.LocationPickerInner), {
  ssr: false,
  loading: () => <div className="h-64 w-full animate-pulse rounded-2xl bg-slate-200" />,
});
