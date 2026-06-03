"use client";

import { useState, useCallback } from "react";

export interface GeolocationState {
  loading: boolean;
  coords: [number, number] | null; // [lat, lng]
  error: string | null;
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    loading: false,
    coords: null,
    error: null,
  });

  const request = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setState({ loading: false, coords: null, error: "Geolocation not supported." });
      return;
    }
    setState((s) => ({ ...s, loading: true, error: null }));
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setState({
          loading: false,
          coords: [pos.coords.latitude, pos.coords.longitude],
          error: null,
        });
      },
      (err) => {
        setState({ loading: false, coords: null, error: err.message });
      },
      { timeout: 10_000, maximumAge: 60_000 }
    );
  }, []);

  return { ...state, request };
}
