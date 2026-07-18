import React, { useEffect, useMemo, useState } from 'react'
import { Box, Text } from 'ink'
import ApprovalDialog from '../components/ApprovalDialog.js'
import FileTree from '../components/FileTree.js'
import Footer from '../components/Footer.js'
import Header from '../components/Header.js'
import Progress from '../components/Progress.js'
import Chat from './Chat.js'
import Execute from './Execute.js'
import Plan from './Plan.js'
import { useCommands } from '../hooks/useCommands.js'
import { useKeyboard } from '../hooks/useKeyboard.js'
import { executePlan } from '../services/executor.js'
import { analyzeProject } from '../services/project.js'
import type { AppScreen, ProjectContext } from '../state/app.js'
import { colors } from '../utils/colors.js'

const STARTER_PROMPT = 'show git status'

function relativeLabel(root: string, cwd: string) {
  return cwd === root ? '.' : cwd.replace(`${root}/`, '')
}

function Home() {
  const root = useMemo(() => process.cwd(), [])
  const [cwd, setCwd] = useState(root)
  const [context, setContext] = useState<ProjectContext | null>(null)
  const [input, setInput] = useState(STARTER_PROMPT)
  const [logs, setLogs] = useState<string[]>([])
  const [screen, setScreen] = useState<AppScreen>('home')
  const [error, setError] = useState('')
  const [isPlanning, setIsPlanning] = useState(false)
  const [isExecuting, setIsExecuting] = useState(false)
  const { plan, planCommand, setPlan } = useCommands()

  useKeyboard({ onClearLogs: () => setLogs([]) })

  async function refresh(nextCwd = cwd) {
    const nextContext = await analyzeProject(root, nextCwd)
    setContext(nextContext)
    setCwd(nextContext.cwd)
  }

  useEffect(() => {
    refresh().catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSubmit(value: string) {
    if (!value.trim() || !context) return

    setError('')
    setIsPlanning(true)
    setScreen('planning')
    setLogs(['Analyzing project...', 'Generating command plan...'])

    try {
      await refresh(cwd)
      await planCommand(value, context)
      setScreen('plan')
      setLogs(['Analyze project: done', 'Generate plan: done', 'Waiting for approval.'])
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setScreen('home')
    } finally {
      setIsPlanning(false)
    }
  }

  async function handleApprove() {
    if (!plan) return

    setError('')
    setIsExecuting(true)
    setScreen('executing')

    try {
      const result = await executePlan(root, plan)
      setLogs(result.logs)
      await refresh(result.cwd)
      setPlan(null)
      setScreen('home')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setScreen('plan')
    } finally {
      setIsExecuting(false)
    }
  }

  function handleCancel() {
    setPlan(null)
    setScreen('home')
    setLogs((items) => [...items, 'Execution cancelled.'])
  }

  const status = isPlanning
    ? 'planning'
    : isExecuting
      ? 'executing'
      : screen

  return (
    <Box flexDirection="column" gap={1}>
      <Header context={context} />

      {error ? (
        <Box borderStyle="round" borderColor={colors.danger} paddingX={1}>
          <Text color={colors.danger}>[x] {error}</Text>
        </Box>
      ) : null}

      <Box gap={1}>
        <Box flexDirection="column" width="62%" gap={1}>
          <Chat
            cwd={relativeLabel(root, cwd)}
            disabled={isPlanning || isExecuting || Boolean(plan)}
            input={input}
            onChange={setInput}
            onSubmit={handleSubmit}
          />
          <Progress active={isPlanning} label="Planning..." />
          {plan ? (
            <ApprovalDialog plan={plan} onApprove={handleApprove} onCancel={handleCancel} />
          ) : (
            <Plan plan={null} />
          )}
          <Execute logs={logs} />
        </Box>

        <Box width="38%">
          <FileTree context={context} />
        </Box>
      </Box>

      <Footer status={status} />
    </Box>
  )
}

export default Home
