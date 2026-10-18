export type GalleryTheme = "dark" | "light";

const defaultTheme: GalleryTheme = "dark";
const themeClasses: Record<GalleryTheme, string> = {
  dark: "theme-dark",
  light: "theme-light",
};

export function resolveTheme(search: string): GalleryTheme {
  const requested = new URLSearchParams(search).get("theme");
  return requested === "light" ? "light" : defaultTheme;
}

export function themeHref(theme: GalleryTheme, storyId: string | null): string {
  const story = storyId === null ? "" : `story=${encodeURIComponent(storyId)}&`;
  return `?${story}theme=${theme}`;
}

export function applyTheme(theme: GalleryTheme): void {
  document.body.className = themeClasses[theme];
}
