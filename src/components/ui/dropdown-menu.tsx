import { useState } from 'react'
import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import Button from '@/components/Button'

type DropdownMenuOption = {
  label: string
  onClick: () => void
  Icon?: ReactNode
}

type DropdownMenuProps = {
  options: DropdownMenuOption[]
  children: ReactNode
}

export function DropdownMenu({ options, children }: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative">
      <Button variant="secondary" size="sm" onClick={() => setIsOpen(prev => !prev)}>
        {children ?? 'Menu'}
        <motion.span
          className="inline-flex"
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.15, ease: 'easeInOut' }}
        >
          <ChevronDown className="h-4 w-4" />
        </motion.span>
      </Button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Click-outside catcher */}
            <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />

            <motion.div
              initial={{ y: -4, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -4, opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="absolute right-0 z-20 mt-2 flex w-48 flex-col gap-0.5 rounded border border-border-warm bg-surface p-1 shadow-warm"
            >
              {options.length > 0 ? (
                options.map(option => (
                  <button
                    key={option.label}
                    onClick={() => {
                      option.onClick()
                      setIsOpen(false)
                    }}
                    className="flex w-full items-center gap-2 rounded px-3 py-2 text-left font-body text-sm text-stone-ink transition-colors duration-150 hover:bg-forest-light"
                  >
                    {option.Icon}
                    {option.label}
                  </button>
                ))
              ) : (
                <div className="px-3 py-2 font-body text-xs text-stone-muted">No options</div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
