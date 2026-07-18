import React from 'react'
import { Box, Text } from 'ink'
import { colors } from '../utils/colors.js'

function Settings() {
  return (
    <Box flexDirection="column" borderStyle="round" borderColor={colors.border} paddingX={1}>
      <Text color={colors.primary} bold>
        Settings
      </Text>
      <Text>NVIDIA_MODEL={process.env.NVIDIA_MODEL || 'z-ai/glm-5.2'}</Text>
      <Text>NVIDIA_BASE_URL={process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1'}</Text>
      <Text color={process.env.NVIDIA_API_KEY ? colors.success : colors.warning}>
        NVIDIA_API_KEY={process.env.NVIDIA_API_KEY ? 'configured' : 'missing'}
      </Text>
    </Box>
  )
}

export default Settings
