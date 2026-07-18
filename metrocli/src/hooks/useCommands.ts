import { useCallback, useState } from 'react'
import type { CommandPlan, ProjectContext } from '../state/app.js'
import { createPlan, type PlannerEvents } from '../services/planner.js'

export function useCommands() {
  const [plan, setPlan] = useState<CommandPlan | null>(null)
  const [history, setHistory] = useState<string[]>([])

  const planCommand = useCallback(async (
    input: string,
    context: ProjectContext,
    events: PlannerEvents = {},
  ) => {
    const nextPlan = await createPlan(input, context, events)
    setPlan(nextPlan)
    setHistory((items) => [input, ...items].slice(0, 20))
    return nextPlan
  }, [])

  return {
    history,
    plan,
    planCommand,
    setPlan,
  }
}
