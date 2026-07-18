import { readFile } from 'node:fs/promises'
import OpenAI from 'openai'
import { z } from 'zod'

const ACTIONS = ['rename_pdfs', 'organize_downloads', 'png_to_webp']

export const actionSchema = z.object({
  action: z.enum(ACTIONS),
  folder: z.literal('demo').default('demo'),
  exclude: z.array(z.string()).default([]),
  reason: z.string().min(1),
})

export const planSchema = z.object({
  summary: z.string().min(1),
  requiresApproval: z.literal(true),
  riskLevel: z.enum(['low', 'medium', 'high']),
  warnings: z.array(z.string()).default([]),
  actions: z.array(actionSchema).min(1).max(3),
})

export const planRequestSchema = z.object({
  command: z.string().trim().min(3).max(500),
})

export const executeRequestSchema = z.object({
  plan: planSchema,
})

const planJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    summary: { type: 'string' },
    requiresApproval: { type: 'boolean', enum: [true] },
    riskLevel: { type: 'string', enum: ['low', 'medium', 'high'] },
    warnings: { type: 'array', items: { type: 'string' } },
    actions: {
      type: 'array',
      minItems: 1,
      maxItems: 3,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          action: {
            type: 'string',
            enum: ACTIONS,
          },
          folder: {
            type: 'string',
            enum: ['demo'],
          },
          exclude: {
            type: 'array',
            items: { type: 'string' },
          },
          reason: {
            type: 'string',
          },
        },
        required: ['action', 'folder', 'exclude', 'reason'],
      },
    },
  },
  required: ['summary', 'requiresApproval', 'riskLevel', 'warnings', 'actions'],
}

function uniqueActions(actions) {
  const seen = new Set()
  return actions.filter((item) => {
    if (seen.has(item.action)) return false
    seen.add(item.action)
    return true
  })
}

function localPlan(command) {
  const normalized = command.toLowerCase()
  const exclude = normalized.includes('logo') ? ['logo'] : []
  const actions = []
  const warnings = []

  if (/\bdelete|remove|wipe|erase\b/.test(normalized)) {
    warnings.push('Destructive delete requests are blocked in this demo.')
  }

  if (
    normalized.includes('disaster') ||
    normalized.includes('mess') ||
    normalized.includes('downloads') ||
    normalized.includes('clean') ||
    normalized.includes('organize')
  ) {
    actions.push(
      {
        action: 'rename_pdfs',
        folder: 'demo',
        exclude,
        reason: 'PDF names are often messy in Downloads and can be improved from file contents.',
      },
      {
        action: 'png_to_webp',
        folder: 'demo',
        exclude,
        reason: 'PNG screenshots can be converted to WebP while respecting exclusions.',
      },
      {
        action: 'organize_downloads',
        folder: 'demo',
        exclude,
        reason: 'Loose files can be moved into Documents, Images, Videos, and Other.',
      },
    )
  } else {
    if (normalized.includes('pdf') || normalized.includes('rename')) {
      actions.push({
        action: 'rename_pdfs',
        folder: 'demo',
        exclude,
        reason: 'The request asks to rename PDF files.',
      })
    }
    if (normalized.includes('png') || normalized.includes('webp')) {
      actions.push({
        action: 'png_to_webp',
        folder: 'demo',
        exclude,
        reason: 'The request asks to convert PNG images to WebP.',
      })
    }
    if (normalized.includes('download') || normalized.includes('organize')) {
      actions.push({
        action: 'organize_downloads',
        folder: 'demo',
        exclude,
        reason: 'The request asks to organize a messy folder.',
      })
    }
  }

  const safeActions =
    actions.length > 0
      ? uniqueActions(actions)
      : [
          {
            action: 'organize_downloads',
            folder: 'demo',
            exclude,
            reason: 'Defaulting to the safest visible cleanup action.',
          },
        ]

  return planSchema.parse({
    summary: `Preview ${safeActions.length} safe file automation action${safeActions.length === 1 ? '' : 's'}.`,
    requiresApproval: true,
    riskLevel: warnings.length > 0 ? 'high' : 'low',
    warnings,
    actions: safeActions,
  })
}

async function aiPlan(command) {
  if (!process.env.NVIDIA_API_KEY) return null

  const prompt = await readFile(new URL('../PROMPTS.md', import.meta.url), 'utf8')
  const client = new OpenAI({
    apiKey: process.env.NVIDIA_API_KEY,
    baseURL: process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1',
  })

  const stream = await client.chat.completions.create({
    model: process.env.NVIDIA_MODEL || 'z-ai/glm-5.2',
    messages: [
      {
        role: 'system',
        content: prompt,
      },
      {
        role: 'user',
        content: command,
      },
    ],
    temperature: 0.1,
    top_p: 1,
    max_tokens: 1200,
    seed: 42,
    stream: true,
  })

  let text = ''
  for await (const chunk of stream) {
    text += chunk.choices[0]?.delta?.content || ''
  }

  const json = text
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim()

  return planSchema.parse(JSON.parse(json))
}

export async function createPlan(command) {
  const fastPlan = localPlan(command)
  const needsAi =
    !command.toLowerCase().includes('downloads') &&
    !command.toLowerCase().includes('pdf') &&
    !command.toLowerCase().includes('png') &&
    !command.toLowerCase().includes('webp') &&
    !command.toLowerCase().includes('organize')

  if (!needsAi) return fastPlan

  try {
    return (await aiPlan(command)) || fastPlan
  } catch (error) {
    console.error('AI planner failed, using local planner:', error.message)
    return fastPlan
  }
}
