/**
 * What the headers and menus need to know about the logged-in person. Computed on
 * the server (see toShellViewer) — only these fields are sent to the browser.
 */
export type ShellViewer = {
  name: string | null;
  phone: string;
  /** Experiences this person may switch to. Customers only ever have "customer". */
  access: { customer: true; business: boolean; admin: boolean };
} | null;

export type Experience = "customer" | "business" | "admin";

/** Icons are referenced by name so menus can be described on the server. */
export type IconName =
  | "home"
  | "search"
  | "calendar"
  | "user"
  | "sun"
  | "list"
  | "store"
  | "chart"
  | "users"
  | "star"
  | "more";

export type NavItem = {
  href: string;
  label: string;
  icon: IconName;
  /** The item is highlighted when the current path equals `href` or starts with one of these. */
  match?: string[];
};
