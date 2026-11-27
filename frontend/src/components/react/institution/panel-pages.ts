// The panel's pages (#338). Each menu entry shows only its own section; the
// active one lives in the URL hash so it can be linked to and Back walks
// through the pages visited.
//
// Equipo is not here yet (#340): it has no API behind it.

import type { InstitutionCopyKey } from "../../../i18n/institution";

export const PANEL_PAGES = [
  "resumen",
  "analisis",
  "bitacora",
  "alertas",
  "descargas",
] as const;

export type PanelPage = (typeof PANEL_PAGES)[number];

export const PAGE_TITLE: Record<PanelPage, InstitutionCopyKey> = {
  resumen: "navSummary",
  analisis: "navAnalysis",
  bitacora: "navLog",
  alertas: "navAlerts",
  descargas: "navDownloads",
};

/** The page a hash names, falling back to the summary for anything else. */
export const pageFromHash = (hash: string): PanelPage => {
  const id = hash.replace(/^#/, "");
  return (PANEL_PAGES as readonly string[]).includes(id)
    ? (id as PanelPage)
    : "resumen";
};
