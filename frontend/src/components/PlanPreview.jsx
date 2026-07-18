import { CheckCircle2, Code2 } from 'lucide-react'

function PlanPreview({ plan, isExecuting, onExecute }) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">JSON plan</p>
          <h2>Review before execution</h2>
        </div>
        <Code2 size={20} />
      </div>

      {plan ? (
        <>
          <pre>{JSON.stringify(plan, null, 2)}</pre>
          <button
            type="button"
            className="execute-button"
            disabled={isExecuting}
            onClick={onExecute}
          >
            <CheckCircle2 size={18} />
            {isExecuting ? 'Executing...' : 'Execute approved plan'}
          </button>
        </>
      ) : (
        <div className="empty-state">
          Generate a plan to see the validated JSON that will be sent to the
          executor.
        </div>
      )}
    </section>
  )
}

export default PlanPreview
