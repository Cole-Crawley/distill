import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Typewriter } from '../components/ui/typewriter-text'
import Button from '../components/Button'
import { openBlankNote } from '../lib/notes'

const TAGLINES = [
  'Turn anything you read into something you remember.',
  'AI-powered spaced repetition.',
  'Your knowledge, connected.',
]

export default function HomePage() {
  const navigate = useNavigate()
  const [starting, setStarting] = useState(false)

  async function handleGetStarted() {
    setStarting(true)
    const id = await openBlankNote()
    navigate(`/notes/${id}`)
  }

  return (
    <div className="bg-cream min-h-screen flex flex-col items-center justify-center gap-6 text-center px-6">
      <h1 className="font-display text-5xl text-stone-ink">Distill</h1>

      <Typewriter
        text={TAGLINES}
        speed={45}
        deleteSpeed={25}
        delay={1800}
        loop
        className="block min-h-[1.75em] font-display text-xl text-stone-muted"
      />

      <p className="max-w-md font-body text-sm text-stone-muted">
        Write a note, or upload a PDF, an article, or a document. Distill turns it into a summary,
        flashcards, and a growing map of what you know, all stored on your own device.
      </p>

      <Button size="md" onClick={handleGetStarted} disabled={starting}>
        Let&apos;s get started
      </Button>
    </div>
  )
}
