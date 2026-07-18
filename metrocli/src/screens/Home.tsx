import React, { useEffect, useMemo, useState } from 'react'
import { Box, Text, useStdout } from 'ink'
import ChatTranscript from '../components/ChatTranscript.js'
import Footer from '../components/Footer.js'
import Header from '../components/Header.js'
import ProjectSummary from '../components/ProjectSummary.js'
import Progress from '../components/Progress.js'
import Chat from './Chat.js'
import Execute from './Execute.js'
import Plan from './Plan.js'
import { useCommands } from '../hooks/useCommands.js'
import { useKeyboard } from '../hooks/useKeyboard.js'
import { executePlan } from '../services/executor.js'
import { analyzeProject } from '../services/project.js'
import type { AppScreen, ChatMessage, ProjectContext } from '../state/app.js'
import { colors } from '../utils/colors.js'

const STARTER_PROMPT = 'show git status'

function relativeLabel(root: string, cwd: string) {
  return cwd === root ? '.' : cwd.replace(`${root}/`, '')
}

function Home() {
  const root = useMemo(() => process.cwd(), [])
  const { stdout } = useStdout()
  const terminalColumns = stdout.columns || 100
  const terminalRows = stdout.rows || 32
  const isNarrow = terminalColumns < 104
  const isShort = terminalRows < 30
  const isTiny = terminalRows < 21
  const isMicro = terminalRows < 14
  const showHeader = terminalRows >= 15
  const showSidebar = !isNarrow && !isShort
  const showLogs = terminalRows >= 22
  const [cwd, setCwd] = useState(root)
  const [context, setContext] = useState<ProjectContext | null>(null)
  const [input, setInput] = useState(STARTER_PROMPT)
  const [logs, setLogs] = useState<string[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [screen, setScreen] = useState<AppScreen>('home')
  const [error, setError] = useState('')
  const [isPlanning, setIsPlanning] = useState(false)
  const [isExecuting, setIsExecuting] = useState(false)
  const [historyIndex, setHistoryIndex] = useState(-1)
  const { history, plan, planCommand, setPlan } = useCommands()
  const showPlanner = plan ? terminalRows >= 14 : terminalRows >= 24

  async function refresh(nextCwd = cwd) {
    const nextContext = await analyzeProject(root, nextCwd)
    setContext(nextContext)
    setCwd(nextContext.cwd)
    return nextContext
  }

  function appendMessage(role: ChatMessage['role'], lines: string[]) {
    setMessages((items) => [
      ...items,
      {
        id: `${Date.now()}-${items.length}`,
        role,
        lines,
      },
    ])
  }

  function clearSession() {
    setMessages([])
    setLogs([])
    setPlan(null)
    setError('')
    setScreen('home')
  }

  function showHelp() {
    appendMessage('system', [
      'Slash commands: /help, /history, /model, /reset, /files, /context, /approve, /clear',
      'Shortcuts: Enter submit/approve, Esc cancel, Ctrl+L clear logs, Ctrl+K clear prompt, Ctrl+P/Ctrl+N history.',
    ])
  }

  function showContext() {
    if (!context) return

    appendMessage('system', [
      'MetroCLI understands:',
      `[ok] ${context.framework} frontend`,
      `[ok] ${context.backend} backend`,
      `[ok] ${context.database} database`,
      `[ok] ${context.testing} testing`,
      `[ok] ${context.fileCount} files indexed`,
      `[ok] ${context.packageManager} workspace`,
      `cwd: ${relativeLabel(root, context.cwd)}`,
    ])
  }

  function showFiles() {
    if (!context) return

    appendMessage('system', [
      'Current directory:',
      ...context.entries.slice(0, 12).map((entry) => `${entry.type === 'folder' ? '[dir]' : '[file]'} ${entry.name}`),
    ])
  }

  function showHistory() {
    appendMessage('system', history.length === 0 ? ['No prompt history yet.'] : history.map((item) => `> ${item}`))
  }

  async function handleSlashCommand(value: string) {
    const command = value.trim().toLowerCase()

    if (command === '/help') showHelp()
    else if (command === '/clear') setLogs([])
    else if (command === '/reset') clearSession()
    else if (command === '/files') showFiles()
    else if (command === '/context') showContext()
    else if (command === '/history') showHistory()
    else if (command === '/model') {
      appendMessage('system', [
        `Model: ${process.env.NVIDIA_MODEL || 'z-ai/glm-5.2'}`,
        `Base URL: ${process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1'}`,
        `API key: ${process.env.NVIDIA_API_KEY ? 'configured' : 'missing'}`,
      ])
    } else if (command === '/approve') {
      await handleApprove()
    } else {
      appendMessage('system', [`Unknown slash command: ${value}`, 'Type /help for available commands.'])
    }

    setInput('')
  }

  function previousHistory() {
    if (history.length === 0) return
    const nextIndex = Math.min(historyIndex + 1, history.length - 1)
    setHistoryIndex(nextIndex)
    setInput(history[nextIndex] || '')
  }

  function nextHistory() {
    if (history.length === 0) return
    const nextIndex = Math.max(historyIndex - 1, -1)
    setHistoryIndex(nextIndex)
    setInput(nextIndex === -1 ? '' : history[nextIndex] || '')
  }

  useEffect(() => {
    refresh().catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSubmit(value: string) {
    if (!value.trim() || !context) return
    if (value.trim().startsWith('/')) {
      await handleSlashCommand(value)
      return
    }

    setError('')
    setIsPlanning(true)
    setScreen('planning')
    setHistoryIndex(-1)
    setLogs([])
    appendMessage('user', [value])
    appendMessage('assistant', ['Thinking...', 'Analyzing repository...'])

    try {
      const nextContext = await refresh(cwd)
      let tokenCount = 0
      const nextPlan = await planCommand(value, nextContext, {
        onStatus(line) {
          setLogs((items) => [...items, line])
        },
        onToken(token) {
          tokenCount += token.length
          if (tokenCount > 0 && tokenCount % 160 < token.length) {
            setLogs((items) => [...items.slice(-14), `Streaming NVIDIA response... ${tokenCount} chars`])
          }
        },
      })
      setScreen('plan')
      appendMessage('assistant', [
        `I'll ${nextPlan.summary.toLowerCase()}:`,
        ...nextPlan.commands.map((command) => `[ok] ${command.title}`),
        `Confidence: ${nextPlan.confidence.score}%`,
        nextPlan.riskLevel === 'high'
          ? 'This is high risk, so execution is blocked.'
          : 'Press Enter to approve, or Esc to cancel.',
      ])
      setLogs((items) => [...items, 'Waiting for approval.'])
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setScreen('home')
    } finally {
      setIsPlanning(false)
    }
  }

  async function handleApprove() {
    if (!plan) return

    if (plan.riskLevel === 'high') {
      appendMessage('system', ['High-risk plan blocked. Nothing was executed.'])
      setPlan(null)
      setScreen('home')
      return
    }

    setError('')
    setIsExecuting(true)
    setScreen('executing')

    try {
      const result = await executePlan(root, plan)
      setLogs(result.logs)
      await refresh(result.cwd)
      appendMessage('assistant', result.results.every((item) => item.exitCode === 0)
        ? ['Execution finished successfully.']
        : ['Execution stopped because one command failed.'])
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
    appendMessage('system', ['Execution cancelled.'])
  }

  useKeyboard({
    hasPlan: Boolean(plan),
    onApprove: handleApprove,
    onCancel: handleCancel,
    onClearLogs: () => setLogs([]),
    onClearPrompt: () => setInput(''),
    onNextHistory: nextHistory,
    onPreviousHistory: previousHistory,
  })

  const status = isPlanning
    ? 'planning'
    : isExecuting
      ? 'executing'
      : screen

  return (
    <Box flexDirection="column" height={terminalRows}>
      {showHeader ? <Header context={context} /> : null}

      {error ? (
        <Box borderStyle="round" borderColor={colors.danger} paddingX={1}>
          <Text color={colors.danger}>[x] {error}</Text>
        </Box>
      ) : null}

      {!isMicro ? (
        <Box flexDirection={showSidebar ? 'row' : 'column'} flexGrow={1} gap={1}>
          <Box flexDirection="column" width={showSidebar ? '64%' : '100%'}>
            <ChatTranscript
              maxLines={isTiny ? 2 : isShort ? 3 : 4}
              maxMessages={isTiny ? 2 : 4}
              messages={messages}
            />
          <Progress active={isPlanning} label="Planning..." />
            {showPlanner ? <Plan compact={isShort} plan={plan} /> : null}
            {showLogs ? <Execute logs={logs} maxLines={isShort ? 4 : 8} /> : null}
          </Box>

          {showSidebar ? (
            <Box width="36%">
              <ProjectSummary context={context} compact={isShort} minimal={isTiny} />
            </Box>
          ) : null}
        </Box>
      ) : null}

      {isMicro ? (
        <Box flexDirection="column" flexGrow={1}>
          <Text color={colors.primary}>MetroCLI ready</Text>
          <Text color={colors.muted}>{context ? `${context.projectName} | ${context.branch}` : 'Analyzing project...'}</Text>
          <Text color={colors.muted}>{plan ? `${riskLabel(plan.riskLevel)} | ${plan.confidence.score}% | Enter approves` : status}</Text>
        </Box>
      ) : null}

      <Box>
        <Chat
          compact={terminalColumns < 60}
          cwd={relativeLabel(root, cwd)}
          disabled={isPlanning || isExecuting || Boolean(plan)}
          input={input}
          statusLabel={isPlanning ? 'Planning...' : isExecuting ? 'Executing...' : 'Review pending...'}
          onChange={setInput}
          onSubmit={handleSubmit}
        />
      </Box>

      <Footer compact={isNarrow || isShort} status={status} tiny={terminalColumns < 52 || terminalRows < 12} />
    </Box>
  )
}

function riskLabel(risk: 'low' | 'medium' | 'high') {
  if (risk === 'low') return 'Safe'
  if (risk === 'medium') return 'Changes project'
  return 'Blocked'
}

export default Home
