import {
  ArrowUp,
  File,
  Folder,
  Monitor,
  RefreshCw,
  ShieldCheck,
  Terminal,
} from 'lucide-react'

function formatSize(size) {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

function FileList({ context, onGoUp, onOpenFolder, onRefresh }) {
  const entries = context?.entries || []

  return (
    <aside className="panel file-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Workspace</p>
          <h2>File manager</h2>
        </div>
        <button type="button" className="icon-button" onClick={onRefresh}>
          <RefreshCw size={18} />
        </button>
      </div>

      <div className="file-list">
        {context ? (
          <>
            <div className="cwd-card">
              <Terminal size={18} />
              <div>
                <span>Current directory</span>
                <strong>{context.cwd}</strong>
              </div>
            </div>

            <div className="runtime-grid">
              <div className="runtime-item">
                <Monitor size={16} />
                <span>{context.platform}</span>
              </div>
              <div className="runtime-item">
                <ShieldCheck size={16} />
                <span>{context.allowedCommands.length} commands</span>
              </div>
            </div>

            <div className="file-meta">
              <Monitor size={18} />
              <div>
                <p>{context.os}</p>
                <span>{context.shell}</span>
              </div>
            </div>

            <div className="directory-toolbar">
              <button
                type="button"
                className="secondary-button"
                disabled={context.cwd === '.'}
                onClick={onGoUp}
              >
                <ArrowUp size={16} />
                Up
              </button>
              <span>{entries.length} items</span>
            </div>

            <div className="directory-list">
              {entries.length > 0 ? (
                entries.map((entry) => {
                  const isFolder = entry.type === 'folder'

                  return (
                    <button
                      key={entry.path}
                      type="button"
                      className="file-row"
                      disabled={!isFolder}
                      onClick={() => isFolder && onOpenFolder(entry.path)}
                    >
                      {isFolder ? <Folder size={18} /> : <File size={18} />}
                      <div>
                        <p>{entry.name}</p>
                        <span>
                          {isFolder
                            ? 'Folder'
                            : `${entry.extension || 'file'} · ${formatSize(entry.size)}`}
                        </span>
                      </div>
                    </button>
                  )
                })
              ) : (
                <p className="muted">This directory is empty.</p>
              )}
            </div>
          </>
        ) : (
          <p className="muted">Loading context...</p>
        )}
      </div>
    </aside>
  )
}

export default FileList
