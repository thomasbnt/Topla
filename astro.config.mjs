import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import sitemap from "@astrojs/sitemap";
import { slugs } from "./src/i18n/translations.js";

const SITE = "https://topla.thomasbnt.dev";
const reverseSlugs = Object.fromEntries(Object.entries(slugs).map(([fr, en]) => [en, fr]));

// L'intégration sitemap ne sait apparier fr/en automatiquement que si le
// chemin est identique dans les deux langues (ex. /score <-> /en/score) —
// nos URLs anglaises sont traduites (/lettre -> /en/letter), donc les
// alternates hreflang sont calculés ici à la main via la map de slugs.
function alternatePaths(pathname) {
  const isEn = pathname === "/en" || pathname.startsWith("/en/");
  if (isEn) {
    const seg = pathname === "/en" ? "" : pathname.slice(4);
    const frSlug = seg ? reverseSlugs[seg] || seg : "";
    return { fr: frSlug ? `/${frSlug}` : "/", en: pathname };
  }
  const seg = pathname === "/" ? "" : pathname.slice(1);
  const enSlug = seg ? slugs[seg] || seg : "";
  return { fr: pathname, en: enSlug ? `/en/${enSlug}` : "/en" };
}

export default defineConfig({
  site: SITE,
  output: "static",
  adapter: cloudflare(),
  i18n: {
    defaultLocale: "fr",
    locales: ["fr", "en"],
    routing: {
      prefixDefaultLocale: false,
    },
  },
  integrations: [
    sitemap({
      filter: (page) => !page.endsWith("/settings"),
      serialize(item) {
        const alt = alternatePaths(new URL(item.url).pathname);
        return {
          ...item,
          links: [
            { lang: "fr-FR", url: `${SITE}${alt.fr}` },
            { lang: "en-US", url: `${SITE}${alt.en}` },
          ],
        };
      },
    }),
  ],
  build: {
    format: "file",
  },
});
