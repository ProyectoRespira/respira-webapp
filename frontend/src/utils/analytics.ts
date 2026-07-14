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

  if (typeof window.gtag === "function") {
    window.gtag("event", name, params);
    return;
  }

  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push(["event", name, params]);
};

export const trackNavClick = (label: string, route: string): void => {
  trackEvent("nav_click", { nav_label: label, nav_route: route });
};
