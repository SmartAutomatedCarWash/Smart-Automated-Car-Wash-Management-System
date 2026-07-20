"use client";

import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";

export type WorkspaceHeaderConfig = {
  toolbar?: ReactNode;
};

type WorkspaceHeaderContextValue = {
  setHeaderConfig: (config: WorkspaceHeaderConfig | null) => void;
};

const WorkspaceHeaderContext = createContext<WorkspaceHeaderContextValue | null>(null);

export function WorkspaceHeaderProvider({
  children,
  onConfigChange,
}: {
  children: ReactNode;
  onConfigChange: (config: WorkspaceHeaderConfig | null) => void;
}) {
  const value = useMemo<WorkspaceHeaderContextValue>(
    () => ({
      setHeaderConfig: onConfigChange,
    }),
    [onConfigChange],
  );

  return <WorkspaceHeaderContext.Provider value={value}>{children}</WorkspaceHeaderContext.Provider>;
}

export function useWorkspaceHeader(config: WorkspaceHeaderConfig | null) {
  const context = useContext(WorkspaceHeaderContext);

  useEffect(() => {
    if (!context) return;
    context.setHeaderConfig(config);

    return () => {
      context.setHeaderConfig(null);
    };
  }, [config, context]);
}
