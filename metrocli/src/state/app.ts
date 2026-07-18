import type React from 'react'

export type RiskLevel = 'low' | 'medium' | 'high'
export type AppScreen = 'home' | 'planning' | 'plan' | 'executing' | 'settings'

export type CommandStep = {
  id: string
  title: string
  command: string
  args: string[]
  cwd: string
  explanation: string
  risk: RiskLevel
  longRunning: boolean
  interactive: boolean
}

export type CommandPlan = {
  summary: string
  requiresApproval: true
  riskLevel: RiskLevel
  warnings: string[]
  commands: CommandStep[]
}

export type ExecutionResult = {
  id: string
  command: string
  exitCode: number
  logs: string[]
  nextCwd?: string
}

export type ProjectContext = {
  cwd: string
  root: string
  projectName: string
  branch: string
  packageManager: string
  nodeDetected: boolean
  entries: FileEntry[]
}

export type FileEntry = {
  name: string
  path: string
  type: 'folder' | 'file'
  size: number
}

export type ScreenProps = {
  children?: React.ReactNode
}
