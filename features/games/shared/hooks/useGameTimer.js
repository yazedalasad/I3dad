import { useCallback, useEffect, useRef, useState } from 'react';

export function useGameTimer(autoStart = true, intervalMs = 1000) {
  const [elapsedMs, setElapsedMs] = useState(0);
  const [isRunning, setIsRunning] = useState(autoStart);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!isRunning) return undefined;

    intervalRef.current = setInterval(() => {
      setElapsedMs((prev) => prev + intervalMs);
    }, intervalMs);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, intervalMs]);

  const start = useCallback(() => setIsRunning(true), []);
  const pause = useCallback(() => setIsRunning(false), []);
  const reset = useCallback(() => setElapsedMs(0), []);
  const restart = useCallback(() => {
    setElapsedMs(0);
    setIsRunning(true);
  }, []);

  return {
    elapsedMs,
    seconds: Math.floor(elapsedMs / 1000),
    isRunning,
    start,
    pause,
    reset,
    restart,
  };
}
