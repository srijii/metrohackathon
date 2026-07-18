import { AlertTriangle, ShieldCheck, X } from 'lucide-react'

function renderCommand(item) {
  return [item.command, ...item.args].join(' ')
}

function ReviewDialog({ isOpen, isExecuting, onCancel, onConfirm, plan }) {
  if (!isOpen || !plan) return null

  const isHighRisk = plan.riskLevel === 'high'

  return (
    <div className="dialog-backdrop" role="presentation">
      <section className="review-dialog" role="dialog" aria-modal="true">
        <div className="dialog-heading">
          <div>
            <p className="eyebrow">Execution review</p>
            <h2>{isHighRisk ? 'High-risk command blocked' : 'Approve command plan'}</h2>
          </div>
          <button type="button" className="icon-button" onClick={onCancel}>
            <X size={18} />
          </button>
        </div>

        <div className="dialog-body">
          <p className={`risk risk-${plan.riskLevel}`}>Risk: {plan.riskLevel}</p>
          <p className="dialog-summary">{plan.summary}</p>

          {plan.warnings.length > 0 ? (
            <div className="warnings">
              {plan.warnings.map((warning) => (
                <p key={warning}>{warning}</p>
              ))}
            </div>
          ) : null}

          <div className="review-commands">
            {plan.commands.map((item) => (
              <div key={item.id} className="review-command">
                <code>{renderCommand(item)}</code>
                <span>from {item.cwd}</span>
              </div>
            ))}
          </div>

          <div className="safety-note">
            {isHighRisk ? <AlertTriangle size={18} /> : <ShieldCheck size={18} />}
            <span>
              {isHighRisk
                ? 'This MVP blocks high-risk plans. Rewrite the request with a safer operation.'
                : 'Commands run only after approval, inside the allowed workspace, with shell mode disabled.'}
            </span>
          </div>
        </div>

        <div className="dialog-actions">
          <button type="button" className="secondary-button" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="execute-button dialog-execute"
            disabled={isExecuting || isHighRisk}
            onClick={onConfirm}
          >
            <ShieldCheck size={18} />
            {isExecuting ? 'Executing...' : 'Approve and execute'}
          </button>
        </div>
      </section>
    </div>
  )
}

export default ReviewDialog
