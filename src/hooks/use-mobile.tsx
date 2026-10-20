import { useSyncExternalStore } from 'react';

const MOBILE_BREAKPOINT = 768;
const getSnapshot = () => window.innerWidth < MOBILE_BREAKPOINT;
const getServerSnapshot = () => undefined;

function subscribe(onChange: () => void) {
  window.addEventListener('resize', onChange);
  return () => window.removeEventListener('resize', onChange);
}

export function useIsMobile() {
  return useSyncExternalStore<boolean | undefined>(subscribe, getSnapshot, getServerSnapshot);
}
