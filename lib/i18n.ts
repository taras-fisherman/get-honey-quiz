import { ES, PT } from "./translations";

export type Lang = "en" | "es" | "pt";
export const LANGS: { id: Lang; label: string; name: string }[] = [
  { id: "en", label: "EN", name: "English" },
  { id: "es", label: "ES", name: "Español" },
  { id: "pt", label: "PT", name: "Português" },
];

const DICTS: Record<Lang, Record<string, string>> = { en: {}, es: ES, pt: PT };
let current: Lang = "en";
let ctx: Record<string, string> = {};

/** Set by the funnel on every render, before children render. */
export function setI18n(lang: Lang, vars: Record<string, string>) {
  current = lang;
  ctx = vars;
}
export const getLang = () => current;

/** Translate an English source string, then fill {placeholders}. Missing keys fall back to English. */
export function T(s?: string, vars?: Record<string, string | number>): string {
  if (!s) return "";
  let out = DICTS[current][s] ?? s;
  const all: Record<string, string | number> = { ...ctx, ...(vars || {}) };
  for (const [k, v] of Object.entries(all)) out = out.split(`{${k}}`).join(String(v));
  return out;
}

/** Same as T, but lets one English word have a different translation per question ("hair|Black"). */
export function TL(scope: string, s: string): string {
  const k = `${scope}|${s}`;
  return DICTS[current][k] !== undefined ? T(DICTS[current][k]) : T(s);
}

const STORE_KEY = "gh_lang";
const isLang = (x: string | null | undefined): x is Lang => x === "en" || x === "es" || x === "pt";

/** ?lang= in the link > the person's own earlier choice > browser language > English. */
export function detectLang(): { lang: Lang; source: "url" | "saved" | "browser" | "default" } {
  if (typeof window === "undefined") return { lang: "en", source: "default" };
  const fromUrl = new URLSearchParams(window.location.search).get("lang");
  if (isLang(fromUrl)) return { lang: fromUrl, source: "url" };
  try {
    const saved = window.localStorage.getItem(STORE_KEY);
    if (isLang(saved)) return { lang: saved, source: "saved" };
  } catch {}
  for (const l of navigator.languages || [navigator.language]) {
    const base = (l || "").slice(0, 2).toLowerCase();
    if (isLang(base)) return { lang: base, source: "browser" };
  }
  return { lang: "en", source: "default" };
}

export function saveLang(lang: Lang) {
  try { window.localStorage.setItem(STORE_KEY, lang); } catch {}
}
