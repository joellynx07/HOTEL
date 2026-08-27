/**
 * src/api/client.js
 * Thin fetch wrapper shared by every page/hook. Always sends the session
 * cookie (`credentials: 'include'`), always parses JSON, and throws a
 * normal Error with the server's message on non-2xx so callers can just
 * try/catch instead of checking res.ok everywhere.
 */

const API_BASE = import.meta.env.VITE_API_URL ?? ""; // "" -> same-origin, proxied by Vite in dev

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const body = isJson ? await res.json() : null;

  if (!res.ok) {
    throw new Error(body?.error ?? `Request failed with status ${res.status}`);
  }

  return body;
}

export const api = {
  get: (path) => request(path),
  post: (path, data) => request(path, { method: "POST", body: JSON.stringify(data) }),
  patch: (path, data) => request(path, { method: "PATCH", body: JSON.stringify(data) }),
  delete: (path) => request(path, { method: "DELETE" }),
};
