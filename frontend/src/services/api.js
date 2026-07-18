import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
  timeout: 15000,
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

export async function getFiles() {
  try {
    return unwrap(await api.get('/files'))
  } catch (error) {
    throw normalizeError(error)
  }
}

export async function createPlan(command) {
  try {
    return unwrap(await api.post('/plan', { command }))
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

export async function undoLastOperation() {
  try {
    return unwrap(await api.post('/undo'))
  } catch (error) {
    throw normalizeError(error)
  }
}
