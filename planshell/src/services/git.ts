import { execa } from 'execa'

export async function getBranch(cwd: string) {
  try {
    const { stdout } = await execa('git', ['branch', '--show-current'], {
      cwd,
      reject: false,
    })
    return stdout.trim() || 'no git branch'
  } catch {
    return 'no git branch'
  }
}

export async function getGitStatus(cwd: string) {
  try {
    const { stdout } = await execa('git', ['status', '--short'], {
      cwd,
      reject: false,
    })
    return stdout.trim() ? 'changes present' : 'clean'
  } catch {
    return 'not a git repo'
  }
}
