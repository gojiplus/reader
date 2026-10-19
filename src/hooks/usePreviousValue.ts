import { useRef, useEffect } from 'react';

const usePreviousValue = <T>(value: T): T | undefined => {
  const ref = useRef<T | undefined>(undefined);
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
};
export default usePreviousValue;
