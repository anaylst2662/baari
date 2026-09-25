/** "Step 2 of 4" with a bar and step names — used by booking and salon signup. */
export function StepProgress({ steps, current, label }: { steps: string[]; current: number; label: string }) {
  return (
    <div className="space-y-2" aria-label={label}>
      <p className="text-sm font-semibold text-slate-600">
        {label} <span className="num">{current + 1}</span> / <span className="num">{steps.length}</span> · {steps[current]}
      </p>
      <ol className="grid gap-1" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
        {steps.map((s, i) => (
          <li key={s} aria-current={i === current ? "step" : undefined}>
            <span className={`block h-2 rounded-full ${i <= current ? "bg-brand-600" : "bg-slate-200"}`} />
            <span className={`mt-1 hidden truncate text-xs sm:block ${i === current ? "font-bold text-slate-900" : "text-slate-500"}`}>{s}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
