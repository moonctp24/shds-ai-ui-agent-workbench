"use client"

import { useState } from "react"
import { X, AlertTriangle, CheckCircle, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function ModalExamples() {
  const [activeModal, setActiveModal] = useState<string | null>(null)

  return (
    <div>
      {/* Modal Triggers */}
      <div className="flex flex-wrap gap-4">
        <Button onClick={() => setActiveModal("confirm")} className="bg-[#4f46e5] hover:bg-[#4338ca]">
          확인 모달
        </Button>
        <Button onClick={() => setActiveModal("form")} variant="outline">
          폼 모달
        </Button>
        <Button onClick={() => setActiveModal("alert")} variant="destructive">
          경고 모달
        </Button>
        <Button onClick={() => setActiveModal("success")} className="bg-[#10b981] hover:bg-[#059669]">
          성공 모달
        </Button>
        <Button onClick={() => setActiveModal("info")} className="bg-[#06b6d4] hover:bg-[#0891b2]">
          정보 모달
        </Button>
      </div>

      {/* Confirm Modal */}
      {activeModal === "confirm" && (
        <ModalOverlay onClose={() => setActiveModal(null)}>
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between">
              <h3 className="text-lg font-semibold">작업 확인</h3>
              <button
                onClick={() => setActiveModal(null)}
                className="rounded-lg p-1 hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mb-6 text-sm text-muted-foreground">
              이 작업을 진행하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setActiveModal(null)}>
                취소
              </Button>
              <Button className="bg-[#4f46e5] hover:bg-[#4338ca]" onClick={() => setActiveModal(null)}>
                확인
              </Button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* Form Modal */}
      {activeModal === "form" && (
        <ModalOverlay onClose={() => setActiveModal(null)}>
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold">새 프로젝트</h3>
                <p className="text-sm text-muted-foreground">프로젝트 정보를 입력하세요</p>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="rounded-lg p-1 hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <Label htmlFor="project-name" className="mb-2 block text-sm">
                  프로젝트명
                </Label>
                <Input id="project-name" placeholder="프로젝트명을 입력하세요" />
              </div>
              <div>
                <Label htmlFor="project-desc" className="mb-2 block text-sm">
                  설명
                </Label>
                <textarea
                  id="project-desc"
                  rows={3}
                  placeholder="프로젝트 설명을 입력하세요"
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setActiveModal(null)}>
                취소
              </Button>
              <Button className="bg-[#4f46e5] hover:bg-[#4338ca]" onClick={() => setActiveModal(null)}>
                생성
              </Button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* Alert Modal */}
      {activeModal === "alert" && (
        <ModalOverlay onClose={() => setActiveModal(null)}>
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
            <div className="mb-4 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#e11d48]/10">
                <AlertTriangle className="h-6 w-6 text-[#e11d48]" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#e11d48]">삭제 경고</h3>
                <p className="text-sm text-muted-foreground">이 작업은 되돌릴 수 없습니다</p>
              </div>
            </div>
            <p className="mb-6 text-sm text-muted-foreground">
              정말로 이 항목을 삭제하시겠습니까? 모든 관련 데이터가 영구적으로 제거됩니다.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setActiveModal(null)}>
                취소
              </Button>
              <Button variant="destructive" onClick={() => setActiveModal(null)}>
                삭제
              </Button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* Success Modal */}
      {activeModal === "success" && (
        <ModalOverlay onClose={() => setActiveModal(null)}>
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 text-center shadow-xl">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#10b981]/10">
              <CheckCircle className="h-8 w-8 text-[#10b981]" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">성공!</h3>
            <p className="mb-6 text-sm text-muted-foreground">
              작업이 성공적으로 완료되었습니다.
            </p>
            <Button
              className="w-full bg-[#10b981] hover:bg-[#059669]"
              onClick={() => setActiveModal(null)}
            >
              확인
            </Button>
          </div>
        </ModalOverlay>
      )}

      {/* Info Modal */}
      {activeModal === "info" && (
        <ModalOverlay onClose={() => setActiveModal(null)}>
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
            <div className="mb-4 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#06b6d4]/10">
                <Info className="h-6 w-6 text-[#06b6d4]" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">안내</h3>
              </div>
            </div>
            <div className="mb-6 space-y-2 text-sm text-muted-foreground">
              <p>• AI 어시스턴트는 24시간 이용 가능합니다.</p>
              <p>• 대화 내용은 자동으로 저장됩니다.</p>
              <p>• 설정에서 알림을 관리할 수 있습니다.</p>
            </div>
            <Button
              className="w-full bg-[#06b6d4] hover:bg-[#0891b2]"
              onClick={() => setActiveModal(null)}
            >
              확인
            </Button>
          </div>
        </ModalOverlay>
      )}
    </div>
  )
}

function ModalOverlay({
  children,
  onClose,
}: {
  children: React.ReactNode
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 animate-in fade-in zoom-in-95 duration-200">
        {children}
      </div>
    </div>
  )
}
