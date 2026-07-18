import { Play, Sparkles } from 'lucide-react'

const SUGGESTIONS = [
  'Go to frontend.',
  'Show git status.',
  'Create a Python virtual environment and install requirements.',
  'Run postgres in Docker on port 5432.',
  'Find every PDF modified this week.',
]

function CommandBox({
  command,
  cwd,
  isPlanning,
  onChange,
  onPlan,
  onUseSuggestion,
}) {
  return (
    <section className="panel command-panel">
      <div className="command-header">
        <label htmlFor="command">What do you want the terminal to do?</label>
        <span className="path-pill">{cwd}</span>
      </div>
      <div className="command-row">
        <input
          id="command"
          value={command}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Example: Go to frontend and show git status."
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
