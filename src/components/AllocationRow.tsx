import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";

export default function AllocationRow(props: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="font-mono text-xs text-muted-foreground">{props.label}</div>
        <Badge variant="outline">{props.value}%</Badge>
      </div>
      <Slider
        value={[props.value]}
        max={100}
        step={1}
        onValueChange={(v) => props.onChange(v[0] ?? 0)}
      />
    </div>
  );
}
