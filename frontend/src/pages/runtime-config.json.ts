import type { APIRoute } from "astro";
import { getPublicFrontendRuntimeConfig } from "../runtime-env";

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
  try {
    const config = getPublicFrontendRuntimeConfig();

    return new Response(JSON.stringify(config), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...CACHE_HEADERS,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Invalid runtime config.";
    return errorResponse(message);
  }
};
