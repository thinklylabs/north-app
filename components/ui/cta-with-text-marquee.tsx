"use client";

import { cn } from "@/lib/utils";
import { ReactNode, useEffect, useRef } from "react";
import { Old_Standard_TT } from "next/font/google";

const oldStandard = Old_Standard_TT({ subsets: ["latin"], weight: "400" });

interface VerticalMarqueeProps {
  children: ReactNode;
  pauseOnHover?: boolean;
  reverse?: boolean;
  className?: string;
  speed?: number;
  onItemsRef?: (items: HTMLElement[]) => void;
}

function VerticalMarquee({
  children,
  pauseOnHover = false,
  reverse = false,
  className,
  speed = 30,
  onItemsRef,
}: VerticalMarqueeProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (onItemsRef && containerRef.current) {
      const items = Array.from(containerRef.current.querySelectorAll('.marquee-item')) as HTMLElement[];
      onItemsRef(items);
    }
  }, [onItemsRef]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "group flex flex-col overflow-hidden",
        className
      )}
      style={
        {
          "--duration": `${speed}s`,
        } as React.CSSProperties
      }
    >
      <div
        className={cn(
          "flex shrink-0 flex-col animate-marquee-vertical",
          reverse && "[animation-direction:reverse]",
          pauseOnHover && "group-hover:[animation-play-state:paused]"
        )}
      >
        {children}
      </div>
      <div
        className={cn(
          "flex shrink-0 flex-col animate-marquee-vertical",
          reverse && "[animation-direction:reverse]",
          pauseOnHover && "group-hover:[animation-play-state:paused]"
        )}
        aria-hidden="true"
      >
        {children}
      </div>
    </div>
  );
}

const marqueeItems = [
  "Content Agencies",
  "Founders & Execs",
  "Social Media Managers",
  "Content Marketers",
  "Growth Teams",
];

export default function CTAWithVerticalMarquee() {
  const marqueeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const marqueeContainer = marqueeRef.current;
    if (!marqueeContainer) return;

    const updateOpacity = () => {
      const items = marqueeContainer.querySelectorAll('.marquee-item');
      const containerRect = marqueeContainer.getBoundingClientRect();
      const centerY = containerRect.top + containerRect.height / 2;

      items.forEach((item) => {
        const itemRect = item.getBoundingClientRect();
        const itemCenterY = itemRect.top + itemRect.height / 2;
        const distance = Math.abs(centerY - itemCenterY);
        const maxDistance = containerRect.height / 2;
        const normalizedDistance = Math.min(distance / maxDistance, 1);
        const opacity = 1 - normalizedDistance * 0.75;
        (item as HTMLElement).style.opacity = opacity.toString();
      });
    };

    const animationFrame = () => {
      updateOpacity();
      requestAnimationFrame(animationFrame);
    };

    const frame = requestAnimationFrame(animationFrame);

    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <section className="bg-[#FCF9F5] py-16 md:py-32">
      <div className="mx-auto max-w-5xl px-6 md:px-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left Content */}
          <div className="space-y-8 max-w-xl">
            <h1 className={`${oldStandard.className} text-4xl font-semibold lg:text-5xl text-[#0D1717]`}>
              Get Started in Minutes
            </h1>
            <p className="mt-4 text-[#0D1717]/80">
              Start getting more distribution and ROI out of your content. Try
              Assembly for free for 14 days.
            </p>
            <div className="flex flex-wrap gap-3">
              <button className="px-6 py-3 bg-[#1DC6A1] hover:bg-[#1DC6A1]/90 text-[#0D1717] font-medium rounded-[10px]">
                START FREE TRIAL
              </button>
              <button className="px-6 py-3 border border-[#171717]/20 text-[#0D1717] hover:bg-[#F0ECE6] rounded-[10px]">
                BOOK A 15 MINUTE DEMO
              </button>
            </div>
          </div>

          {/* Right Marquee */}
          <div ref={marqueeRef} className="relative h-[400px] lg:h-[500px] flex items-center justify-center">
            <div className="relative w-full h-full">
              <VerticalMarquee speed={20} className="h-full">
                {marqueeItems.map((item, idx) => (
                  <div
                    key={idx}
                    className={`${oldStandard.className} text-3xl md:text-4xl lg:text-5xl font-light tracking-tight py-6 marquee-item text-[#0D1717]/60`}
                  >
                    {item}
                  </div>
                ))}
              </VerticalMarquee>
              
              {/* Top vignette */}
              <div className="pointer-events-none absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-[#FCF9F5] via-[#FCF9F5]/50 to-transparent"></div>
              
              {/* Bottom vignette */}
              <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#FCF9F5] via-[#FCF9F5]/50 to-transparent"></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
