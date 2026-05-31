"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ASCII_VARIANTS,
  DEFAULT_VARIANT,
  isAsciiVariant,
  type AsciiVariant,
} from "~/components/ascii/variants";

const STORAGE_KEY = "snupai:ascii-variant";

interface AsciiBackgroundValue {
  variant: AsciiVariant;
  setVariant: (variant: AsciiVariant) => void;
  cycleVariant: () => void;
}

const AsciiBackgroundContext = createContext<AsciiBackgroundValue | null>(null);

/**
 * Holds the currently selected ASCII background variant and shares it between
 * the backdrop (`SiteBackground`) and the switcher control. The choice is a
 * lightweight UI preference, so it is persisted to localStorage and restored
 * after hydration. SSR always renders the default variant to avoid mismatches.
 */
export function AsciiBackgroundProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [variant, setVariantState] = useState<AsciiVariant>(DEFAULT_VARIANT);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (isAsciiVariant(stored)) {
        setVariantState(stored);
      }
    } catch {
      // Ignore storage access errors (e.g. privacy mode) and keep the default.
    }
  }, []);

  const setVariant = useCallback((next: AsciiVariant) => {
    setVariantState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Persistence is best-effort; the in-memory choice still applies.
    }
  }, []);

  const cycleVariant = useCallback(() => {
    setVariantState((current) => {
      const index = ASCII_VARIANTS.findIndex((v) => v.key === current);
      const next =
        ASCII_VARIANTS[(index + 1) % ASCII_VARIANTS.length]?.key ??
        DEFAULT_VARIANT;
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // Best-effort persistence.
      }
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ variant, setVariant, cycleVariant }),
    [variant, setVariant, cycleVariant],
  );

  return (
    <AsciiBackgroundContext.Provider value={value}>
      {children}
    </AsciiBackgroundContext.Provider>
  );
}

export function useAsciiBackground(): AsciiBackgroundValue {
  const context = useContext(AsciiBackgroundContext);
  if (!context) {
    throw new Error(
      "useAsciiBackground must be used within an AsciiBackgroundProvider",
    );
  }
  return context;
}
