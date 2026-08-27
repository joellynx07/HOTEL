/**
 * src/hooks/useGeolocation.js
 * Drives the "instantly ask for geolocation" behavior on the discovery feed.
 */

import { useCallback, useEffect, useState } from "react";
import { requestBrowserLocation } from "../lib/geo";

export function useGeolocation({ autoRequest = true } = {}) {
  const [state, setState] = useState({ phase: "idle" });

  const request = useCallback(async () => {
    setState({ phase: "requesting" });
    const outcome = await requestBrowserLocation();

    switch (outcome.status) {
      case "granted":
        setState({ phase: "granted", coords: outcome.coords });
        break;
      case "denied":
        setState({ phase: "denied" });
        break;
      case "unsupported":
        setState({ phase: "unsupported" });
        break;
      default:
        setState({ phase: "failed" });
    }
  }, []);

  useEffect(() => {
    if (autoRequest) request();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { state, request };
}
