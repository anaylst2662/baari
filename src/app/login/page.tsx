import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { demoMode } from "@/lib/notify";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  const target = typeof next === "string" && next.startsWith("/") ? next : "/";
  if (await getUser()) redirect(target);
  return <LoginForm next={target} demo={demoMode()} />;
}
