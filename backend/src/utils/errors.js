export function createHttpError(status, message, code = 'ERROR') {
  const error = new Error(message)
  error.status = status
  error.code = code
  return error
}
