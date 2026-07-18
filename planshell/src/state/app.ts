import type React from 'react'

export type RiskLevel = 'low' | 'medium' | 'high'
export type AppScreen = 'home' | 'planning' | 'plan' | 'executing' | 'settings'

export type CommandStep = {
  id: string
  group?: string
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
  simulation: PlanSimulation
  diffPreview: DiffPreview[]
  confidence: PlanConfidence
  rollback: RollbackPlan | null
  rejection: RejectionDetails | null
  commands: CommandStep[]
}

export type PlanSimulation = {
  filesCreated: string[]
  filesModified: string[]
  filesDeleted: string[]
  networkRequired: boolean
  estimatedSeconds: number
}

export type DiffPreview = {
  path: string
  kind: 'create' | 'modify' | 'delete'
  lines: string[]
}

export type PlanConfidence = {
  score: number
  reasons: string[]
}

export type RollbackPlan = {
  available: boolean
  command: string
  explanation: string
}

export type RejectionDetails = {
  reason: string
  policy: string
  alternative: string
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
  framework: string
  backend: string
  database: string
  testing: string
  styling: string
  router: string
  linting: string
  ci: boolean
  docker: boolean
  gitStatus: string
  modifiedFiles: number
  fileCount: number
  recentFiles: FileEntry[]
  suggestions: string[]
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

export type ChatMessage = {
  id: string
  role: 'user' | 'assistant' | 'system'
  lines: string[]
}
