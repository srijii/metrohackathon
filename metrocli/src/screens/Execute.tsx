import React from 'react'
import LogView from '../components/LogView.js'

type ExecuteProps = {
  logs: string[]
}

function Execute({ logs }: ExecuteProps) {
  return <LogView logs={logs} />
}

export default Execute
