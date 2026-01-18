const ADMIN_TOKEN_KEY = "plane_admin_token";

interface TokenPayload {
  user_id: string;
  exp: number;
  type: string;
}

const parseToken = (token: string): TokenPayload | null => {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const payloadB64 = parts[0];
    let padding = 4 - (payloadB64.length % 4);
    if (padding === 4) padding = 0;
    const paddedPayload = payloadB64 + (padding > 0 ? new Array(padding + 1).join("=") : "");
    const payloadJson = atob(paddedPayload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(payloadJson);
  } catch {
    return null;
  }
};

const isTokenValid = (token: string): boolean => {
  const payload = parseToken(token);
  if (!payload) return false;
  if (payload.type !== "admin_auth") return false;
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp < now) return false;
  return true;
};

export const getAdminToken = (): string | null => {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem(ADMIN_TOKEN_KEY);
  if (!token) return null;
  if (!isTokenValid(token)) {
    console.warn("[Admin Token] Token expired or invalid, removing from storage");
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    return null;
  }
  return token;
};

export const setAdminToken = (token: string): void => {
  if (typeof window === "undefined") return;
  if (!isTokenValid(token)) {
    console.warn("[Admin Token] Attempted to store invalid token, ignoring");
    return;
  }
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
};

export const removeAdminToken = (): void => {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ADMIN_TOKEN_KEY);
};

export const hasValidToken = (): boolean => {
  return getAdminToken() !== null;
};

export const extractTokenFromUrl = (): string | null => {
  if (typeof window === "undefined") return null;
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get("auth_token");
  if (token) {
    urlParams.delete("auth_token");
    const newSearch = urlParams.toString();
    const newUrl = window.location.pathname + (newSearch ? `?${newSearch}` : "");
    window.history.replaceState({}, "", newUrl);
  }
  return token;
};
