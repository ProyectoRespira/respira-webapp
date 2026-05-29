import type { APIRoute } from "astro";

const CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

const errorResponse = (message: string) =>
  new Response(JSON.stringify({ error: message }), {
    status: 500,
    headers: { "Content-Type": "application/json", ...CACHE_HEADERS },
  });

export const GET: APIRoute = () => {
  const backendUrl = (process.env.BACKEND_URL || "").trim();
  const regionDefaultId = (process.env.PUBLIC_REGION_DEFAULT_ID || "").trim();

  if (!backendUrl) {
    return errorResponse(
      "Missing runtime backend URL. Set BACKEND_URL in the frontend container.",
    );
  }

  if (!regionDefaultId) {
    return errorResponse(
      "Missing runtime region default id. Set PUBLIC_REGION_DEFAULT_ID in the frontend container.",
    );
  }

  return new Response(JSON.stringify({ backendUrl, regionDefaultId }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      ...CACHE_HEADERS,
    },
  });
};
