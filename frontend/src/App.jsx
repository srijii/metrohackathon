import { useEffect, useState } from 'react'
import {
  createPlan,
  executePlan,
  getFiles,
} from './services/api.js'
import CommandBox from './components/CommandBox.jsx'
import FileList from './components/FileList.jsx'
import PlanPreview from './components/PlanPreview.jsx'
import ProgressLog from './components/ProgressLog.jsx'
import './App.css'

const STARTER_COMMAND = 'My Downloads folder is a disaster.'

function App() {
  const [command, setCommand] = useState(STARTER_COMMAND)
  const [plan, setPlan] = useState(null)
  const [files, setFiles] = useState([])
  const [logs, setLogs] = useState([])
  const [error, setError] = useState('')
  const [isPlanning, setIsPlanning] = useState(false)
  const [isExecuting, setIsExecuting] = useState(false)

  async function refreshFiles() {
    const data = await getFiles()
    setFiles(data.files)
  }

  useEffect(() => {
    refreshFiles().catch((err) => setError(err.message))
  }, [])

  async function handlePlan(nextCommand = command) {
    setError('')
    setLogs([])
    setIsPlanning(true)

    try {
      const data = await createPlan(nextCommand)
      setPlan(data.plan)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsPlanning(false)
    }
  }

  async function handleExecute() {
    if (!plan) return

    setError('')
    setIsExecuting(true)
    setLogs(['Executor approved. Starting safe demo actions...'])

    try {
      const data = await executePlan(plan)
      setLogs(data.logs)
      setFiles(data.files)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsExecuting(false)
    }
  }

  function handleUseSuggestion(nextCommand) {
    setCommand(nextCommand)
    handlePlan(nextCommand)
  }

  return (
    <main className="app-shell">
      <section className="workspace">
        <div className="intro">
          <p className="eyebrow">Natural language file automation</p>
          <h1>Tell it what to clean up. Execute only the safe plan.</h1>
          <p>
            The AI creates JSON. The backend executor touches only the demo folder
            and only runs four approved actions.
          </p>
        </div>

        <CommandBox
          command={command}
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
            onExecute={handleExecute}
          />
          <ProgressLog logs={logs} isExecuting={isExecuting} />
        </div>
      </section>

      <FileList files={files} onRefresh={refreshFiles} />
    </main>
  )
}

export default App
