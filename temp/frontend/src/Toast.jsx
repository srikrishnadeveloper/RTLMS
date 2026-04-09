import { createContext, useCallback, useContext, useState } from 'react'

const ToastCtx = createContext(null)

let id = 0
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const add = useCallback((msg, type = 'info') => {
    const tid = ++id
    setToasts(t => [...t, { id: tid, msg, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== tid)), 4000)
  }, [])

  const colors = {
    success: 'bg-emerald-500/15 border border-emerald-500/20 text-emerald-400',
    error: 'bg-red-500/15 border border-red-500/20 text-red-400',
    info: 'bg-blue-500/15 border border-blue-500/20 text-blue-400',
    warn: 'bg-amber-500/15 border border-amber-500/20 text-amber-400',
  }

  return (
    <ToastCtx.Provider value={add}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className={`toast-enter ${colors[t.type] || colors.info} backdrop-blur-lg px-4 py-3 rounded-xl shadow-2xl text-sm font-medium max-w-xs`}>
            {t.msg}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

export const useToast = () => useContext(ToastCtx)
