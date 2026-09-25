"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useState } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMapEvents } from "react-leaflet";
import type { MapPin } from "./map";

const ISLAMABAD: [number, number] = [33.6844, 73.0479];

function pinIcon(open = true) {
  return L.divIcon({
    className: "",
    html: `<div style="width:22px;height:22px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${open ? "#0f766e" : "#94a3b8"};border:3px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 22],
    popupAnchor: [0, -22],
  });
}

const tiles = (
  <TileLayer
    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
  />
);

export function MapInner({ pins, zoom = 12 }: { pins: MapPin[]; zoom?: number }) {
  const bounds = pins.length > 1 ? L.latLngBounds(pins.map((p) => [p.lat, p.lng])).pad(0.15) : undefined;
  const center: [number, number] = pins.length === 1 ? [pins[0].lat, pins[0].lng] : ISLAMABAD;
  return (
    <MapContainer
      center={center}
      zoom={pins.length === 1 ? 16 : zoom}
      bounds={bounds}
      scrollWheelZoom={false}
      className="h-full w-full rounded-2xl"
    >
      {tiles}
      {pins.map((p) => (
        <Marker key={p.id} position={[p.lat, p.lng]} icon={pinIcon(p.open)}>
          <Popup>
            {p.href ? (
              <a href={p.href} className="font-semibold">
                {p.label}
              </a>
            ) : (
              p.label
            )}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) });
  return null;
}

/** Form field: tap the map to drop the salon's pin. Submits as hidden `lat`/`lng` inputs. */
export function LocationPickerInner({ lat, lng }: { lat?: number | null; lng?: number | null }) {
  const [pos, setPos] = useState<[number, number] | null>(lat && lng ? [lat, lng] : null);
  return (
    <div className="h-64 w-full overflow-hidden rounded-2xl border border-slate-300">
      <MapContainer center={pos ?? ISLAMABAD} zoom={pos ? 16 : 12} className="h-full w-full">
        {tiles}
        <ClickHandler onPick={(a, b) => setPos([a, b])} />
        {pos && <Marker position={pos} icon={pinIcon()} />}
      </MapContainer>
      <input type="hidden" name="lat" value={pos?.[0] ?? ""} />
      <input type="hidden" name="lng" value={pos?.[1] ?? ""} />
    </div>
  );
}
