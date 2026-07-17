type GtagCommand =
  | [command: "event", eventName: string, params?: Record<string, unknown>]
  | [command: "config", targetId: string, params?: Record<string, unknown>]
  | [command: "set", params: Record<string, unknown>]
  | [command: "js", date: Date];

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: GtagCommand) => void;
  }
}

export const trackEvent = (
  name: string,
  params: Record<string, unknown> = {},
): void => {
  if (typeof window === "undefined") return;

  if (typeof window.gtag !== "function") {
    // gtag.js only processes `arguments` objects pushed to dataLayer; plain
    // arrays are silently ignored. Queue through the standard stub instead.
    window.dataLayer = window.dataLayer ?? [];
    window.gtag = function gtag() {
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer?.push(arguments);
    };
  }

  window.gtag("event", name, params);
};

export const trackNavClick = (label: string, route: string): void => {
  trackEvent("nav_click", { nav_label: label, nav_route: route });
};
