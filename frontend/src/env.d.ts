/// <reference path="../.astro/types.d.ts" />
import "../.astro/types.d.ts";
/// <reference types="astro/client" />
/// <reference types="astro-integration-lottie/env" />

import type { Lang } from "./i18n/config";

declare global {
  namespace App {
    interface Locals {
      // Active language resolved per-request by the locale middleware.
      lang: Lang;
    }
  }
}
