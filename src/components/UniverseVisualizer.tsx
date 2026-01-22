import * as React from "react";
import { STAGE_BY_ID } from "@/game/constants";
import type { StageId } from "@/game/types";
import { cn } from "@/lib/utils";

type Props = {
  stageId: StageId;
  matterRemaining: number;
  className?: string;
};

type Dot = { x: number; y: number; on: boolean };

export default function UniverseVisualizer({ stageId, matterRemaining, className }: Props) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const stateRef = React.useRef<{ stageId: StageId; dots: Dot[]; onCount: number } | null>(
    null
  );

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
      draw(ctx, canvas, stageId, matterRemaining, stateRef);
    };
    raf = window.requestAnimationFrame(loop);

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, [stageId, matterRemaining]);

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
  matterRemaining: number,
  stateRef: React.MutableRefObject<{ stageId: StageId; dots: Dot[]; onCount: number } | null>
) {
  const stage = STAGE_BY_ID[stageId];
  const consumed = stage.totalMatter <= 0 ? 1 : 1 - matterRemaining / stage.totalMatter;
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

  const current = stateRef.current;
  if (!current || current.stageId !== stageId || current.dots.length !== dotCount) {
    const dots = createDots(dotCount, w, h);
    stateRef.current = { stageId, dots, onCount: 0 };
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

  for (const d of s.dots) {
    ctx.fillStyle = d.on ? "rgba(255,155,70,0.85)" : "rgba(160,170,185,0.18)";
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
      on: false
    });
  }
  return dots;
}

