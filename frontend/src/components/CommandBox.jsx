import { Play, Sparkles } from 'lucide-react'

const SUGGESTIONS = [
  'My Downloads folder is a disaster.',
  'Rename every PDF according to its contents.',
  'Convert all PNGs to WebP except logos.',
  'Compress my videos and organize the folder.',
]

function CommandBox({
  command,
  isPlanning,
  onChange,
  onPlan,
  onUseSuggestion,
}) {
  return (
    <section className="panel command-panel">
      <label htmlFor="command">Enter a command</label>
      <div className="command-row">
        <input
          id="command"
          value={command}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Example: Convert all PNGs to WebP except logos."
        />
        <button type="button" disabled={isPlanning} onClick={() => onPlan()}>
          <Sparkles size={18} />
          {isPlanning ? 'Planning...' : 'Plan'}
        </button>
      </div>

      <div className="chips">
        {SUGGESTIONS.map((item) => (
          <button
            key={item}
            type="button"
            className="chip"
            onClick={() => onUseSuggestion(item)}
          >
            <Play size={14} />
            {item}
          </button>
        ))}
      </div>
    </section>
  )
}

export default CommandBox
