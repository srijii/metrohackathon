import { readFile } from 'node:fs/promises'
import OpenAI from 'openai'
import { planJsonSchema, planSchema } from '../schemas/automationSchemas.js'
import { env } from '../utils/env.js'

const promptUrl = new URL('../../../PROMPTS.md', import.meta.url)

function uniqueActions(actions) {
  const seen = new Set()
  return actions.filter((item) => {
    if (seen.has(item.action)) return false
    seen.add(item.action)
    return true
  })
}

function fallbackPlan(command) {
  const normalized = command.toLowerCase()
  const exclude = normalized.includes('logo') ? ['logo'] : []
  const actions = []

  if (
    normalized.includes('disaster') ||
    normalized.includes('mess') ||
    normalized.includes('downloads') ||
    normalized.includes('clean') ||
    normalized.includes('organize')
  ) {
    actions.push(
      { action: 'rename_pdfs', folder: 'demo', exclude },
      { action: 'png_to_webp', folder: 'demo', exclude },
      { action: 'compress_videos', folder: 'demo', exclude },
      { action: 'organize_downloads', folder: 'demo', exclude },
    )
  } else {
    if (normalized.includes('pdf') || normalized.includes('rename')) {
      actions.push({ action: 'rename_pdfs', folder: 'demo', exclude })
    }
    if (normalized.includes('png') || normalized.includes('webp')) {
      actions.push({ action: 'png_to_webp', folder: 'demo', exclude })
    }
    if (normalized.includes('video') || normalized.includes('compress')) {
      actions.push({ action: 'compress_videos', folder: 'demo', exclude })
    }
    if (normalized.includes('download') || normalized.includes('organize')) {
      actions.push({ action: 'organize_downloads', folder: 'demo', exclude })
    }
  }

  const safeActions =
    actions.length > 0
      ? uniqueActions(actions)
      : [{ action: 'organize_downloads', folder: 'demo', exclude }]

  return planSchema.parse({
    summary: `Execute ${safeActions.length} safe demo action${safeActions.length === 1 ? '' : 's'}.`,
    requiresApproval: true,
    actions: safeActions,
  })
}

async function openAiPlan(command) {
  if (!env.OPENAI_API_KEY) return null

  const prompt = await readFile(promptUrl, 'utf8')
  const client = new OpenAI({ apiKey: env.OPENAI_API_KEY })
  const response = await client.responses.create({
    model: env.OPENAI_MODEL,
    instructions: prompt,
    input: command,
    temperature: 0.1,
    max_output_tokens: 500,
    store: false,
    text: {
      format: {
        type: 'json_schema',
        name: 'file_automation_plan',
        strict: true,
        schema: planJsonSchema,
      },
    },
  })

  return planSchema.parse(JSON.parse(response.output_text || '{}'))
}

export async function createAutomationPlan(command) {
  try {
    const plan = await openAiPlan(command)
    if (plan) return plan
  } catch (error) {
    console.error('Planner model failed, using fallback planner:', error.message)
  }

  return fallbackPlan(command)
}
