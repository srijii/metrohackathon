import React from 'react'
import { Box, Text } from 'ink'
import type { ProjectContext } from '../state/app.js'
import { colors } from '../utils/colors.js'
import { compactPath, truncate } from '../utils/text.js'

type ProjectSummaryProps = {
  compact?: boolean
  minimal?: boolean
  context: ProjectContext | null
}

function ProjectSummary({ compact = false, context, minimal = false }: ProjectSummaryProps) {
  return (
    <Box flexDirection="column" borderStyle="round" borderColor={colors.border} paddingX={1}>
      <Box justifyContent="space-between">
        <Text color={colors.primary} bold>
          Project
        </Text>
        {context ? <Text color={context.modifiedFiles === 0 ? colors.success : colors.warning}>{context.gitStatus}</Text> : null}
      </Box>
      {!context ? (
        <Text color={colors.muted}>Analyzing workspace...</Text>
      ) : (
        <>
          <Text>Name: {truncate(context.projectName, 28)}</Text>
          <Text>Branch: {truncate(context.branch, 28)}</Text>
          <Text>Stack: {context.framework} / {context.backend}</Text>
          {!minimal ? <Text>Data: {context.database} | Tests: {context.testing}</Text> : null}
          {!minimal ? <Text>Tools: {context.packageManager}, {context.linting}, {context.docker ? 'Docker' : 'no Docker'}</Text> : null}
          <Text>Files indexed: {context.fileCount}</Text>

          <Box flexDirection="column" marginTop={minimal ? 0 : 1}>
            <Text color={colors.primary} bold>
              Repository Health
            </Text>
            <Text>{context.branch === 'no git branch' ? '[!]' : '[ok]'} Git: {truncate(context.branch, 24)}</Text>
            <Text>{context.nodeDetected ? '[ok]' : '[!]'} Node: {context.nodeDetected ? 'detected' : 'missing'}</Text>
            <Text>Modified files: {context.modifiedFiles}</Text>
          </Box>

          {!compact && !minimal ? <Box flexDirection="column" marginTop={1}>
            <Text color={colors.primary} bold>
              Project Graph
            </Text>
            <Text>Frontend {'->'} <Text color={colors.muted}>{context.framework}</Text></Text>
            <Text>Backend  {'->'} <Text color={colors.muted}>{context.backend}</Text></Text>
            <Text>Database {'->'} <Text color={colors.muted}>{context.database}</Text></Text>
            <Text>Deploy   {'->'} <Text color={colors.muted}>{context.docker ? 'Docker' : 'local only'}</Text></Text>
          </Box> : null}

          {!minimal ? <Box flexDirection="column" marginTop={1}>
            <Text color={colors.primary} bold>
              Current Directory
            </Text>
            <Text color={colors.success}>{compactPath(context.root, context.cwd, 34)}</Text>
          </Box> : null}

          {!minimal ? <Box flexDirection="column" marginTop={1}>
            <Text color={colors.primary} bold>
              Suggestions
            </Text>
            {context.suggestions.length === 0 ? (
              <Text color={colors.success}>No obvious gaps detected.</Text>
            ) : (
              context.suggestions.slice(0, compact ? 2 : 3).map((suggestion) => (
                <Text key={suggestion} color={colors.warning}>
                  [!] {truncate(suggestion, 32)}
                </Text>
              ))
            )}
          </Box> : null}

          {!compact && !minimal ? <Box flexDirection="column" marginTop={1}>
            <Text color={colors.primary} bold>
              Recent Files
            </Text>
            {context.recentFiles.length === 0 ? (
              <Text color={colors.muted}>No files found.</Text>
            ) : (
              context.recentFiles.slice(0, 5).map((file) => (
                <Text key={file.path} color={colors.muted}>
                  {truncate(file.path, 34)}
                </Text>
              ))
            )}
          </Box> : null}
        </>
      )}
    </Box>
  )
}

export default ProjectSummary
