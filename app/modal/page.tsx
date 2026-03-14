"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, X, AlertTriangle, CheckCircle, Info, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function ModalPage() {
  const [activeModal, setActiveModal] = useState<string | null>(null)

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
              <h1 className="text-lg font-semibold">모달 컴포넌트</h1>
              <p className="text-xs text-gray-500">Modal Components</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        {/* Modal Triggers */}
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">모달 유형</h2>
          <div className="flex flex-wrap gap-4">
            <Button onClick={() => setActiveModal("confirm")} className="bg-[#4f46e5] hover:bg-[#4338ca]">
              확인 모달
            </Button>
            <Button onClick={() => setActiveModal("form")} variant="outline">
              폼 모달
            </Button>
            <Button onClick={() => setActiveModal("alert")} className="bg-[#e11d48] hover:bg-[#be123c]">
              경고 모달
            </Button>
            <Button onClick={() => setActiveModal("success")} className="bg-[#10b981] hover:bg-[#059669]">
              성공 모달
            </Button>
            <Button onClick={() => setActiveModal("info")} className="bg-[#06b6d4] hover:bg-[#0891b2]">
              정보 모달
            </Button>
          </div>
        </div>

        {/* Preview Area */}
        <div className="mt-6 rounded-xl bg-gray-100 p-8">
          <p className="text-center text-sm text-gray-500">버튼을 클릭하여 모달을 확인하세요</p>
        </div>
      </main>

      {/* Confirm Modal */}
      {activeModal === "confirm" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setActiveModal(null)} />
          <div className="relative z-10 w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between">
              <h3 className="text-lg font-semibold">작업 확인</h3>
              <button onClick={() => setActiveModal(null)} className="rounded-lg p-1 hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mb-6 text-sm text-gray-600">
              이 작업을 진행하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setActiveModal(null)}>취소</Button>
              <Button className="bg-[#4f46e5] hover:bg-[#4338ca]" onClick={() => setActiveModal(null)}>확인</Button>
            </div>
          </div>
        </div>
      )}

      {/* Form Modal */}
      {activeModal === "form" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setActiveModal(null)} />
          <div className="relative z-10 w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold">새 프로젝트</h3>
                <p className="text-sm text-gray-500">프로젝트 정보를 입력하세요</p>
              </div>
              <button onClick={() => setActiveModal(null)} className="rounded-lg p-1 hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <Label className="mb-2 block text-sm">프로젝트명</Label>
                <Input placeholder="프로젝트명을 입력하세요" />
              </div>
              <div>
                <Label className="mb-2 block text-sm">설명</Label>
                <textarea
                  rows={3}
                  placeholder="프로젝트 설명을 입력하세요"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#4f46e5] focus:ring-2 focus:ring-[#4f46e5]/20"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setActiveModal(null)}>취소</Button>
              <Button className="bg-[#4f46e5] hover:bg-[#4338ca]" onClick={() => setActiveModal(null)}>생성</Button>
            </div>
          </div>
        </div>
      )}

      {/* Alert Modal */}
      {activeModal === "alert" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setActiveModal(null)} />
          <div className="relative z-10 w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#e11d48]/10">
                <AlertTriangle className="h-6 w-6 text-[#e11d48]" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#e11d48]">삭제 경고</h3>
                <p className="text-sm text-gray-500">이 작업은 되돌릴 수 없습니다</p>
              </div>
            </div>
            <p className="mb-6 text-sm text-gray-600">
              정말로 이 항목을 삭제하시겠습니까? 모든 관련 데이터가 영구적으로 제거됩니다.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setActiveModal(null)}>취소</Button>
              <Button className="bg-[#e11d48] hover:bg-[#be123c]" onClick={() => setActiveModal(null)}>삭제</Button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {activeModal === "success" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setActiveModal(null)} />
          <div className="relative z-10 w-full max-w-md rounded-xl bg-white p-6 text-center shadow-2xl">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#10b981]/10">
              <CheckCircle className="h-8 w-8 text-[#10b981]" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">성공!</h3>
            <p className="mb-6 text-sm text-gray-600">작업이 성공적으로 완료되었습니다.</p>
            <Button className="w-full bg-[#10b981] hover:bg-[#059669]" onClick={() => setActiveModal(null)}>
              확인
            </Button>
          </div>
        </div>
      )}

      {/* Info Modal */}
      {activeModal === "info" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setActiveModal(null)} />
          <div className="relative z-10 w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#06b6d4]/10">
                <Info className="h-6 w-6 text-[#06b6d4]" />
              </div>
              <h3 className="text-lg font-semibold">안내</h3>
            </div>
            <div className="mb-6 space-y-2 text-sm text-gray-600">
              <p>• AI 어시스턴트는 24시간 이용 가능합니다.</p>
              <p>• 대화 내용은 자동으로 저장됩니다.</p>
              <p>• 설정에서 알림을 관리할 수 있습니다.</p>
            </div>
            <Button className="w-full bg-[#06b6d4] hover:bg-[#0891b2]" onClick={() => setActiveModal(null)}>
              확인
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
