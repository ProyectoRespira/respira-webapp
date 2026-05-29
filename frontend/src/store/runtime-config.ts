type RuntimeConfig = {
  backendUrl: string;
  regionDefaultId: string;
  siteUrl: string;
};

const normalizeSiteUrl = (value: string): string => value.replace(/\/+$/, "");

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
  if (!json.backendUrl || typeof json.backendUrl !== "string") {
    throw new Error("Runtime config is missing required field 'backendUrl'.");
  }
  if (!json.regionDefaultId || typeof json.regionDefaultId !== "string") {
    throw new Error(
      "Runtime config is missing required field 'regionDefaultId'.",
    );
  }
  if (!json.siteUrl || typeof json.siteUrl !== "string") {
    throw new Error("Runtime config is missing required field 'siteUrl'.");
  }

  return {
    backendUrl: json.backendUrl,
    regionDefaultId: json.regionDefaultId,
    siteUrl: normalizeSiteUrl(json.siteUrl),
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
