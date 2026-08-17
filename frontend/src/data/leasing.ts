import type { UIKey } from "../i18n/utils";

// Structure of the Sensor Leasing sections on /unete.
//
// Only keys and glyph names live here — every visible string comes from
// `i18n/ui.ts`, because the commercial copy is approved content that has to
// stay identical across the page, the FAQ and the sales material.

// Solid glyph paths drawn with `fill="currentColor"`, viewBox `0 0 24 24`.
// Same visual language as the icons already used on the home CTA and the FAQ.
export const GLYPHS = {
  sensor:
    "M12 2a5 5 0 0 0-5 5v6a5 5 0 0 0 10 0V7a5 5 0 0 0-5-5Zm7 11a7 7 0 0 1-6 6.93V22h-2v-2.07A7 7 0 0 1 5 13h2a5 5 0 0 0 10 0h2Z",
  chart:
    "M4 13c-1.1 0-2 .9-2 2v4c0 1.1.9 2 2 2s2-.9 2-2v-4c0-1.1-.9-2-2-2Zm8-9c-1.1 0-2 .9-2 2v13c0 1.1.9 2 2 2s2-.9 2-2V6c0-1.1-.9-2-2-2Zm8 5c-1.1 0-2 .9-2 2v9c0 1.1.9 2 2 2s2-.9 2-2v-9c0-1.1-.9-2-2-2Z",
  forecast:
    "M19.35 10.04A7.49 7.49 0 0 0 12 4a7.48 7.48 0 0 0-6.64 4.04A6 6 0 0 0 6 20h13a5 5 0 0 0 .35-9.96ZM14 13l-4 6v-4H8l4-6v4h2Z",
  phone:
    "M17 1H7a2 2 0 0 0-2 2v18a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2Zm0 18H7V5h10v14Z",
  bell: "M12 22a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22Zm7-6v-5a7 7 0 0 0-5.5-6.84V3.5a1.5 1.5 0 1 0-3 0v.66A7 7 0 0 0 5 11v5l-2 2v1h18v-1l-2-2Z",
  dashboard: "M3 3v18h18v-2H5V3H3Zm4 12h2v-4H7v4Zm4 0h2V7h-2v8Zm4 0h2v-6h-2v6Z",
  report:
    "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Zm-1 13v3h-2v-3H8l4-4 4 4h-3Z",
  wrench:
    "M22.7 19 13.6 9.9a5.99 5.99 0 0 0-7.7-7.6l3.4 3.4-2.1 2.1-3.5-3.4a6 6 0 0 0 7.7 7.7l9.1 9.1a.99.99 0 0 0 1.4 0l.8-.8a.99.99 0 0 0 0-1.4Z",
  school:
    "M12 3 1 9l11 6 9-4.91V17h2V9L12 3ZM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82Z",
  building:
    "M4 10v7h3v-7H4Zm6 0v7h3v-7h-3ZM2 22h19v-3H2v3Zm14-12v7h3v-7h-3Zm-4.5-9L2 6v2h19V6l-9.5-5Z",
  leaf: "M6.05 8.05c-2.73 2.73-2.73 7.15-.02 9.88 1.47-3.4 4.09-6.24 7.36-7.93-2.77 2.34-4.71 5.61-5.39 9.32 2.6 1.23 5.8.78 7.95-1.37C19.43 14.47 20 4 20 4S9.53 4.57 6.05 8.05Z",
  pin: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5Z",
  heart:
    "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35Z",
  home: "M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z",
  people:
    "M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3Zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3Zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13Zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5Z",
} satisfies Record<string, string>;

export type Glyph = keyof typeof GLYPHS;

// "¿Cuánto cuesta?" — the five steps that lead from the form to an installed
// sensor. Numbered because the order is the information.
export const PRICE_STEPS = [
  { titleKey: "join.price.step1.title", descKey: "join.price.step1.desc" },
  { titleKey: "join.price.step2.title", descKey: "join.price.step2.desc" },
  { titleKey: "join.price.step3.title", descKey: "join.price.step3.desc" },
  { titleKey: "join.price.step4.title", descKey: "join.price.step4.desc" },
  { titleKey: "join.price.step5.title", descKey: "join.price.step5.desc" },
] as const satisfies readonly { titleKey: UIKey; descKey: UIKey }[];

// "Qué incluye el servicio mensual" — the eight items of the subscription.
export const SERVICE_ITEMS = [
  { key: "join.includes.sensor", icon: "sensor" },
  { key: "join.includes.monitoring", icon: "chart" },
  { key: "join.includes.forecast", icon: "forecast" },
  { key: "join.includes.platform", icon: "phone" },
  { key: "join.includes.alerts", icon: "bell" },
  { key: "join.includes.dashboard", icon: "dashboard" },
  { key: "join.includes.report", icon: "report" },
  { key: "join.includes.support", icon: "wrench" },
] as const satisfies readonly { key: UIKey; icon: Glyph }[];

// "Beneficios según tu tipo de institución" — the five commercial segments.
export const SEGMENTS = [
  {
    titleKey: "join.segments.education.title",
    descKey: "join.segments.education.desc",
    icon: "school",
  },
  {
    titleKey: "join.segments.business.title",
    descKey: "join.segments.business.desc",
    icon: "building",
  },
  {
    titleKey: "join.segments.production.title",
    descKey: "join.segments.production.desc",
    icon: "leaf",
  },
  {
    titleKey: "join.segments.public.title",
    descKey: "join.segments.public.desc",
    icon: "pin",
  },
  {
    titleKey: "join.segments.families.title",
    descKey: "join.segments.families.desc",
    icon: "heart",
  },
] as const satisfies readonly {
  titleKey: UIKey;
  descKey: UIKey;
  icon: Glyph;
}[];

// Institution types offered on the form. Keys are stable and
// language-independent; the action validates against this list and the email
// template maps them to readable labels.
//
// These six mirror the list the "¿Cuánto cuesta?" section promises the form
// will ask for, so changing one means changing that copy too. They live here
// rather than in the action because the action builds the mail client on
// import, and the page must not pay for that just to render its radios.
export const INSTITUTION_TYPES = [
  "school",
  "university",
  "company",
  "municipality",
  "home",
  "community",
] as const;

export type InstitutionType = (typeof INSTITUTION_TYPES)[number];

export const INSTITUTION_TYPE_OPTIONS: readonly {
  value: InstitutionType;
  labelKey: UIKey;
  icon: Glyph;
}[] = [
  {
    value: "school",
    labelKey: "join.form.institutionType.school",
    icon: "school",
  },
  {
    value: "university",
    labelKey: "join.form.institutionType.university",
    icon: "school",
  },
  {
    value: "company",
    labelKey: "join.form.institutionType.company",
    icon: "building",
  },
  {
    value: "municipality",
    labelKey: "join.form.institutionType.municipality",
    icon: "pin",
  },
  { value: "home", labelKey: "join.form.institutionType.home", icon: "home" },
  {
    value: "community",
    labelKey: "join.form.institutionType.community",
    icon: "people",
  },
];
