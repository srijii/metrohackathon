import { ShieldCheck, Code2 } from 'lucide-react'

function renderCommand(item) {
  return [item.command, ...item.args].join(' ')
}

function PlanPreview({ plan, isExecuting, onRequestExecute }) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Command plan</p>
          <h2>Review before execution</h2>
        </div>
        <Code2 size={20} />
      </div>

      {plan ? (
        <>
          <div className="plan-list">
            <p className={`risk risk-${plan.riskLevel}`}>Risk: {plan.riskLevel}</p>
            {plan.warnings.length > 0 ? (
              <div className="warnings">
                {plan.warnings.map((warning) => (
                  <p key={warning}>{warning}</p>
                ))}
              </div>
            ) : null}

            {plan.commands.map((item, index) => (
              <div key={item.id} className="command-card">
                <span>{index + 1}</span>
                <div>
                  <h3>{item.title}</h3>
                  <code>{renderCommand(item)}</code>
                  <span className="command-cwd">cwd: {item.cwd}</span>
                  <p>{item.explanation}</p>
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="execute-button"
            disabled={isExecuting}
            onClick={onRequestExecute}
          >
            <ShieldCheck size={18} />
            {isExecuting ? 'Executing...' : 'Review execution'}
          </button>
        </>
      ) : (
        <div className="empty-state">
          Generate a plan to see commands, explanations, risk, and warnings.
        </div>
      )}
    </section>
  )
}

export default PlanPreview
