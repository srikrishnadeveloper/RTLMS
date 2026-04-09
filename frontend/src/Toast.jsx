import { useState, useCallback } from 'react'
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react'

const ICONS = { success: CheckCircle, error: XCircle, warn: AlertTriangle, info: Info }
const STYLES = {
  success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  warn: 'bg-amber-50 border-amber-200 text-amber-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800',
}

export function useToast() {
  const [toasts, setToasts] = useState([])
  const add = useCallback((type, message) => {
    const id = Date.now()
    setToasts(t => [...t, { id, type, message }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000)
  }, [])
  const remove = useCallback((id) => setToasts(t => t.filter(x => x.id !== id)), [])
  return { toasts, add, remove }
}

export default function Toast({ toasts, remove }) {
  if (!toasts?.length) return null
  return (
    <div className="fixed bottom-4 right-4 z-[999] flex flex-col gap-2 max-w-sm">
      {toasts.map(t => {
        const Icon = ICONS[t.type] || Info
        return (
          <div key={t.id} className={`flex items-start gap-2 px-4 py-3 rounded-lg border shadow-sm text-sm animate-[slideUp_0.2s_ease-out] ${STYLES[t.type] || STYLES.info}`}>
            <Icon size={16} className="mt-0.5 shrink-0" />
            <span className="flex-1">{t.message}</span>
            <button onClick={() => remove(t.id)} className="shrink-0 hover:opacity-70"><X size={14} /></button>
          </div>
        )
      })}
    </div>
  )
}
