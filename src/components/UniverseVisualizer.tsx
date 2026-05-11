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
          <span className="flex items-center gap-1">
            {(() => {
              if (!probesUnlocked) return "Signal: idle";
              if (probesProp?.eq(0) ?? true) return "Signal: waiting";
              return (
                <>
                  <span>Probes: {Math.floor(probesProp.toNumber())}</span>
                  <span className="mx-1">|</span>
                  <span className="text-green-400 animate-pulse">Signal: active</span>
                </>
              );
            })()}
          </span>
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

  const probeCount = Math.min(50, Math.ceil(probes.div(10).toNumber()));
  s.probes = ensureProbes(probeCount, w, h, s.probes, probesUnlocked);
  updateProbeEntities(s.probes, w, h);

  if (probesUnlocked && probes.gt(0)) {
    const color = probeColor(allocation);
    for (const e of s.probes) {
      for (let i = 0; i < e.trail.length; i++) {
        const t = e.trail[i];
        const trailAlpha = ((i + 1) / e.trail.length) * 0.3;
        ctx.fillStyle = color.replace("0.9", trailAlpha.toFixed(2));
        ctx.beginPath();
        ctx.arc(t.x, t.y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = color.replace("0.9", "0.15");
      ctx.beginPath();
      ctx.arc(e.x, e.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = color.replace("0.9", "0.25");
      ctx.beginPath();
      ctx.arc(e.x, e.y, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(e.x, e.y, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
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

function probeColor(allocation: ProbeAllocation): string {
  if (allocation.replicate > 50) return "rgba(100,200,255,0.9)";
  if (allocation.harvest > 50) return "rgba(100,255,100,0.9)";
  if (allocation.manufacture > 50) return "rgba(255,200,50,0.9)";
  return "rgba(200,200,220,0.9)";
}

function ensureProbes(
  desired: number,
  w: number,
  h: number,
  current: ProbeEntity[],
  probesUnlocked: boolean
): ProbeEntity[] {
  const pad = 18;
  if (!probesUnlocked || desired <= 0) return [];

  let entities = current;
  while (entities.length < desired) {
    entities.push({
      x: pad + Math.random() * Math.max(1, w - pad * 2),
      y: pad + Math.random() * Math.max(1, h - pad * 2),
      vx: (Math.random() - 0.5) * 0.6,
      vy: (Math.random() - 0.5) * 0.6,
      trail: [],
      trailLen: 3 + Math.floor(Math.random() * 3)
    });
  }
  if (entities.length > desired) {
    entities = entities.slice(0, desired);
  }
  return entities;
}

function updateProbeEntities(
  entities: ProbeEntity[],
  w: number,
  h: number
): void {
  const pad = 18;
  for (const e of entities) {
    e.vx += (Math.random() - 0.5) * 0.04;
    e.vy += (Math.random() - 0.5) * 0.04;
    const maxSpeed = 0.8;
    const speed = Math.sqrt(e.vx * e.vx + e.vy * e.vy);
    if (speed > maxSpeed) {
      e.vx = (e.vx / speed) * maxSpeed;
      e.vy = (e.vy / speed) * maxSpeed;
    }

    e.x += e.vx;
    e.y += e.vy;

    if (e.x < pad) { e.x = pad; e.vx *= -1; }
    if (e.x > w - pad) { e.x = w - pad; e.vx *= -1; }
    if (e.y < pad) { e.y = pad; e.vy *= -1; }
    if (e.y > h - pad) { e.y = h - pad; e.vy *= -1; }

    e.trail.push({ x: e.x, y: e.y });
    if (e.trail.length > e.trailLen) e.trail.shift();
  }
}

