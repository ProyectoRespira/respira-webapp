export const TWITTER_URL = "https://twitter.com/respirapy";
export const TELEGRAM_URL = "https://t.me/proyectorespira";
export const FACEBOOK_URL = "https://www.facebook.com/proyectorespirapy";
export const INSTAGRAM_URL = "https://www.instagram.com/proyectorespirapy";
export const CONTACT_MAIL = "proyectorespirapy@gmail.com";
export const GITHUB_URL = "https://github.com/ProyectoRespira";
export const SLACK_URL =
  "https://join.slack.com/t/proyecto-respira/shared_invite/zt-3zk63yu79-A4q_61CL8~E0vy~RHPZ3~Q";

export const APP_STORE_URL =
  "https://apps.apple.com/py/app/proyecto-respira/id6758864671?l=en-GB";
export const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=py.com.codium.respira";

export const AQI_RANGES: [number, number][] = [
  [0, 50],
  [51, 100],
  [101, 150],
  [151, 200],
  [201, 300],
  [301, 400],
];
export const AQI_COLORS: string[] = [
  "#AFFAAF",
  "#FFEB7F",
  "#FBC189",
  "#F27474",
  "#B179B6",
  "#98334F",
];

export const EXCLUDED_STATIONS: number[] = [101];

export const MAP_FALLBACK = {
  center: { longitude: -57.65, latitude: -25.28 },
  zoom: 10.5,
  minZoom: 5.5,
  maxBounds: [
    [-67.0435297482847, -28.42576579802394],
    [-45.05865460568049, -17.608237804262302],
  ] as [[number, number], [number, number]],
};

export const BACKEND_URL = import.meta.env.PUBLIC_BACKEND_URL;

export const BASE_URL = import.meta.env.SITE;

export const TELEGRAM_SHARE = `https://telegram.me/share/url?url=${encodeURIComponent(BASE_URL)}`;
export const TWITTER_SHARE = `https://twitter.com/share?text=${encodeURIComponent("Mira la calidad del aire en Asunción en..." + BASE_URL)}&url=${encodeURIComponent(BASE_URL)}`;
export const FACEBOOK_SHARE = `https://www.facebook.com/dialog/share?display=popup&href=${encodeURIComponent(BASE_URL)}&redirect_uri=${encodeURIComponent(BASE_URL)}`;
