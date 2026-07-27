"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { ResponsiveContainer } from "recharts";

type StableResponsiveContainerProps = {
  minHeight: number;
  children: ReactNode;
};

export function StableResponsiveContainer({ minHeight, children }: StableResponsiveContainerProps) {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const resizeFrameRef = useRef<number | null>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);

  useLayoutEffect(() => {
    const element = frameRef.current;
    if (!element) {
      return;
    }

    const update = () => {
      const width = Math.round(element.clientWidth);
      const height = Math.round(element.clientHeight);

      if (width <= 0 || height <= 0) {
        setSize(null);
        return;
      }

      setSize((current) => {
        if (current?.width === width && current.height === height) {
          return current;
        }
        return { width, height };
      });
    };

    const scheduleUpdate = () => {
      if (resizeFrameRef.current !== null) {
        cancelAnimationFrame(resizeFrameRef.current);
      }
      resizeFrameRef.current = requestAnimationFrame(() => {
        resizeFrameRef.current = null;
        update();
      });
    };

    scheduleUpdate();

    const observer = new ResizeObserver(() => scheduleUpdate());
    observer.observe(element);

    return () => {
      observer.disconnect();
      if (resizeFrameRef.current !== null) {
        cancelAnimationFrame(resizeFrameRef.current);
      }
    };
  }, []);

  return (
    <div ref={frameRef} className="h-full w-full min-w-0" style={{ minHeight }}>
      {size ? (
        <ResponsiveContainer width={size.width} height={size.height} minWidth={0} minHeight={minHeight}>
          {children}
        </ResponsiveContainer>
      ) : null}
    </div>
  );
}
