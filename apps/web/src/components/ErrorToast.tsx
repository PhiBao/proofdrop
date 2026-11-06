export function ErrorToast({ message, onClose }: { message: string | null; onClose: () => void }) {
  if (!message) return null

  return (
    <div className="toast toast-error" role="alert">
      <span className="toast-mark" aria-hidden="true">!</span>
      <div className="toast-body">
        <span className="mono-label">ERROR</span>
        <p>{message}</p>
      </div>
      <button className="toast-close" onClick={onClose} aria-label="Dismiss error">×</button>
    </div>
  )
}
