"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { BuildIdentity } from "./build-identity";

type BuildSessionValue = {
  build: BuildIdentity | null;
  setBuild: (build: BuildIdentity | null) => void;
};

const BuildSessionContext = createContext<BuildSessionValue | null>(null);

export function BuildSessionProvider({ children }: { children: ReactNode }) {
  const [build, setBuild] = useState<BuildIdentity | null>(null);
  const value = useMemo(() => ({ build, setBuild }), [build]);
  return (
    <BuildSessionContext.Provider value={value}>
      {children}
    </BuildSessionContext.Provider>
  );
}

export function useBuildSession(): BuildSessionValue {
  const value = useContext(BuildSessionContext);
  if (!value) {
    throw new Error("Build session is missing from the application shell.");
  }
  return value;
}
