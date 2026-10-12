"use client";

import { init } from "@plausible-analytics/tracker";
import { useEffect } from "react";

let initialized = false;

export default function PlausibleAnalytics() {
  useEffect(() => {
    if (
      initialized ||
      process.env.NODE_ENV !== "production" ||
      !["snupai.me", "www.snupai.me"].includes(window.location.hostname)
    ) {
      return;
    }

    init({
      domain: "snupai.me",
      endpoint: "https://visits.snupai.dev/api/event",
      autoCapturePageviews: true,
      bindToWindow: true,
      transformRequest: (request) => {
        const url = new URL(request.u);
        if (url.pathname === "/admin" || url.pathname.startsWith("/admin/")) {
          return null;
        }
        return request;
      },
    });
    initialized = true;
  }, []);

  return null;
}
