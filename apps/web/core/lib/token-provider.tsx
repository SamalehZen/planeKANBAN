"use client";

import { useEffect, useState } from "react";
import { setGlobalAuthTokenGetter } from "@plane/services";
import { extractTokenFromUrl, getAuthToken, setAuthToken } from "./auth-token";

let isInitialized = false;

const initializeAuthToken = () => {
  if (isInitialized) return;
  isInitialized = true;
  setGlobalAuthTokenGetter(getAuthToken);
};

export function TokenProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const urlToken = extractTokenFromUrl();
    if (urlToken) {
      setAuthToken(urlToken);
    }
    initializeAuthToken();
    setIsReady(true);
  }, []);

  if (!isReady) {
    return null;
  }

  return <>{children}</>;
}
