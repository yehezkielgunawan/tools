import { useState } from 'react';

export function useLocalStorage<T>(
  key: string,
  initialValue: T,
): readonly [T, (value: T) => void] {
  const [value, setValue] = useState(initialValue);

  const setStoredValue = (nextValue: T): void => {
    setValue(nextValue);

    try {
      const serializedValue =
        typeof nextValue === 'string' ? nextValue : JSON.stringify(nextValue);
      window.localStorage.setItem(key, serializedValue);
    } catch {
      // The application still works when browser storage is unavailable.
    }
  };

  return [value, setStoredValue] as const;
}
