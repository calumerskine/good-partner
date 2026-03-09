import { useCallback, useRef } from "react";

/**
 * Hook that throttles a function to prevent it from being called more frequently than specified delay
 * @param fn - The function to throttle
 * @param delay - The minimum time (in milliseconds) between function calls
 * @returns A throttled version of the function
 */
export function useThrottle<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): T {
  const lastExecution = useRef(0);

  const throttledFn = useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastExecution.current >= delay) {
        lastExecution.current = now;
        return fn(...args);
      }
    },
    [fn, delay]
  );

  return throttledFn as T;
}
