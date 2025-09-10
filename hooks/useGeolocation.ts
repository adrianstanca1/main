import { useState, useCallback, useRef, useEffect } from 'react';

interface GeolocationState {
  loading: boolean;
  error: GeolocationPositionError | Error | null;
  data: GeolocationPosition | null;
}

export const useGeolocation = () => {
  const [state, setState] = useState<GeolocationState>({
    loading: false,
    error: null,
    data: null,
  });

  const watchId = useRef<number | null>(null);

  const getLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setState(prevState => ({ ...prevState, error: new Error("Geolocation is not supported by your browser.") }));
      return;
    }

    setState({ loading: true, error: null, data: null });
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          loading: false,
          error: null,
          data: position,
        });
      },
      (error) => {
        setState({
          loading: false,
          error,
          data: null,
        });
      },
      { enableHighAccuracy: true } // Request high accuracy for better data
    );
  }, []);

  const watchLocation = useCallback(() => {
    if (!navigator.geolocation) {
        setState(prevState => ({ ...prevState, error: new Error("Geolocation is not supported by your browser.") }));
        return;
    }

    setState(prevState => ({ ...prevState, loading: true }));

    watchId.current = navigator.geolocation.watchPosition(
        (position) => {
            setState({
                loading: false,
                error: null,
                data: position,
            });
        },
        (error) => {
            setState({
                loading: false,
                error,
                data: null,
            });
        },
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 }
    );
  }, []);

  const stopWatching = useCallback(() => {
      if (watchId.current !== null) {
          navigator.geolocation.clearWatch(watchId.current);
          watchId.current = null;
          setState(prevState => ({...prevState, loading: false}));
      }
  }, []);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
        stopWatching();
    }
  }, [stopWatching]);

  return { ...state, getLocation, watchLocation, stopWatching };
};