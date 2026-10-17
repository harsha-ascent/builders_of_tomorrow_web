export const PALETTE = ['#ff6b6b', '#ffd93d', '#4cc9f0', '#6bcb77', '#845ec2', '#ff9f43', '#ffffff', '#1e2a4a']

export function ColorSwatches({ label, value, onChange }: { label: string; value: string; onChange: (c: string) => void }) {
  return (
    <div>
      <span className="label">{label}</span>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={label}>
        {PALETTE.map((c) => (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={value === c}
            aria-label={c}
            onClick={() => onChange(c)}
            style={{ backgroundColor: c }}
            className={`h-9 w-9 rounded-full border-4 transition hover:scale-110 ${
              value === c ? 'border-ink scale-110' : 'border-white shadow'
            }`}
          />
        ))}
      </div>
    </div>
  )
}
