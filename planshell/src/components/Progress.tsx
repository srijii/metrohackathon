import React from 'react'
import { Box, Text } from 'ink'
import Spinner from 'ink-spinner'
import { colors } from '../utils/colors.js'

type ProgressProps = {
  label: string
  active: boolean
}

function Progress({ active, label }: ProgressProps) {
  if (!active) return null

  return (
    <Box>
      <Text color={colors.primary}>
        <Spinner type="dots" /> {label}
      </Text>
    </Box>
  )
}

export default Progress
