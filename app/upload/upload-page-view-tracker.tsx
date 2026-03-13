"use client";

import { useEffect } from "react";

import { postProductEvent } from "@/lib/product-events";

export function UploadPageViewTracker() {
  useEffect(() => {
    void postProductEvent("upload_page_viewed").catch(() => {
      // Best-effort beta analytics should not block the page.
    });
  }, []);

  return null;
}
