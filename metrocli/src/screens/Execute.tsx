import React from 'react'
import LogView from '../components/LogView.js'

type ExecuteProps = {
  logs: string[]
  maxLines?: number
}

function Execute({ logs, maxLines }: ExecuteProps) {
  return <LogView logs={logs} maxLines={maxLines} />
}

export default Execute
