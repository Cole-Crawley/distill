interface QualityButtonsProps {
  onRate: (quality: number) => void
}

const QUALITY_LEVELS = [
  { value: 0, label: 'Blackout' },
  { value: 1, label: 'Wrong' },
  { value: 2, label: 'Barely' },
  { value: 3, label: 'Hard' },
  { value: 4, label: 'Good' },
  { value: 5, label: 'Easy' },
]

export default function QualityButtons({ onRate }: QualityButtonsProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="grid w-full grid-cols-6 gap-2">
        {QUALITY_LEVELS.map(level => (
          <button
            key={level.value}
            onClick={() => onRate(level.value)}
            className={[
              'flex flex-col items-center gap-0.5 rounded border px-2 py-2 font-body text-xs transition-colors duration-150',
              level.value < 3
                ? 'border-border-warm bg-cream text-stone-muted hover:bg-surface'
                : 'border-transparent bg-forest-light text-forest hover:bg-forest hover:text-cream',
            ].join(' ')}
          >
            <span className="font-mono text-[11px]">{level.value}</span>
            {level.label}
          </button>
        ))}
      </div>
      {/* Found in the researcher's own O5 pass (SS-2): the 0-5 keyboard shortcut worked all along
          but was never surfaced anywhere in the study session itself, so it went undiscovered. */}
      <p className="font-body text-xs text-stone-muted">Tip: press 0–5 on your keyboard to rate</p>
    </div>
  )
}
