import React from 'react'
import { Box, Text } from 'ink'
import { colors } from '../utils/colors.js'

type FooterProps = {
  status: string
}

function Footer({ status }: FooterProps) {
  return (
    <Box borderStyle="single" borderColor={colors.border} paddingX={1} justifyContent="space-between">
      <Text color={colors.muted}>Enter: submit | Ctrl+L: clear logs | Ctrl+C/q: quit</Text>
      <Text color={colors.primary}>{status}</Text>
    </Box>
  )
}

export default Footer
