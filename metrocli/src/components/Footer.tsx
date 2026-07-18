import React from 'react'
import { Box, Text } from 'ink'
import { colors } from '../utils/colors.js'

type FooterProps = {
  compact?: boolean
  tiny?: boolean
  status: string
}

function Footer({ compact = false, status, tiny = false }: FooterProps) {
  return (
    <Box justifyContent="space-between">
      <Text color={colors.muted}>
        {tiny
          ? 'Enter | Esc | q'
          : compact
          ? 'Enter approve | Esc cancel | Ctrl+L clear | q quit'
          : 'Enter: submit/approve | Esc: cancel | Ctrl+L clear | Ctrl+K prompt | Ctrl+P/N history | q quit'}
      </Text>
      <Text color={colors.primary}>{status}</Text>
    </Box>
  )
}

export default Footer
