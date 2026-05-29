export type FrontendRuntimeConfig = {
  backendUrl: string;
  regionDefaultId: string;
  siteUrl: string;
  gtag: string;
};

export const normalizeSiteUrl = (value: string): string =>
  value.replace(/\/+$/, "");

export const getRequiredRuntimeEnv = (key: string): string => {
  const value = (process.env[key] || "").trim();
  if (!value) {
    throw new Error(`Missing runtime ${key} in frontend container.`);
  }
  return value;
};

export const getFrontendRuntimeConfig = (): FrontendRuntimeConfig => {
  const backendUrl = getRequiredRuntimeEnv("BACKEND_URL");
  const regionDefaultId = getRequiredRuntimeEnv("PUBLIC_REGION_DEFAULT_ID");
  const siteUrl = normalizeSiteUrl(getRequiredRuntimeEnv("SITE_URL"));
  const gtag = getRequiredRuntimeEnv("PUBLIC_GTAG");

  return {
    backendUrl,
    regionDefaultId,
    siteUrl,
    gtag,
  };
};
