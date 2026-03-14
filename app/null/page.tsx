"use client"

import { useState } from "react"
import { Check, Maximize2, Layers, Sparkles, LayoutGrid } from "lucide-react"

export default function NullPage() {
  const [activeTab, setActiveTab] = useState("PREVIEW")
  const [activeRenderMode, setActiveRenderMode] = useState<"batch" | "individual">("batch")

  const tabs = ["PREVIEW", "FLOW", "DIAGRAM", "CODE"]

  return (
    <div className="h-screen bg-white flex flex-col overflow-hidden">
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <aside className="flex-[1] flex flex-col bg-white overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-4">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#8b5cf6] to-[#7c3aed] flex items-center justify-center shadow-sm">
              <Layers className="w-4 h-4 text-white" />
            </div>
            <span className="text-[15px] font-semibold text-[#0f172a]">Workspace</span>
          </div>

          <div className="flex-1 flex flex-col p-5 overflow-hidden">
            <button className="w-full h-11 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white rounded-lg flex items-center justify-center gap-2 mb-4 transition-colors shadow-sm">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="9" cy="3" r="2" stroke="currentColor" strokeWidth="1.5"/>
                <circle cx="4" cy="11" r="2" stroke="currentColor" strokeWidth="1.5"/>
                <circle cx="14" cy="11" r="2" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M9 5V7M9 7L4 9M9 7L14 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <span className="text-[14px] font-medium">시나리오 트리 분석</span>
            </button>

            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setActiveRenderMode("batch")}
                className={`flex-1 h-10 rounded-lg flex items-center justify-center gap-2 text-[13px] font-medium transition-colors border ${
                  activeRenderMode === "batch"
                    ? "bg-white text-[#475569] border-[#e4eaf2]"
                    : "bg-white text-[#94a3b8] border-[#e4eaf2] hover:border-[#c8d2e1]"
                }`}
              >
                <Sparkles className="w-4 h-4" />
                일괄 UI렌더링
              </button>
              <button
                onClick={() => setActiveRenderMode("individual")}
                className={`flex-1 h-10 rounded-lg flex items-center justify-center gap-2 text-[13px] font-medium transition-colors border ${
                  activeRenderMode === "individual"
                    ? "bg-white text-[#475569] border-[#e4eaf2]"
                    : "bg-white text-[#94a3b8] border-[#e4eaf2] hover:border-[#c8d2e1]"
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
                개별 UI렌더링
              </button>
            </div>

            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-semibold text-[#475569] tracking-widest">SCENARIO EDITOR</span>
              <span className="px-2 py-0.5 bg-[#f1f5f9] text-[#64748b] text-[10px] font-medium rounded">Auto Saved</span>
            </div>

            <div className="flex-1 border border-dashed border-[#c8d2e1] rounded-xl flex items-center justify-center mb-4">
              <p className="text-[13px] text-[#94a3b8] text-center px-8">시나리오를 입력하여 프로젝트를 시작하세요</p>
            </div>

            <div className="border border-[#e4eaf2] rounded-xl p-4 bg-white min-h-[100px]">
              <p className="text-[12px] text-[#94a3b8] leading-relaxed">
                예) 기업용 대시보드 메인화면을 만들어줘. 좌측엔 메뉴바, 우측엔 통계 그래프 3개...
              </p>
            </div>
          </div>
        </aside>

        {/* Center Group - Project Tree */}
        <div className="flex-[1.33] flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md bg-[#8b5cf6]/10 flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="2" y="2" width="5" height="3" rx="0.5" stroke="#8b5cf6" strokeWidth="1.2"/>
                  <rect x="9" y="2" width="5" height="3" rx="0.5" stroke="#8b5cf6" strokeWidth="1.2"/>
                  <rect x="2" y="11" width="5" height="3" rx="0.5" stroke="#8b5cf6" strokeWidth="1.2"/>
                  <path d="M4.5 5V8H11.5V5" stroke="#8b5cf6" strokeWidth="1.2"/>
                  <path d="M4.5 8V11" stroke="#8b5cf6" strokeWidth="1.2"/>
                </svg>
              </div>
              <div className="flex flex-col">
                <span className="text-[14px] font-medium text-[#0f172a]">Project Tree</span>
                <span className="text-[11px] text-[#94a3b8] tracking-wide">1-2-3 HIERARCHY</span>
              </div>
            </div>
            <button className="w-9 h-9 rounded-full border border-[#e4eaf2] flex items-center justify-center hover:bg-[#f8fafc] transition-colors">
              <Check className="w-4 h-4 text-[#8b5cf6]" />
            </button>
          </div>

          <div className="flex-1 px-6 pb-6 flex flex-col overflow-hidden">
            {/* Info Banner */}
            <div className="bg-[#f1f5f9] rounded-lg px-6 py-4 mb-6">
              <p className="text-[13px] text-[#94a3b8] text-center">시나리오 정보가 없습니다</p>
            </div>

            {/* Preview Area */}
            <div className="flex-1 border border-[#c8d2e1] rounded-xl flex items-center justify-center bg-[#fafbfc]">
              <p className="text-[14px] text-[#94a3b8]">시나리오 분석을 대기중입니다</p>
            </div>
          </div>
        </div>

        {/* Right Group - Preview */}
        <aside className="flex-[1.7] flex flex-col bg-white overflow-hidden">
          <div className="flex items-center justify-between px-4 py-4">
            <div className="flex items-center bg-[#f1f5f9] rounded-full p-1">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 text-[11px] font-medium rounded-full transition-all ${
                    activeTab === tab
                      ? "bg-[#0f172a] text-white shadow-sm"
                      : "text-[#64748b] hover:text-[#0f172a]"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
            <button className="w-8 h-8 rounded-full border border-[#e4eaf2] flex items-center justify-center hover:bg-[#f8fafc] transition-colors">
              <Maximize2 className="w-3.5 h-3.5 text-[#64748b]" />
            </button>
          </div>

          <div className="flex-1 flex items-center justify-center p-6 overflow-hidden">
            <span className="text-[14px] text-[#94a3b8]">프리뷰 준비 완료</span>
          </div>
        </aside>
      </div>
    </div>
  )
}
