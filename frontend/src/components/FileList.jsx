import { File, Folder, RefreshCw } from 'lucide-react'

function formatSize(size) {
  if (size < 1024) return `${size} B`
  return `${(size / 1024).toFixed(1)} KB`
}

function FileList({ files, onRefresh }) {
  return (
    <aside className="panel file-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">backend/demo</p>
          <h2>Demo folder</h2>
        </div>
        <button type="button" className="icon-button" onClick={onRefresh}>
          <RefreshCw size={18} />
        </button>
      </div>

      <div className="file-list">
        {files.map((item) => (
          <div key={`${item.type}-${item.name}`} className="file-row">
            {item.type === 'folder' ? <Folder size={18} /> : <File size={18} />}
            <div>
              <p>{item.name}</p>
              <span>
                {item.type} · {formatSize(item.size)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </aside>
  )
}

export default FileList
