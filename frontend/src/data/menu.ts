import { DEFAULT_LANG } from "../i18n/config";
import { ui } from "../i18n/ui";

export type StationDropdownRoute = {
  baseRoute: string;
};

export type MenuItem = {
  title: string;
  subtitle?: string;
  route: string | MenuItem[];
  /**
   * For a group (`route` is a list): the page that indexes its children, which
   * makes the group's own heading clickable. Optional because most footer
   * groups are labels over unrelated links, with no page of their own.
   */
  indexRoute?: string;
  id: string;
  type?: "route" | "modal";
};

export type MenuItemDropdown = {
  title: string;
  subtitle?: string;
  route: StationDropdownRoute;
  id: string;
  type?: "dropdown";
};

export const menu: (MenuItem | MenuItemDropdown)[] = [
  { title: "Recibir alertas", route: "/alertas", id: "alerts", type: "modal" },
  { title: "Contacto", route: "/contacto", id: "contact" },
  { title: "Sobre nosotros", route: "/nosotros", id: "us" },
  { title: "Recursos", route: "/recursos", id: "research" },
  {
    title: "Datos",
    route: { baseRoute: "/datos" },
    id: "data",
    type: "dropdown",
  },
  { title: "Únete a la red", route: "/unete", id: "join" },
];

/**
 * The public site's door into the private institutional area.
 *
 * A site-relative path on purpose: it resolves against whatever origin is
 * serving the page, so the same build points at localhost, demo or production
 * without a URL baked in anywhere. Kept out of `menu` so it can be rendered as
 * an access action rather than as another section of the site.
 *
 * `title` is read from the default-language dictionary instead of being written
 * here, so renaming the link is a one-line change in `i18n/ui.ts`: the navbar
 * already renders `t("nav.institution")`, and the Spanish-only guides render
 * this. Translated chrome should keep using `t()`; this is the label for pages
 * that don't go through i18n.
 */
// `as const` rather than a `MenuItem` annotation: `MenuItem.route` widens to
// `string | MenuItem[]`, which callers cannot hand straight to an `href`.
export const INSTITUTION_ACCESS = {
  title: ui[DEFAULT_LANG]["nav.institution"],
  route: "/institucion/login",
  id: "institution",
} as const satisfies MenuItem;

/** The two static User Guides (`pages/guias/`). */
export const GUIDE_ROUTES = {
  index: "/guias",
  institution: "/guias/instituciones",
  admin: "/guias/administradores",
} as const;

export const FOOTER_MENU: MenuItem[] = [
  {
    title: "Recursos",
    id: "resource-menu",
    route: [
      {
        title: "Mapa",
        route: "/",
        id: "map",
      },
      {
        title: "Investigaciones y recursos",
        route: "/recursos",
        id: "research",
      },
      {
        title: "Github",
        route: "/github",
        id: "github",
      },
    ],
  },
  {
    title: "El proyecto",
    id: "project-menu",
    route: [
      {
        title: "Sobre el proyecto",
        route: "/nosotros",
        id: "us",
      },
      {
        title: "Contacto",
        route: "/contacto",
        id: "contact",
      },
    ],
  },
  {
    title: "Acceso",
    id: "access-menu",
    route: [
      {
        title: "Panel institucional",
        route: INSTITUTION_ACCESS.route,
        id: "institution-login",
      },
    ],
  },
  // Named for the section, not for its audiences: "Guías de uso" is what the
  // footer has to say out loud, with the two guides under it as subsections.
  {
    title: "Guías de uso",
    id: "guides-menu",
    // The heading links to the index: otherwise `/guias` is unreachable from
    // the site, since the only other link to it lives inside the guides.
    indexRoute: GUIDE_ROUTES.index,
    route: [
      {
        title: "Para administradores",
        route: GUIDE_ROUTES.admin,
        id: "guide-admin",
      },
      {
        title: "Para instituciones",
        route: GUIDE_ROUTES.institution,
        id: "guide-institution",
      },
    ],
  },
];
