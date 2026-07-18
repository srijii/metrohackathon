import React from 'react'
import { Box, Text } from 'ink'
import type { ProjectContext } from '../state/app.js'
import { colors } from '../utils/colors.js'
import { icons } from '../utils/icons.js'

type FileTreeProps = {
  context: ProjectContext | null
}

function formatSize(size: number) {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

function FileTree({ context }: FileTreeProps) {
  return (
    <Box flexDirection="column" borderStyle="round" borderColor={colors.border} paddingX={1}>
      <Text color={colors.primary} bold>
        File Manager
      </Text>
      {!context ? (
        <Text color={colors.muted}>Loading files...</Text>
      ) : (
        <>
          <Text color={colors.success}>{context.cwd}</Text>
          <Box flexDirection="column" marginTop={1}>
            {context.entries.length === 0 ? (
              <Text color={colors.muted}>Directory is empty.</Text>
            ) : (
              context.entries.map((entry) => (
                <Text key={entry.path}>
                  {entry.type === 'folder' ? icons.folder : icons.file} {entry.name}
                  <Text color={colors.muted}> {entry.type === 'file' ? formatSize(entry.size) : ''}</Text>
                </Text>
              ))
            )}
          </Box>
          <Text color={colors.muted}>Tip: type "cd folder-name" to navigate.</Text>
        </>
      )}
    </Box>
  )
}

export default FileTree
