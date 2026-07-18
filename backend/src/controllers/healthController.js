export function getHealth(_req, res) {
  res.json({
    data: {
      ok: true,
      service: 'file-automation',
      timestamp: new Date().toISOString(),
    },
  })
}
