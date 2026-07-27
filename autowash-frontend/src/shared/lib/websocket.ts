const DEFAULT_API_URL = "http://localhost:8080/api/v1";

export function resolveSockJsUrl() {
  const explicitUrl = process.env.NEXT_PUBLIC_WS_URL?.trim();
  if (explicitUrl) {
    return explicitUrl;
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL?.trim() || DEFAULT_API_URL;

  try {
    const parsed = new URL(apiUrl);
    parsed.pathname = "/ws";
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString();
  } catch {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/ws`;
    }
    return "http://localhost:8080/ws";
  }
}
