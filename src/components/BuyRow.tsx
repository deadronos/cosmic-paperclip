import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/game/format";
import type Decimal from "break_eternity.js";

export default function BuyRow(props: {
  title: string;
  subtitle: string;
  count: number;
  cost: Decimal;
  disabled: boolean;
  onBuy: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border bg-background/40 p-3">
      <div>
        <div className="font-mono text-sm">{props.title}</div>
        <div className="mt-0.5 font-mono text-xs text-muted-foreground">
          {props.subtitle}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="outline">x{props.count}</Badge>
        <Button
          variant={props.disabled ? "outline" : "default"}
          disabled={props.disabled}
          onClick={props.onBuy}
        >
          Buy {formatNumber(props.cost)}
        </Button>
      </div>
    </div>
  );
}
