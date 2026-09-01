export type StationDropdownRoute = {
  baseRoute: string;
};

export type MenuItem = {
  title: string;
  subtitle?: string;
  route: string | MenuItem[];
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
 */
// `as const` rather than a `MenuItem` annotation: `MenuItem.route` widens to
// `string | MenuItem[]`, which callers cannot hand straight to an `href`.
export const INSTITUTION_ACCESS = {
  title: "Acceso institucional",
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
