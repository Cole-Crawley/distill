import type { BlockCommand, BlockCommandId } from './blockCommands'

export interface SlashMenuState {
  query: string
  position: { top: number; left: number }
  activeIndex: number
}

interface SlashMenuProps {
  state: SlashMenuState
  commands: BlockCommand[]
  onSelect: (id: BlockCommandId) => void
}

export default function SlashMenu({ state, commands, onSelect }: SlashMenuProps) {
  return (
    <div
      style={{ position: 'fixed', top: state.position.top, left: state.position.left }}
      className="z-30 flex w-56 flex-col gap-0.5 rounded border border-border-warm bg-surface p-1 shadow-warm"
    >
      {commands.length === 0 ? (
        <p className="px-2 py-1.5 font-body text-xs text-stone-muted">No matching blocks</p>
      ) : (
        commands.map((command, index) => (
          <button
            key={command.id}
            onMouseDown={event => {
              event.preventDefault()
              onSelect(command.id)
            }}
            className={[
              'flex items-center gap-2 rounded px-2 py-1.5 text-left font-body text-sm transition-colors duration-150',
              index === state.activeIndex ? 'bg-forest-light text-forest' : 'text-stone-ink hover:bg-forest-light',
            ].join(' ')}
          >
            <command.icon className="h-4 w-4 shrink-0" />
            {command.label}
          </button>
        ))
      )}
    </div>
  )
}
