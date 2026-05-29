import { normalizeSiteUrl } from "../runtime-env";

type RuntimeConfig = {
  backendUrl: string;
  regionDefaultId: string;
  siteUrl: string;
  gtag: string;
};

const getRequiredRuntimeConfigField = (
  config: Partial<RuntimeConfig>,
  key: keyof RuntimeConfig,
): string => {
  const value = config[key];
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Runtime config is missing required field '${key}'.`);
  }
  return value;
};

let runtimeConfigPromise: Promise<RuntimeConfig> | undefined;

const loadRuntimeConfig = async (): Promise<RuntimeConfig> => {
  const response = await fetch("/runtime-config.json", {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `Failed to load runtime config: ${response.status} ${response.statusText}`,
    );
  }

  const json = (await response.json()) as Partial<RuntimeConfig>;
  const backendUrl = getRequiredRuntimeConfigField(json, "backendUrl");
  const regionDefaultId = getRequiredRuntimeConfigField(
    json,
    "regionDefaultId",
  );
  const siteUrl = getRequiredRuntimeConfigField(json, "siteUrl");
  const gtag = getRequiredRuntimeConfigField(json, "gtag");

  return {
    backendUrl,
    regionDefaultId,
    siteUrl: normalizeSiteUrl(siteUrl),
    gtag,
  };
};

export const getRuntimeConfig = async (): Promise<RuntimeConfig> => {
  if (!runtimeConfigPromise) {
    runtimeConfigPromise = loadRuntimeConfig().catch((error) => {
      runtimeConfigPromise = undefined;
      console.error("Could not load runtime config", error);
      throw error;
    });
  }

  return runtimeConfigPromise;
};

export const getBackendUrl = async (): Promise<string> => {
  const config = await getRuntimeConfig();
  return config.backendUrl;
};

export const getRegionDefaultId = async (): Promise<string> => {
  const config = await getRuntimeConfig();
  return config.regionDefaultId;
};

export const getSiteUrl = async (): Promise<string> => {
  const config = await getRuntimeConfig();
  return config.siteUrl;
};

export const getGtag = async (): Promise<string> => {
  const config = await getRuntimeConfig();
  return config.gtag;
};
