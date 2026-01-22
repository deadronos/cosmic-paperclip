import { cn } from "@/lib/utils";

type Props = {
  messages: string[];
  className?: string;
};

export default function Ticker({ messages, className }: Props) {
  const text =
    messages.length > 0
      ? messages.slice(0, 8).reverse().join("   •   ")
      : "No messages.";

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden border-b bg-card/60 backdrop-blur",
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-background via-transparent to-background opacity-80" />
      <div className="flex whitespace-nowrap py-2 font-mono text-xs text-muted-foreground">
        <div className="ticker flex min-w-full animate-[ticker_28s_linear_infinite] gap-10 px-6">
          <span>{text}</span>
          <span aria-hidden="true">{text}</span>
        </div>
      </div>
      <style>{`
        @keyframes ticker {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .ticker { animation: none !important; }
        }
      `}</style>
    </div>
  );
}

