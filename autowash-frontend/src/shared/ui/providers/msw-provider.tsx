"use client";

import React, { useEffect, useState } from "react";

export function MswProvider({ children }: { children: React.ReactNode }) {
  const [mswReady, setMswReady] = useState(false);

  useEffect(() => {
    async function startMocks() {
      if (
        process.env.NODE_ENV === "development" &&
        process.env.NEXT_PUBLIC_USE_MSW === "true"
      ) {
        try {
          // Dynamic import of MSW initializer to prevent loading in production bundles
          const { initMocks } = await import("@/mocks");
          await initMocks();
          console.log("[MSW Provider] Mocking system initialized.");
        } catch (error) {
          console.error("[MSW Provider] Failed to initialize mocks:", error);
        }
      }
      setMswReady(true);
    }

    startMocks();
  }, []);

  if (!mswReady && process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_USE_MSW === "true") {
    // Show a clean loading state while MSW is bootstrapping in development
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm font-medium text-muted-foreground">
            Bootstrapping Mock Service Worker...
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
