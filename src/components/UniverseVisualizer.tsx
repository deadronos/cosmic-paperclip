import * as React from "react";
import { STAGE_BY_ID } from "@/game/constants";
import type { StageId, ProbeAllocation } from "@/game/types";
import type Decimal from "break_eternity.js";
import { cn } from "@/lib/utils";
import { useAnimatedNumber } from "@/hooks";

type Props = {
  stageId: StageId;
  matterRemaining: Decimal;
  className?: string;
  probes?: Decimal;
  probesUnlocked?: boolean;
  allocation?: ProbeAllocation;
};

type Dot = { x: number; y: number; on: boolean; phase: number };
type Particle = { x: number; y: number; vx: number; vy: number; radius: number; alpha: number };
type ProbeEntity = { x: number; y: number; vx: number; vy: number; trail: { x: number; y: number }[]; trailLen: number };

type VizState = {
  stageId: StageId;
  dots: Dot[];
  onCount: number;
  particles: Particle[];
  probes: ProbeEntity[];
};

export default function UniverseVisualizer({
  stageId,
  matterRemaining,
  className,
  probes: probesProp,
  probesUnlocked = false,
  allocation = { replicate: 0, harvest: 0, manufacture: 0 }
}: Props) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const stateRef = React.useRef<VizState | null>(null);

  const [animatedMatter, setAnimatedMatter] = React.useState(matterRemaining);
  const onAnimatedMatterChange = React.useCallback((value: Decimal) => {
    setAnimatedMatter(value);
  }, []);

  useAnimatedNumber(matterRemaining, onAnimatedMatterChange);

  const inputsRef = React.useRef<{
    stageId: StageId;
    matterRemaining: Decimal;
    probes: Decimal;
    probesUnlocked: boolean;
    allocation: ProbeAllocation;
  }>({
    stageId,
    matterRemaining: animatedMatter,
    probes: probesProp ?? new Decimal(0),
    probesUnlocked,
    allocation
  });

  React.useEffect(() => {
    inputsRef.current = {
      stageId,
      matterRemaining: animatedMatter,
      probes: probesProp ?? new Decimal(0),
      probesUnlocked,
      allocation
    };
  }, [stageId, animatedMatter, probesProp, probesUnlocked, allocation]);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;

    const resize = () => {
      const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    const onResize = () => resize();
    window.addEventListener("resize", onResize);

    const loop = () => {
      raf = window.requestAnimationFrame(loop);
      const { stageId: sId, matterRemaining: m, probes: p, probesUnlocked: pu, allocation: a } = inputsRef.current;
      draw(ctx, canvas, sId, m, p, pu, a, stateRef);
    };
    raf = window.requestAnimationFrame(loop);

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <div className={cn("relative overflow-hidden rounded-lg border bg-card", className)}>
      <div className="pointer-events-none absolute inset-0 grid-ambient opacity-60" />
      <canvas ref={canvasRef} className="relative h-full w-full" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 border-t bg-background/40 px-4 py-2 backdrop-blur">
        <div className="flex items-center justify-between font-mono text-xs text-muted-foreground">
          <span>Universe Visualizer</span>
          <span>Signal: nominal</span>
        </div>
      </div>
    </div>
  );
}

function draw(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  stageId: StageId,
  matterRemaining: Decimal,
  probes: Decimal,
  probesUnlocked: boolean,
  allocation: ProbeAllocation,
  stateRef: React.MutableRefObject<VizState | null>
) {
  const stage = STAGE_BY_ID[stageId];
  const remainingFrac =
    stage.totalMatter <= 0
      ? 0
      : Math.max(0, Math.min(1, matterRemaining.div(stage.totalMatter).toNumber()));
  const consumed = 1 - remainingFrac;
  const w = canvas.getBoundingClientRect().width;
  const h = canvas.getBoundingClientRect().height;

  const dotCount =
    stageId === "lab"
      ? 900
      : stageId === "planetary"
        ? 1400
        : stageId === "space"
          ? 1900
          : 2600;

  const pCount = particleCount(stageId);
  const current = stateRef.current;
  if (!current || current.stageId !== stageId || current.dots.length !== dotCount || current.particles.length !== pCount) {
    const dots = createDots(dotCount, w, h);
    const particles = current && current.stageId === stageId && current.particles.length === pCount
      ? current.particles
      : createParticles(pCount, w, h);
    stateRef.current = { stageId, dots, onCount: current?.onCount ?? 0, particles, probes: current?.probes ?? [] };
  }

  const s = stateRef.current!;
  const targetOn = Math.max(0, Math.min(dotCount, Math.round(consumed * dotCount)));
  const delta = targetOn - s.onCount;
  if (delta !== 0) {
    const steps = Math.min(Math.abs(delta), 14);
    for (let i = 0; i < steps; i++) {
      const idx = Math.floor(Math.random() * s.dots.length);
      const d = s.dots[idx];
      if (delta > 0 && !d.on) {
        d.on = true;
        s.onCount++;
      } else if (delta < 0 && d.on) {
        d.on = false;
        s.onCount--;
      }
    }
  }

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "rgba(255,255,255,0.05)";
  ctx.fillRect(0, 0, w, h);

  const elapsed = performance.now() / 1000;
  const pad2 = 18;

  for (const p of s.particles) {
    p.x += p.vx;
    p.y += p.vy;
    if (p.x < pad2) p.x = w - pad2;
    if (p.x > w - pad2) p.x = pad2;
    if (p.y < pad2) p.y = h - pad2;
    if (p.y > h - pad2) p.y = pad2;

    ctx.fillStyle = `rgba(255,155,70,${p.alpha})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const d of s.dots) {
    if (d.on) {
      const pulseAlpha = 0.65 + Math.sin(elapsed * 2 + d.phase) * 0.15;
      ctx.fillStyle = `rgba(255,155,70,${pulseAlpha.toFixed(3)})`;
    } else {
      ctx.fillStyle = "rgba(160,170,185,0.18)";
    }
    ctx.fillRect(d.x, d.y, 2, 2);
  }

  ctx.strokeStyle = "rgba(255,155,70,0.12)";
  ctx.strokeRect(8, 8, w - 16, h - 16);
}

function createDots(count: number, w: number, h: number): Dot[] {
  const pad = 18;
  const dots: Dot[] = [];
  for (let i = 0; i < count; i++) {
    dots.push({
      x: pad + Math.random() * Math.max(1, w - pad * 2),
      y: pad + Math.random() * Math.max(1, h - pad * 2),
      on: false,
      phase: Math.random() * Math.PI * 2
    });
  }
  return dots;
}

function particleCount(stageId: StageId): number {
  return stageId === "lab" ? 75 : stageId === "planetary" ? 110 : stageId === "space" ? 150 : 200;
}

function createParticles(count: number, w: number, h: number): Particle[] {
  const pad = 18;
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    particles.push({
      x: pad + Math.random() * Math.max(1, w - pad * 2),
      y: pad + Math.random() * Math.max(1, h - pad * 2),
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      radius: 0.5 + Math.random() * 1,
      alpha: 0.06 + Math.random() * 0.06
    });
  }
  return particles;
}

