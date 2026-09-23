interface FlashcardProps {
  front: string
  back: string
  documentTitle: string
  isFlipped: boolean
  onFlip: () => void
}

export default function Flashcard({ front, back, documentTitle, isFlipped, onFlip }: FlashcardProps) {
  return (
    <div className="flashcard-scene h-full w-full" onClick={onFlip}>
      <div className={`flashcard-inner h-full w-full ${isFlipped ? 'flashcard-flipped' : ''}`}>
        <div className="flashcard-face">
          <span className="font-mono text-xs text-stone-muted">{documentTitle}</span>
          <p className="font-display text-xl text-stone-ink">{front}</p>
          <span className="font-body text-xs text-stone-muted">Click to reveal answer</span>
        </div>
        <div className="flashcard-face flashcard-back">
          <span className="font-mono text-xs text-stone-muted">{documentTitle}</span>
          <p className="font-body text-base text-stone-ink">{back}</p>
        </div>
      </div>
    </div>
  )
}
