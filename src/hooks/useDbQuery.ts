import { useEffect, useRef, useState } from 'react';
import { subscribeDb } from '../services/dbEvents';

export function useDbQuery<T>(query: () => Promise<T>, deps: readonly unknown[]): { data: T | undefined; error: Error | null } {
  const queryRef = useRef(query);
  queryRef.current = query;
  const [state, setState] = useState<{ data: T | undefined; error: Error | null }>({ data: undefined, error: null });

  useEffect(() => {
    let active = true;
    const run = () => {
      void queryRef.current()
        .then((data) => {
          if (active) setState({ data, error: null });
        })
        .catch((error: unknown) => {
          if (active) setState((prev) => ({ data: prev.data, error: error instanceof Error ? error : new Error(String(error)) }));
        });
    };
    run();
    const unsubscribe = subscribeDb(() => {
      if (active) run();
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, deps);

  return state;
}
