import "server-only";
import { cookies } from "next/headers";
import { dictionaries, type Lang } from "./dict";

export const LANG_COOKIE = "lang";

export async function getLang(): Promise<Lang> {
  const value = (await cookies()).get(LANG_COOKIE)?.value;
  return value === "ur" ? "ur" : "en";
}

export async function getDict() {
  const lang = await getLang();
  return { lang, t: dictionaries[lang] };
}
