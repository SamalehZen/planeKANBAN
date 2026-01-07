"use client";

import { useEffect, useState } from "react";
import { setGlobalAuthTokenGetter } from "@plane/services";
import { extractTokenFromUrl, getAdminToken, setAdminToken } from "@/utils/admin-token";

let isInitialized = false;

const initializeAuthToken = () => {
  if (isInitialized) return;
  isInitialized = true;
  setGlobalAuthTokenGetter(getAdminToken);
};

export function TokenProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const urlToken = extractTokenFromUrl();
    if (urlToken) {
      setAdminToken(urlToken);
    }
    initializeAuthToken();
    setIsReady(true);
  }, []);

  if (!isReady) {
    return null;
  }

  return <>{children}</>;
}
