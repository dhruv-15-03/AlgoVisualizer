// Test-only stub for the `virtual:pwa-register/react` module.
//
// That module is synthesised by vite-plugin-pwa during the app build, but the
// PWA plugin is not part of the Vitest transform pipeline (see vitest.config.ts),
// so the import would be unresolvable in unit tests. vitest.config.ts aliases
// `virtual:pwa-register/react` to this file so imports resolve; individual tests
// override the behaviour with `vi.mock('virtual:pwa-register/react', ...)`.
//
// The safe default returned here (no update waiting, offline not ready) means
// any component that renders this without an explicit mock simply shows nothing.
import type { Dispatch, SetStateAction } from 'react';

export interface RegisterSWOptions {
  immediate?: boolean;
  onNeedRefresh?: () => void;
  onOfflineReady?: () => void;
  onRegistered?: (registration: ServiceWorkerRegistration | undefined) => void;
  onRegisteredSW?: (
    swScriptUrl: string,
    registration: ServiceWorkerRegistration | undefined,
  ) => void;
  onRegisterError?: (error: unknown) => void;
}

export function useRegisterSW(_options?: RegisterSWOptions): {
  needRefresh: [boolean, Dispatch<SetStateAction<boolean>>];
  offlineReady: [boolean, Dispatch<SetStateAction<boolean>>];
  updateServiceWorker: (reloadPage?: boolean) => Promise<void>;
} {
  const noop = (() => {}) as Dispatch<SetStateAction<boolean>>;
  return {
    needRefresh: [false, noop],
    offlineReady: [false, noop],
    updateServiceWorker: async () => {},
  };
}
