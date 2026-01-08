"use client";

import { useEffect, useRef } from "react";
import { setGlobalAuthTokenGetter } from "@plane/services";
import { extractTokenFromUrl, getAuthToken, setAuthToken } from "./auth-token";

let isTokenInitialized = false;

const initializeTokenSync = () => {
  if (typeof window === "undefined" || isTokenInitialized) return;
  
  const urlToken = extractTokenFromUrl();
  if (urlToken) {
    setAuthToken(urlToken);
  }
  setGlobalAuthTokenGetter(getAuthToken);
  isTokenInitialized = true;
};

export function TokenProvider({ children }: { children: React.ReactNode }) {
  const hasInitialized = useRef(false);

  if (typeof window !== "undefined" && !hasInitialized.current) {
    initializeTokenSync();
    hasInitialized.current = true;
  }

  useEffect(() => {
    if (!hasInitialized.current) {
      initializeTokenSync();
      hasInitialized.current = true;
    }
  }, []);

  return <>{children}</>;
}
