"use client";

import { useLayoutEffect, useState } from "react";
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
  const [isInitialized, setIsInitialized] = useState(false);

  useLayoutEffect(() => {
    initializeToken();
    setIsInitialized(true);
  }, []);

  if (!isInitialized) {
    return null;
  }

  return <>{children}</>;
}
