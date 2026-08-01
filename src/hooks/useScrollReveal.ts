"use client";

import { useEffect, useRef } from "react";

export function useScrollReveal<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Set initial hidden state on the container
    el.style.opacity = "0";
    el.style.transform = "translateY(30px)";
    el.style.transition =
      "opacity 0.9s cubic-bezier(0.4, 0, 0.2, 1), transform 0.9s cubic-bezier(0.4, 0, 0.2, 1)";

    // Hide stagger children initially
    const staggerChildren = el.querySelectorAll<HTMLElement>(
      "[data-reveal-delay]"
    );
    const containerDelay = parseInt(el.getAttribute("data-reveal-delay") || "0", 10);
    const isContainer = containerDelay > 0;

    staggerChildren.forEach((child) => {
      // Only hide children that aren't the container itself
      if (child === el) return;
      child.style.opacity = "0";
      child.style.transform = "translateY(24px)";
      child.style.transition =
        "opacity 0.7s cubic-bezier(0.4, 0, 0.2, 1), transform 0.7s cubic-bezier(0.4, 0, 0.2, 1)";
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const target = entry.target as HTMLElement;
            const delay = parseInt(
              target.getAttribute("data-reveal-delay") || "0",
              10
            );

            // Animate the container
            setTimeout(() => {
              target.style.opacity = "1";
              target.style.transform = "translateY(0)";
            }, delay);

            // Animate stagger children with individual delays
            const children = target.querySelectorAll<HTMLElement>(
              "[data-reveal-delay]"
            );
            children.forEach((child) => {
              const childDelay = parseInt(
                child.getAttribute("data-reveal-delay") || "0",
                10
              );
              if (child === target) return;
              setTimeout(() => {
                if (child.style.opacity === "0") {
                  child.style.opacity = "1";
                  child.style.transform = "translateY(0)";
                }
              }, childDelay);
            });

            observer.unobserve(target);
          }
        });
      },
      { threshold: 0.05, rootMargin: "0px 0px -40px 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return ref;
}
