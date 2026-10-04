import { useRef, useState } from 'react'
import { Download, FileArchive, FileImage, FileText, FileVideo, Link2, Share2, Sparkles, Upload, X } from 'lucide-react'
import { QRCodeCanvas } from 'qrcode.react'
import './App.css'

type Mode = 'content' | 'file'

function App() {
  const [mode, setMode] = useState<Mode>('content')
  const [content, setContent] = useState('https://')
  const [file, setFile] = useState<File | null>(null)
  const [fileUrl, setFileUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [copied, setCopied] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const qrRef = useRef<HTMLCanvasElement>(null)

  const qrValue = mode === 'content' ? content : fileUrl
  const canGenerate = mode === 'content' ? content.trim().length > 0 : Boolean(file && fileUrl && !uploading)
  const selectFile = async (selectedFile?: File) => {
    if (!selectedFile) return
    if (selectedFile.size > 100 * 1024 * 1024) {
      setUploadError('Files must be smaller than 100 MB.')
      return
    }
    setUploadError('')
    setFile(selectedFile)
    setFileUrl('')
    setUploading(true)
    const formData = new FormData()
    formData.append('file', selectedFile)
    try {
      const response = await fetch('/.netlify/functions/file', { method: 'POST', body: formData })
      const result = await response.json() as { url?: string; error?: string }
      if (!response.ok || !result.url) throw new Error(result.error || 'Upload failed.')
      setFileUrl(result.url)
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Upload failed. Please try again.')
      setFile(null)
    } finally {
      setUploading(false)
    }
  }
  const clearFile = () => {
    setFileUrl('')
    setFile(null)
    setUploadError('')
  }

  const downloadQr = () => {
    if (!qrRef.current || !canGenerate) return
    const link = document.createElement('a')
    link.download = `anyqr-${mode}.png`
    link.href = qrRef.current.toDataURL('image/png')
    link.click()
  }

  const shareQr = async () => {
    if (!qrValue) return
    try {
      await navigator.clipboard.writeText(qrValue)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch { setCopied(false) }
  }

  const FileIcon = file?.type.startsWith('image/') ? FileImage : file?.type === 'application/pdf' ? FileText : file?.type.startsWith('video/') ? FileVideo : FileArchive

  return (
    <main className="app-shell">
      <header className="topbar"><a className="brand" href="/" aria-label="AnyQR home"><span className="brand-mark"><Sparkles size={16} /></span>any<span>qr</span></a><div className="topbar-note"><span className="status-dot" />Runs in your browser</div></header>
      <section className="intro"><p className="eyebrow">UNIVERSAL QR GENERATOR</p><h1>Turn anything into<br /><em>a scannable moment.</em></h1><p className="intro-copy">Links, notes, files and more. Create a clean QR code in seconds, with files hosted securely on Netlify.</p></section>
      <section className="workspace" aria-label="QR code generator">
        <div className="builder panel">
          <div className="panel-heading"><div><p className="section-kicker">01 / SOURCE</p><h2>What are we encoding?</h2></div><span className="step-count">1 of 2</span></div>
          <div className="mode-switch" role="tablist" aria-label="QR source type"><button className={mode === 'content' ? 'active' : ''} onClick={() => setMode('content')} role="tab" aria-selected={mode === 'content'}><Link2 size={17} />Link or text</button><button className={mode === 'file' ? 'active' : ''} onClick={() => setMode('file')} role="tab" aria-selected={mode === 'file'}><Upload size={17} />A file</button></div>
          {mode === 'content' ? <div className="field-wrap"><label htmlFor="content">Paste a URL or write a message</label><textarea id="content" value={content} onChange={(event) => setContent(event.target.value)} placeholder="https://anywhere.com" rows={6} /><div className="field-footer"><span>Supports links, plain text and contact details</span><span>{content.length} characters</span></div></div> : <div className="file-area"><input ref={inputRef} type="file" accept="image/*,.pdf,.zip,video/*" onChange={(event) => selectFile(event.target.files?.[0])} hidden />{!file ? <button className="dropzone" onClick={() => inputRef.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); selectFile(event.dataTransfer.files[0]) }}><span className="upload-icon"><Upload size={22} /></span><strong>Drop a file here</strong><span>or click to browse</span><small>Images, PDF, ZIP or video · max 100 MB</small></button> : <div className="selected-file"><span className="file-type-icon"><FileIcon size={22} /></span><div><strong>{file.name}</strong><span>{(file.size / 1024 / 1024).toFixed(2)} MB · {uploading ? 'Uploading to Netlify...' : 'Ready to share'}</span></div><button className="icon-button" onClick={clearFile} aria-label="Remove file"><X size={17} /></button></div>}</div>}
          {mode === 'file' && file && !uploadError && <p className="local-note">{uploading ? 'Uploading securely. Your QR will be ready in a moment.' : 'Hosted securely on Netlify. This QR works when scanned from another device.'}</p>}
          {mode === 'file' && uploadError && <p className="local-note error-note">{uploadError}</p>}
        </div>
        <div className="preview panel"><div className="panel-heading"><div><p className="section-kicker">02 / PREVIEW</p><h2>Your QR code</h2></div><span className="live-pill"><span />Live</span></div><div className={`qr-stage ${!canGenerate ? 'empty' : ''}`}>{canGenerate ? <QRCodeCanvas ref={qrRef} value={qrValue} size={216} level="H" includeMargin bgColor="#fffdf8" fgColor="#17211d" /> : <div className="empty-qr"><span>QR</span><p>Your code will appear here</p></div>}</div><div className="preview-meta"><span className="meta-dot" />{canGenerate ? 'Ready to scan' : 'Waiting for your input'}<span className="meta-divider" />{mode === 'file' ? 'File' : 'Content'}</div><div className="actions"><button className="primary-button" onClick={downloadQr} disabled={!canGenerate}><Download size={18} />Download PNG</button><button className="secondary-button" onClick={shareQr} disabled={!canGenerate}><Share2 size={17} />{copied ? 'Copied' : 'Copy source'}</button></div></div>
      </section>
      <footer><span>ANYQR / 2026</span><span>Files hosted securely by Netlify.</span></footer>
    </main>
  )
}

export default App
