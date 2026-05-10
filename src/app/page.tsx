'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/landing/Header';
import { RimBlobs, Starfield } from '@/components/landing/Decor';
import HeroText from '@/components/landing/HeroText';
import { HudLeft, HudRight } from '@/components/landing/Huds';
import PetroniusAvatar from '@/components/landing/PetroniusAvatar';
import CrewBench from '@/components/landing/CrewBench';
import SpeechBubble from '@/components/landing/SpeechBubble';
import PortalDock from '@/components/landing/PortalDock';
import CustomCursor from '@/components/landing/CustomCursor';
import { useScrollProgress } from '@/lib/landing/useScrollProgress';
import './landing.css';

/**
 * NID · Planeta — Landing.
 * Three acts driven by `useScrollProgress`:
 *   Act 1 (0–30%): Petronius hero, rim blobs, hero text.
 *   Act 2 (30–70%): bench reveals, speech bubble types, right HUD lights up.
 *   Act 3 (70–100%): portal dock rises with the warp-on-click transition.
 */
export default function NidPlanetaLanding() {
  const trackRef = useScrollProgress();
  const act2Live = useThresholdGate(0.2);

  return (
    <div className="landing-root">
      <CustomCursor />

      {/* Scroll track: stage is sticky, spacer below pushes scroll-height. */}
      <div className="landing-track" ref={trackRef}>
        <div className="landing-stage">
          <Starfield />
          <RimBlobs />
          <Header />
          <HudLeft />
          <HudRight mounted={act2Live} />

          <HeroText />

          <div className="stage-center">
            <PetroniusAvatar typing={act2Live} />
          </div>

          <CrewBench />
          <SpeechBubble visible={act2Live} />

          <PortalDock />
        </div>
        <div className="landing-spacer" />
      </div>
    </div>
  );
}

/**
 * Lazy-mount gate driven by the global `--p` CSS var. Returns `true` once
 * scroll progress crosses `threshold`, then sticks. Keeps the bench / right
 * HUD / speech bubble out of the DOM during Act 1.
 */
function useThresholdGate(threshold: number) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (open) return;
    const html = document.documentElement;
    const id = window.setInterval(() => {
      const p = parseFloat(html.style.getPropertyValue('--p') || '0');
      if (p > threshold) {
        setOpen(true);
        window.clearInterval(id);
      }
    }, 150);
    return () => window.clearInterval(id);
  }, [open, threshold]);
  return open;
}
