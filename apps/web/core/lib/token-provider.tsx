"use client";

import { useEffect } from "react";
import { setGlobalAuthTokenGetter } from "@plane/services";
import { extractTokenFromUrl, getAuthToken, setAuthToken } from "./auth-token";

const initializeToken = () => {
  if (typeof window === "undefined") return;
  const urlToken = extractTokenFromUrl();
  if (urlToken) {
    setAuthToken(urlToken);
  }
  setGlobalAuthTokenGetter(getAuthToken);
};

export function TokenProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initializeToken();
  }, []);

  return <>{children}</>;
}
