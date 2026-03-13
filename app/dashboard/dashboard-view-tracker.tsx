"use client";

import { useEffect } from "react";

import { postProductEvent } from "@/lib/product-events";

export function DashboardViewTracker() {
  useEffect(() => {
    void postProductEvent("dashboard_viewed").catch(() => {
      // Best-effort beta analytics should not block the page.
    });
  }, []);

  return null;
}
