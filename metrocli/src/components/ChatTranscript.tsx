import React from 'react'
import { Box, Text } from 'ink'
import type { ChatMessage } from '../state/app.js'
import { colors } from '../utils/colors.js'
import { truncate } from '../utils/text.js'

type ChatTranscriptProps = {
  maxLines?: number
  maxMessages?: number
  messages: ChatMessage[]
}

function colorFor(role: ChatMessage['role']) {
  if (role === 'user') return colors.success
  if (role === 'assistant') return colors.primary
  return colors.muted
}

function labelFor(role: ChatMessage['role']) {
  if (role === 'user') return 'You'
  if (role === 'assistant') return 'AI'
  return 'System'
}

function ChatTranscript({ maxLines = 4, maxMessages = 5, messages }: ChatTranscriptProps) {
  const visible = messages.slice(-maxMessages)

  return (
    <Box flexDirection="column" borderStyle="round" borderColor={colors.border} paddingX={1}>
      <Text color={colors.primary} bold>
        AI Planner
      </Text>
      {visible.length === 0 ? (
        <Text color={colors.muted}>Ask MetroCLI to plan a terminal task.</Text>
      ) : (
        visible.map((message) => (
          <Box key={message.id} flexDirection="column" marginBottom={1}>
            <Text color={colorFor(message.role)} bold>
              {labelFor(message.role)}:
            </Text>
            {message.lines.slice(0, maxLines).map((line, index) => (
              <Text key={`${message.id}-${index}`}>{truncate(line, 76)}</Text>
            ))}
          </Box>
        ))
      )}
    </Box>
  )
}

export default ChatTranscript
