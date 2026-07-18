import {
  commandRequestSchema,
  executeRequestSchema,
} from '../schemas/automationSchemas.js'
import { listDemoFiles } from '../services/demoFileService.js'
import { executeAutomationPlan } from '../services/executorService.js'
import { createAutomationPlan } from '../services/plannerService.js'

export async function getFiles(_req, res, next) {
  try {
    const files = await listDemoFiles()
    res.json({ data: { files } })
  } catch (error) {
    next(error)
  }
}

export async function planCommand(req, res, next) {
  try {
    const payload = commandRequestSchema.parse(req.body)
    const plan = await createAutomationPlan(payload.command)
    res.json({ data: { plan } })
  } catch (error) {
    next(error)
  }
}

export async function executePlan(req, res, next) {
  try {
    const payload = executeRequestSchema.parse(req.body)
    const result = await executeAutomationPlan(payload.plan)
    res.json({ data: result })
  } catch (error) {
    next(error)
  }
}
