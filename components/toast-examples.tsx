"use client"

import { useState } from "react"
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"

type ToastType = "success" | "error" | "warning" | "info"

interface Toast {
  id: number
  type: ToastType
  title: string
  message: string
}

export function ToastExamples() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = (type: ToastType, title: string, message: string) => {
    const id = Date.now()
    setToasts((prev) => [...prev, { id, type, title, message }])

    // Auto remove after 5 seconds
    setTimeout(() => {
      removeToast(id)
    }, 5000)
  }

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <div>
      {/* Toast Triggers */}
      <div className="flex flex-wrap gap-4">
        <Button
          onClick={() => addToast("success", "성공", "작업이 완료되었습니다.")}
          className="bg-[#10b981] hover:bg-[#059669]"
        >
          성공 토스트
        </Button>
        <Button
          onClick={() => addToast("error", "오류", "문제가 발생했습니다.")}
          variant="destructive"
        >
          오류 토스트
        </Button>
        <Button
          onClick={() => addToast("warning", "경고", "주의가 필요합니다.")}
          className="bg-[#fb923c] hover:bg-[#ea580c]"
        >
          경고 토스트
        </Button>
        <Button
          onClick={() => addToast("info", "정보", "새로운 업데이트가 있습니다.")}
          className="bg-[#06b6d4] hover:bg-[#0891b2]"
        >
          정보 토스트
        </Button>
      </div>

      {/* Toast Container - Bottom Right */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
        ))}
      </div>
    </div>
  )
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const config = {
    success: {
      icon: CheckCircle,
      bg: "bg-[#10b981]",
      iconColor: "text-white",
    },
    error: {
      icon: AlertCircle,
      bg: "bg-[#e11d48]",
      iconColor: "text-white",
    },
    warning: {
      icon: AlertTriangle,
      bg: "bg-[#fb923c]",
      iconColor: "text-white",
    },
    info: {
      icon: Info,
      bg: "bg-[#06b6d4]",
      iconColor: "text-white",
    },
  }

  const { icon: Icon, bg, iconColor } = config[toast.type]

  return (
    <div className="animate-in slide-in-from-right fade-in duration-300 flex w-80 items-start gap-3 rounded-lg border border-border bg-card p-4 shadow-lg">
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${bg}`}>
        <Icon className={`h-4 w-4 ${iconColor}`} />
      </div>
      <div className="flex-1">
        <p className="font-semibold">{toast.title}</p>
        <p className="text-sm text-muted-foreground">{toast.message}</p>
      </div>
      <button
        onClick={onClose}
        className="shrink-0 rounded-lg p-1 hover:bg-muted"
      >
        <X className="h-4 w-4 text-muted-foreground" />
      </button>
    </div>
  )
}
