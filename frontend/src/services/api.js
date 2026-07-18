import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
  timeout: 20000,
})

function unwrap(response) {
  return response.data.data
}

function normalizeError(error) {
  return new Error(
    error.response?.data?.error?.message ||
      error.message ||
      'Request failed',
  )
}

export async function getContext(cwd = '.') {
  try {
    return unwrap(await api.get('/context', { params: { cwd } }))
  } catch (error) {
    throw normalizeError(error)
  }
}

export async function createPlan(command, cwd = '.') {
  try {
    return unwrap(await api.post('/plan', { command, cwd }))
  } catch (error) {
    throw normalizeError(error)
  }
}

export async function executePlan(plan) {
  try {
    return unwrap(await api.post('/execute', { plan }))
  } catch (error) {
    throw normalizeError(error)
  }
}

export async function explainCommand(command) {
  try {
    return unwrap(await api.post('/explain', command))
  } catch (error) {
    throw normalizeError(error)
  }
}
