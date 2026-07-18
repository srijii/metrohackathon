import { CheckCircle2, Code2, RotateCcw } from 'lucide-react'

function PlanPreview({ plan, isExecuting, isUndoing, canUndo, onExecute, onUndo }) {
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
          <button
            type="button"
            className="undo-button"
            disabled={!canUndo || isUndoing || isExecuting}
            onClick={onUndo}
          >
            <RotateCcw size={18} />
            {isUndoing ? 'Undoing...' : 'Undo last operation'}
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
