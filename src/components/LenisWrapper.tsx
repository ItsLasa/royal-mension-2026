"use client";

import { ReactLenis } from "lenis/react";

interface LenisWrapperProps {
  children: React.ReactNode;
}

export default function LenisWrapper({ children }: LenisWrapperProps) {
  return (
    <ReactLenis
      root
      options={{
        duration: 1.4,
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        wheelMultiplier: 1,
        touchMultiplier: 1.5,
        smoothWheel: true,
      }}
    >
      {children}
    </ReactLenis>
  );
}
