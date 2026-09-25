import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { demoMode } from "@/lib/notify";
import { landingFor, viewerFor } from "@/lib/roles";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  const target = typeof next === "string" && next.startsWith("/") ? next : "/";
  const viewer = await viewerFor(await getUser());
  if (viewer) redirect(landingFor(viewer, target));
  return <LoginForm next={target} demo={demoMode()} />;
}
