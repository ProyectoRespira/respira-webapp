export type FrontendRuntimeConfig = {
  backendUrl: string;
  regionDefaultId: string;
  siteUrl: string;
  gtag: string;
  contactMail: string;
  twitterHandle: string;
  twitterUrl: string;
  telegramChannel: string;
  telegramUrl: string;
  facebookPage: string;
  facebookUrl: string;
  instagramHandle: string;
  instagramUrl: string;
  githubPath: string;
  githubUrl: string;
  slackInvitePath: string;
  slackUrl: string;
  appStorePath: string;
  appStoreUrl: string;
  playStoreAppId: string;
  playStoreUrl: string;
};

export type PublicFrontendRuntimeConfig = Pick<
  FrontendRuntimeConfig,
  "backendUrl" | "regionDefaultId" | "siteUrl" | "gtag"
>;

export const normalizeSiteUrl = (value: string): string =>
  value.replace(/\/+$/, "");

const normalizePath = (value: string): string =>
  value.replace(/^\/+|\/+$/g, "");

const joinUrl = (base: string, path: string): string => {
  const normalizedBase = normalizeSiteUrl(base);
  const normalizedPath = normalizePath(path);
  return `${normalizedBase}/${normalizedPath}`;
};

export const getRequiredRuntimeEnv = (key: string): string => {
  const value = (process.env[key] || "").trim();
  if (!value) {
    throw new Error(`Missing runtime ${key} in frontend container.`);
  }
  return value;
};

const GTAG_PLACEHOLDER = "G-XXXXXXXXXX";
const GTAG_FORMAT = /^G-[A-Z0-9]+$/;

export const getOptionalGtag = (): string => {
  const gtag = (process.env.PUBLIC_GTAG || "").trim();
  if (!gtag || gtag === GTAG_PLACEHOLDER) {
    return "";
  }
  if (!GTAG_FORMAT.test(gtag)) {
    throw new Error(
      `Invalid PUBLIC_GTAG '${gtag}' in frontend container: must be a GA4 Measurement ID (G-XXXXXXXXXX format), or empty to disable analytics.`,
    );
  }
  return gtag;
};

export const getFrontendRuntimeConfig = (): FrontendRuntimeConfig => {
  const backendUrl = getRequiredRuntimeEnv("BACKEND_URL");
  const regionDefaultId = getRequiredRuntimeEnv("PUBLIC_REGION_DEFAULT_ID");
  const siteUrl = normalizeSiteUrl(getRequiredRuntimeEnv("SITE_URL"));
  const gtag = getOptionalGtag();
  const contactMail = getRequiredRuntimeEnv("CONTACT_MAIL");

  const twitterHandle = normalizePath(getRequiredRuntimeEnv("TWITTER_HANDLE"));
  const twitterUrl = joinUrl("https://twitter.com", twitterHandle);

  const telegramChannel = normalizePath(
    getRequiredRuntimeEnv("TELEGRAM_CHANNEL"),
  );
  const telegramUrl = joinUrl("https://t.me", telegramChannel);

  const facebookPage = normalizePath(getRequiredRuntimeEnv("FACEBOOK_PAGE"));
  const facebookUrl = joinUrl("https://www.facebook.com", facebookPage);

  const instagramHandle = normalizePath(
    getRequiredRuntimeEnv("INSTAGRAM_HANDLE"),
  );
  const instagramUrl = joinUrl("https://www.instagram.com", instagramHandle);

  const githubPath = normalizePath(getRequiredRuntimeEnv("GITHUB_PATH"));
  const githubUrl = joinUrl("https://github.com", githubPath);

  const slackInvitePath = normalizePath(
    getRequiredRuntimeEnv("SLACK_INVITE_PATH"),
  );
  const slackUrl = joinUrl("https://join.slack.com", slackInvitePath);

  const appStorePath = normalizePath(getRequiredRuntimeEnv("APP_STORE_PATH"));
  const appStoreUrl = joinUrl("https://apps.apple.com", appStorePath);

  const playStoreAppId = getRequiredRuntimeEnv("PLAY_STORE_APP_ID");
  const playStoreUrl =
    "https://play.google.com/store/apps/details?id=" +
    encodeURIComponent(playStoreAppId);

  return {
    backendUrl,
    regionDefaultId,
    siteUrl,
    gtag,
    contactMail,
    twitterHandle,
    twitterUrl,
    telegramChannel,
    telegramUrl,
    facebookPage,
    facebookUrl,
    instagramHandle,
    instagramUrl,
    githubPath,
    githubUrl,
    slackInvitePath,
    slackUrl,
    appStorePath,
    appStoreUrl,
    playStoreAppId,
    playStoreUrl,
  };
};

export const getPublicFrontendRuntimeConfig =
  (): PublicFrontendRuntimeConfig => {
    const { backendUrl, regionDefaultId, siteUrl, gtag } =
      getFrontendRuntimeConfig();
    return { backendUrl, regionDefaultId, siteUrl, gtag };
  };
