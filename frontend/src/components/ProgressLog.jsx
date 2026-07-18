import { Terminal } from 'lucide-react'

function ProgressLog({ logs, isExecuting }) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Terminal</p>
          <h2>Execution log</h2>
        </div>
        <Terminal size={20} />
      </div>

      <div className="log-box">
        {logs.length === 0 ? (
          <p className="muted">
            {isExecuting ? 'Starting...' : 'Run a plan to see terminal output.'}
          </p>
        ) : (
          logs.map((log, index) => <p key={`${log}-${index}`}>{log}</p>)
        )}
      </div>
    </section>
  )
}

export default ProgressLog
