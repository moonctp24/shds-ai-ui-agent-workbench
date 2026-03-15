"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, X, CheckCircle, AlertCircle, AlertTriangle, Info } from "lucide-react"
import { Button } from "@/components/ui/button"

type ToastType = "success" | "error" | "warning" | "info"

interface Toast {
  id: number
  type: ToastType
  title: string
  message: string
}

export default function ToastPage() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = (type: ToastType, title: string, message: string) => {
    const id = Date.now()
    setToasts((prev) => [...prev, { id, type, title, message }])
    setTimeout(() => removeToast(id), 5000)
  }

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <div className="min-h-screen bg-[#f0f4f8]">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center gap-4">
          <Link href="/" className="rounded-lg p-2 hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#4f46e5]">
              <span className="text-sm font-bold text-white">AI</span>
            </div>
            <div>
              <h1 className="text-lg font-semibold">토스트 알림</h1>
              <p className="text-xs text-gray-500">Toast Notifications</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        {/* Toast Triggers */}
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">토스트 유형</h2>
          <div className="flex flex-wrap gap-4">
            <Button
              onClick={() => addToast("success", "성공", "작업이 완료되었습니다.")}
              className="bg-[#10b981] hover:bg-[#059669]"
            >
              성공 토스트
            </Button>
            <Button
              onClick={() => addToast("error", "오류", "문제가 발생했습니다.")}
              className="bg-[#e11d48] hover:bg-[#be123c]"
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
        </div>

        {/* Info */}
        <div className="mt-6 rounded-xl bg-gray-100 p-8">
          <p className="text-center text-sm text-gray-500">
            버튼을 클릭하면 우측 하단에 토스트 알림이 표시됩니다
          </p>
        </div>
      </main>

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
    success: { icon: CheckCircle, bg: "bg-[#10b981]" },
    error: { icon: AlertCircle, bg: "bg-[#e11d48]" },
    warning: { icon: AlertTriangle, bg: "bg-[#fb923c]" },
    info: { icon: Info, bg: "bg-[#06b6d4]" },
  }

  const { icon: Icon, bg } = config[toast.type]

  return (
    <div className="flex w-80 items-start gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-lg animate-in slide-in-from-right">
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${bg}`}>
        <Icon className="h-4 w-4 text-white" />
      </div>
      <div className="flex-1">
        <p className="font-semibold">{toast.title}</p>
        <p className="text-sm text-gray-500">{toast.message}</p>
      </div>
      <button onClick={onClose} className="shrink-0 rounded-lg p-1 hover:bg-gray-100">
        <X className="h-4 w-4 text-gray-400" />
      </button>
    </div>
  )
}
