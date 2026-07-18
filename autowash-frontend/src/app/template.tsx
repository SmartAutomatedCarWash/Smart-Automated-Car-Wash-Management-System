"use client";

import type { ReactNode } from "react";

export default function Template({ children }: { children: ReactNode }) {
  return (
    <div className="animate-fade-in-up w-full h-full flex flex-col flex-1">
      {children}
    </div>
  );
}
