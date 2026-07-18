import { z } from 'zod'

export const actionSchema = z.object({
  action: z.enum([
    'rename_pdfs',
    'organize_downloads',
    'compress_videos',
    'png_to_webp',
  ]),
  folder: z.literal('demo').default('demo'),
  exclude: z.array(z.string()).default([]),
})

export const planSchema = z.object({
  summary: z.string().min(1),
  requiresApproval: z.boolean().default(true),
  actions: z.array(actionSchema).min(1).max(4),
})

export const commandRequestSchema = z.object({
  command: z.string().trim().min(3).max(500),
})

export const executeRequestSchema = z.object({
  plan: planSchema,
})

export const planJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    summary: { type: 'string' },
    requiresApproval: { type: 'boolean' },
    actions: {
      type: 'array',
      minItems: 1,
      maxItems: 4,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          action: {
            type: 'string',
            enum: [
              'rename_pdfs',
              'organize_downloads',
              'compress_videos',
              'png_to_webp',
            ],
          },
          folder: {
            type: 'string',
            enum: ['demo'],
          },
          exclude: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        required: ['action', 'folder', 'exclude'],
      },
    },
  },
  required: ['summary', 'requiresApproval', 'actions'],
}
