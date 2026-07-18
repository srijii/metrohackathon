import { useEffect, useState } from 'react'
import toast, { Toaster } from 'react-hot-toast'
import { createPlan, executePlan, getContext } from './services/api.js'
import CommandBox from './components/CommandBox.jsx'
import FileList from './components/FileList.jsx'
import PlanPreview from './components/PlanPreview.jsx'
import ProgressLog from './components/ProgressLog.jsx'
import ReviewDialog from './components/ReviewDialog.jsx'
import './App.css'

const STARTER_COMMAND = 'Create a Python virtual environment and install requirements.'

function parentPath(path) {
  if (!path || path === '.') return '.'
  const parts = path.split('/').filter(Boolean)
  parts.pop()
  return parts.length > 0 ? parts.join('/') : '.'
}

function App() {
  const [command, setCommand] = useState(STARTER_COMMAND)
  const [plan, setPlan] = useState(null)
  const [context, setContext] = useState(null)
  const [cwd, setCwd] = useState('.')
  const [logs, setLogs] = useState([])
  const [error, setError] = useState('')
  const [isPlanning, setIsPlanning] = useState(false)
  const [isExecuting, setIsExecuting] = useState(false)
  const [isReviewOpen, setIsReviewOpen] = useState(false)

  async function refreshContext(nextCwd = cwd) {
    const data = await getContext(nextCwd)
    setContext(data.context)
    setCwd(data.context.cwd)
  }

  useEffect(() => {
    refreshContext().catch((err) => setError(err.message))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handlePlan(nextCommand = command) {
    setError('')
    setLogs(['Understanding request...', 'Generating execution plan...'])
    setIsPlanning(true)

    try {
      const data = await createPlan(nextCommand, cwd)
      setPlan(data.plan)
      setLogs(['Understanding request...', 'Plan generated. Review before executing.'])
    } catch (err) {
      setError(err.message)
      toast.error(err.message)
      setLogs([])
    } finally {
      setIsPlanning(false)
    }
  }

  function handleRequestExecute() {
    if (!plan) return
    setIsReviewOpen(true)
  }

  async function handleExecute() {
    if (!plan) return

    setError('')
    setIsExecuting(true)
    setLogs(['Proceed approved.', 'Validating command plan...'])

    try {
      const data = await executePlan(plan)
      setLogs(data.logs)
      setIsReviewOpen(false)
      if (data.cwd) {
        await refreshContext(data.cwd)
      } else {
        await refreshContext(cwd)
      }
      toast.success(data.success ? 'Plan executed.' : 'Plan stopped.')
    } catch (err) {
      setError(err.message)
      toast.error(err.message)
    } finally {
      setIsExecuting(false)
    }
  }

  function handleUseSuggestion(nextCommand) {
    setCommand(nextCommand)
    handlePlan(nextCommand)
  }

  async function handleOpenFolder(path) {
    setError('')
    try {
      await refreshContext(path)
      setPlan(null)
      setLogs([`Changed directory to ${path}`])
    } catch (err) {
      setError(err.message)
      toast.error(err.message)
    }
  }

  function handleGoUp() {
    handleOpenFolder(parentPath(cwd))
  }

  return (
    <main className="app-shell">
      <Toaster position="top-right" />
      <section className="workspace">
        <div className="intro">
          <p className="eyebrow">PromptShell</p>
          <h1>Natural language terminal with a live file manager.</h1>
          <p>
            The current directory stays visible, file navigation updates the
            prompt context, and every generated command is reviewed before it
            runs.
          </p>
        </div>

        <CommandBox
          command={command}
          cwd={cwd}
          isPlanning={isPlanning}
          onChange={setCommand}
          onPlan={handlePlan}
          onUseSuggestion={handleUseSuggestion}
        />

        {error ? <div className="error">{error}</div> : null}

        <div className="content-grid">
          <PlanPreview
            isExecuting={isExecuting}
            plan={plan}
            onRequestExecute={handleRequestExecute}
          />
          <ProgressLog logs={logs} isExecuting={isExecuting} />
        </div>
      </section>

      <FileList
        context={context}
        onGoUp={handleGoUp}
        onOpenFolder={handleOpenFolder}
        onRefresh={() => refreshContext(cwd)}
      />
      <ReviewDialog
        isOpen={isReviewOpen}
        isExecuting={isExecuting}
        plan={plan}
        onCancel={() => setIsReviewOpen(false)}
        onConfirm={handleExecute}
      />
    </main>
  )
}

export default App
