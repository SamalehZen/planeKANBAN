"use client";

import { useEffect, useState } from "react";
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

initializeToken();

export function TokenProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    initializeToken();
    setIsReady(true);
  }, []);

  if (!isReady) {
    return null;
  }

  return <>{children}</>;
}
