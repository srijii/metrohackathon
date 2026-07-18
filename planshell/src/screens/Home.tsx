import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
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
import type { AppScreen, ChatMessage, CommandPlan, ProjectContext } from '../state/app.js'
import { colors } from '../utils/colors.js'
import { truncate } from '../utils/text.js'

const STARTER_PROMPT = ''

function detectWorkspaceRoot(start: string) {
  let current = start

  while (true) {
    if (existsSync(join(current, '.git'))) return current

    const parent = dirname(current)
    if (parent === current) return start
    current = parent
  }
}

function relativeLabel(root: string, cwd: string) {
  return cwd === root ? '.' : cwd.replace(`${root}/`, '')
}

function readableError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)

  if (message.trim().startsWith('[') || message.includes('Invalid input')) {
    return 'Planner returned an invalid response. PlanShell kept execution blocked.'
  }

  return truncate(message, 96)
}

function lastCreatedFolder(previousPlan: CommandPlan | null) {
  const command = previousPlan?.commands.find((item) => item.command === 'mkdir')
  const target = command?.args.find((arg) => !arg.startsWith('-'))?.replace(/\/$/g, '')
  return target || ''
}

function resolveCorrectionPrompt(input: string, previousPlan: CommandPlan | null) {
  const text = input.toLowerCase()
  const correctsFolderToFile = /\b(not|no|instead|mean|meant)\b/.test(text) &&
    /\b(directory|folder)\b/.test(text) &&
    /\bfile\b/.test(text)

  if (!correctsFolderToFile) {
    return { prompt: input, note: '' }
  }

  const folder = lastCreatedFolder(previousPlan)
  if (!folder) {
    return { prompt: input, note: '' }
  }

  return {
    prompt: `replace folder ${folder} with file ${folder}`,
    note: `Using previous target: ${folder}; replacing the folder with a file.`,
  }
}

function isInvalidTerminalPlan(nextPlan: CommandPlan) {
  return nextPlan.summary === 'Invalid terminal request'
}

function Home() {
  const launchCwd = useMemo(() => process.cwd(), [])
  const root = useMemo(() => detectWorkspaceRoot(launchCwd), [launchCwd])
  const { stdout } = useStdout()
  const terminalColumns = stdout.columns || 100
  const terminalRows = stdout.rows || 32
  const isNarrow = terminalColumns < 104
  const isShort = terminalRows < 30
  const isTiny = terminalRows < 21
  const isMicro = terminalRows < 14
  const showHeader = terminalRows >= 10
  const showSidebar = !isNarrow && !isShort
  const showLogs = terminalRows >= 22
  const [cwd, setCwd] = useState(launchCwd)
  const [context, setContext] = useState<ProjectContext | null>(null)
  const [input, setInput] = useState(STARTER_PROMPT)
  const [logs, setLogs] = useState<string[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [screen, setScreen] = useState<AppScreen>('home')
  const [error, setError] = useState('')
  const [isPlanning, setIsPlanning] = useState(false)
  const [isExecuting, setIsExecuting] = useState(false)
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [lastPlan, setLastPlan] = useState<CommandPlan | null>(null)
  const { history, plan, planCommand, setPlan } = useCommands()
  const showPlanner = Boolean(plan) && terminalRows >= 14

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
    setLastPlan(null)
    setError('')
    setScreen('home')
  }

  function showHelp() {
    appendMessage('system', [
      'Slash commands: /help, /history, /model, /reset, /files, /context, /approve, /clear',
      'Shortcuts: Enter submit/approve, Esc cancel, Up/Down history, Ctrl+L clear logs, Ctrl+K clear prompt.',
    ])
  }

  function showContext() {
    if (!context) return

    appendMessage('system', [
      'PlanShell understands:',
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
    refresh().catch((err: unknown) => setError(readableError(err)))
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
    setInput('')
    appendMessage('user', [value])

    try {
      const nextContext = await refresh(cwd)
      const resolved = resolveCorrectionPrompt(value, lastPlan)
      const nextPlan = await planCommand(resolved.prompt, nextContext, {
        onStatus(line) {
          setLogs((items) => [...items.slice(-10), line])
        },
        onToken() {
          setLogs((items) => items.includes('Receiving planner response...')
            ? items
            : [...items.slice(-10), 'Receiving planner response...'])
        },
      })
      setLastPlan(nextPlan)

      appendMessage('assistant', [
        resolved.note,
        isInvalidTerminalPlan(nextPlan) ? nextPlan.summary : `Plan: ${nextPlan.summary}`,
        isInvalidTerminalPlan(nextPlan) ? nextPlan.rejection?.reason || '' : `Risk: ${riskLabel(nextPlan.riskLevel)} | Confidence: ${nextPlan.confidence.score}%`,
        ...nextPlan.commands.slice(0, 4).map((command) => `$ ${command.command} ${command.args.join(' ')}`.trim()),
        nextPlan.commands.length === 0 ? 'No commands will run.' : '',
      ].filter(Boolean))

      if (isInvalidTerminalPlan(nextPlan)) {
        setPlan(null)
        setScreen('home')
        setLogs(['Invalid input. Terminal has nothing to do.'])
        return
      }

      if (nextPlan.riskLevel === 'high') {
        setScreen('plan')
        setLogs(['Review required. Nothing has been executed.'])
        return
      }

      await runPlan(nextPlan)
    } catch (err) {
      setError(readableError(err))
      setScreen('home')
    } finally {
      setIsPlanning(false)
    }
  }

  async function runPlan(nextPlan: NonNullable<typeof plan>) {
    setError('')
    setPlan(null)
    setIsExecuting(true)
    setScreen('executing')

    try {
      const result = await executePlan(root, nextPlan)
      setLogs(result.logs)
      await refresh(result.cwd)
      appendMessage('assistant', result.results.every((item) => item.exitCode === 0)
        ? ['Done.']
        : ['Stopped because one command failed.'])
      setPlan(null)
      setScreen('home')
    } catch (err) {
      setError(readableError(err))
      setScreen('home')
    } finally {
      setIsExecuting(false)
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

    await runPlan(plan)
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
            {messages.length > 0 || !plan ? (
              <ChatTranscript
                maxLines={isTiny ? 1 : isShort ? 2 : 3}
                maxMessages={isTiny ? 2 : 3}
                messages={messages}
              />
            ) : null}
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
          <Text color={colors.primary}>PlanShell ready</Text>
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
          statusLabel={isPlanning ? 'Planning...' : isExecuting ? 'Executing...' : plan ? 'Review pending...' : 'Ready'}
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
