import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite ships a WASM build of Postgres that must not be bundled.
  serverExternalPackages: ["@electric-sql/pglite"],

  /** Old addresses (from earlier versions, WhatsApp messages and bookmarks) → new ones. */
  async redirects() {
    return [
      { source: "/salons", destination: "/search", permanent: true },
      { source: "/account", destination: "/profile", permanent: true },
      { source: "/s/:slug/book", destination: "/book/:slug", permanent: true },
      { source: "/partner", destination: "/business", permanent: true },
      { source: "/partner/new", destination: "/business/join", permanent: true },
      { source: "/partner/bookings", destination: "/business", permanent: true },
      { source: "/partner/:id(\\d+)", destination: "/business/:id", permanent: true },
      { source: "/partner/:id(\\d+)/bookings", destination: "/business/:id/bookings", permanent: true },
      { source: "/partner/:id(\\d+)/queue", destination: "/business/:id/queue", permanent: true },
      { source: "/partner/:id(\\d+)/services", destination: "/business/:id/salon/services", permanent: true },
      { source: "/partner/:id(\\d+)/staff", destination: "/business/:id/salon/staff", permanent: true },
      { source: "/partner/:id(\\d+)/:page(settings|profile)", destination: "/business/:id/salon", permanent: true },
    ];
  },
};

export default nextConfig;
