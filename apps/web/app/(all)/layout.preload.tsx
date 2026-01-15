"use client";

import { useEffect } from "react";
import ReactDOM from "react-dom";

const PRELOAD_URLS = [
  "/api/v1/instances/",
  "/api/v1/users/me/",
  "/api/v1/users/me/profile/",
  "/api/v1/users/me/settings/",
  "/api/v1/users/me/workspaces/",
];

export function PreloadResources() {
  useEffect(() => {
    PRELOAD_URLS.forEach((url) => {
      ReactDOM.preload(url, { as: "fetch", crossOrigin: "use-credentials" });
    });
  }, []);

  return null;
}
