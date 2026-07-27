"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ResponsiveContainer } from "recharts";

type StableResponsiveContainerProps = {
  minHeight: number;
  children: ReactNode;
};

export function StableResponsiveContainer({ minHeight, children }: StableResponsiveContainerProps) {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const element = frameRef.current;
    if (!element) {
      return;
    }

    const update = () => {
      const nextReady = element.clientWidth > 0 && element.clientHeight > 0;
      setReady(nextReady);
    };

    update();

    const observer = new ResizeObserver(() => update());
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={frameRef} className="h-full w-full min-w-0" style={{ minHeight }}>
      {ready ? (
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={minHeight}>
          {children}
        </ResponsiveContainer>
      ) : null}
    </div>
  );
}
