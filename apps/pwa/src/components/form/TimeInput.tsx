interface TimeInputProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
}

export default function TimeInput({ label, value, onChange }: TimeInputProps) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 rounded-lg border border-input bg-background px-3 text-2xl font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />
    </label>
  );
}
