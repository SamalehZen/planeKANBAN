"use client";

import { useEffect, useState } from "react";
import { setGlobalAuthTokenGetter } from "@plane/services";
import { extractTokenFromUrl, getAdminToken, setAdminToken } from "@/utils/admin-token";

const initializeToken = () => {
  if (typeof window === "undefined") return;
  const urlToken = extractTokenFromUrl();
  if (urlToken) {
    setAdminToken(urlToken);
  }
  setGlobalAuthTokenGetter(getAdminToken);
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
