import type { APIRoute } from "astro";

const CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

export const GET: APIRoute = () => {
  const backendUrl = (process.env.BACKEND_URL || "").trim();

  if (!backendUrl) {
    return new Response(
      JSON.stringify({
        error:
          "Missing runtime backend URL. Set BACKEND_URL in the frontend container.",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...CACHE_HEADERS,
        },
      },
    );
  }

  return new Response(JSON.stringify({ backendUrl }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      ...CACHE_HEADERS,
    },
  });
};
