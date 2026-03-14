"use client"

import { useState } from "react"
import { Check, Maximize2, Layers, Sparkles, LayoutGrid, ChevronDown, ChevronRight, Trash2 } from "lucide-react"

interface TreeItem {
  id: string
  label: string
  children?: TreeItem[]
}

export default function WorkspacePage() {
  const [activeTab, setActiveTab] = useState("PREVIEW")
  const [activeRenderMode, setActiveRenderMode] = useState<"batch" | "individual">("batch")
  const [expandedItems, setExpandedItems] = useState<string[]>(["root", "header", "body", "shortcuts", "footer"])
  const [selectedItem, setSelectedItem] = useState<string>("header-component")

  const tabs = ["PREVIEW", "FLOW", "DIAGRAM", "CODE"]

  const treeData: TreeItem[] = [
    {
      id: "root",
      label: "신한카드 메인 기획",
      children: [
        {
          id: "header",
          label: "Header",
          children: [
            { id: "header-component", label: "헤더 컴포넌트" }
          ]
        },
        {
          id: "body",
          label: "Body",
          children: [
            { id: "top-banner", label: "최상단 배너" },
            { id: "depth2-list", label: "deth 2 - ui렌더링 된 리스트" },
            {
              id: "shortcuts",
              label: "슈퍼솔 로고 및 바로가기 (모듈4)",
              children: [
                { id: "logo-image", label: "로고 이미지" },
                { id: "shortcut-button", label: "바로가기 버튼" }
              ]
            }
          ]
        },
        {
          id: "footer",
          label: "Footer",
          children: [
            { id: "support", label: "고객지원 및 공지사항" }
          ]
        }
      ]
    }
  ]

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    )
  }

  const renderTreeItem = (item: TreeItem, depth: number = 0) => {
    const hasChildren = item.children && item.children.length > 0
    const isExpanded = expandedItems.includes(item.id)
    const isSelected = selectedItem === item.id
    const paddingLeft = depth * 20 + 8

    return (
      <div key={item.id}>
        <div
          className={`flex items-center justify-between py-2 px-3 rounded-lg cursor-pointer transition-colors ${
            isSelected ? "bg-[#8b5cf6] text-white" : "hover:bg-[#f8fafc]"
          }`}
          style={{ paddingLeft: `${paddingLeft}px` }}
          onClick={() => {
            setSelectedItem(item.id)
            if (hasChildren) toggleExpand(item.id)
          }}
        >
          <div className="flex items-center gap-2">
            {hasChildren ? (
              isExpanded ? (
                <ChevronDown className={`w-4 h-4 ${isSelected ? "text-white" : "text-[#64748b]"}`} />
              ) : (
                <ChevronRight className={`w-4 h-4 ${isSelected ? "text-white" : "text-[#64748b]"}`} />
              )
            ) : (
              <span className={`w-1.5 h-1.5 rounded-full ml-0.5 ${isSelected ? "bg-white" : "bg-[#8b5cf6]"}`} />
            )}
            <span className={`text-[13px] ${isSelected ? "text-white font-medium" : "text-[#475569]"}`}>
              {item.label}
            </span>
          </div>
          <button
            className={`p-1 rounded hover:bg-black/10 transition-colors ${isSelected ? "text-white/70" : "text-[#c8d2e1]"}`}
            onClick={(e) => e.stopPropagation()}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
        {hasChildren && isExpanded && (
          <div>
            {item.children!.map(child => renderTreeItem(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="flex flex-1">
        {/* Left Sidebar */}
        <aside className="flex-[1] flex flex-col bg-white">
          <div className="flex items-center gap-2.5 px-5 py-4">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#8b5cf6] to-[#7c3aed] flex items-center justify-center shadow-sm">
              <Layers className="w-4 h-4 text-white" />
            </div>
            <span className="text-[15px] font-semibold text-[#0f172a]">Workspace</span>
          </div>

          <div className="flex-1 flex flex-col p-5">
            <button className="w-full h-11 bg-[#f1f5f9] text-[#94a3b8] rounded-lg flex items-center justify-center gap-2 mb-4 cursor-not-allowed">
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
                className={`flex-1 h-10 rounded-lg flex items-center justify-center gap-2 text-[13px] font-medium transition-colors ${
                  activeRenderMode === "batch"
                    ? "bg-[#8b5cf6] text-white"
                    : "bg-white text-[#94a3b8] border border-[#e4eaf2]"
                }`}
              >
                <Sparkles className="w-4 h-4" />
                일괄 UI렌더링
              </button>
              <button
                onClick={() => setActiveRenderMode("individual")}
                className={`flex-1 h-10 rounded-lg flex items-center justify-center gap-2 text-[13px] font-medium transition-colors ${
                  activeRenderMode === "individual"
                    ? "bg-[#8b5cf6] text-white"
                    : "bg-white text-[#94a3b8] border border-[#e4eaf2]"
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

            <div className="mb-2">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#475569]" />
                <span className="text-[12px] text-[#475569]">변경 전 원본 시나리오</span>
              </div>
              <div className="border border-[#e4eaf2] rounded-xl p-4 bg-[#f8fafc] min-h-[140px]">
                <p className="text-[12px] text-[#94a3b8] leading-relaxed">
                  예) 기업용 대시보드 메인화면을 만들어줘. 좌측엔 메뉴바, 우측엔 통계 그래프 3개...
                </p>
              </div>
            </div>

            <div className="mt-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6]" />
                <span className="text-[12px] text-[#8b5cf6]">변경 후 시나리오 (렌더링 대상)</span>
              </div>
              <div className="border border-[#e4eaf2] rounded-xl p-4 bg-white min-h-[140px]">
                <p className="text-[12px] text-[#94a3b8] leading-relaxed">
                  예) 기업용 대시보드 메인화면을 만들어줘. 좌측엔 메뉴바, 우측엔 통계 그래프 3개...
                </p>
              </div>
            </div>
          </div>
        </aside>

        {/* Center Group - Project Tree */}
        <div className="flex-[1.33] flex flex-col">
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

          <div className="flex-1 px-6 pb-6 flex flex-col">
            <div className="bg-[#8b5cf6] rounded-xl px-5 py-4 mb-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-white/70 uppercase tracking-wider">ACTIVE PLAN</span>
                <h2 className="text-[16px] font-semibold text-white mt-0.5">신한카드 메인 기획</h2>
              </div>
              <div className="text-right">
                <span className="px-2 py-0.5 bg-white/20 text-white text-[10px] font-medium rounded">v1.0</span>
                <p className="text-[10px] text-white/70 mt-1">Stable Build</p>
              </div>
            </div>

            <div className="flex-1 overflow-auto">
              {treeData.map(item => renderTreeItem(item))}
            </div>
          </div>
        </div>

        {/* Right Group - Preview */}
        <aside className="flex-[1.7] flex flex-col bg-white">
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

          <div className="flex-1 flex items-center justify-center p-6">
            <div className="w-[280px] h-[580px] bg-[#1a1a1a] rounded-[40px] p-3 shadow-xl">
              <div className="w-full h-full bg-[#f5f5f5] rounded-[32px] relative overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120px] h-[28px] bg-[#1a1a1a] rounded-b-2xl" />
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-[13px] text-[#94a3b8]">Preview</span>
                </div>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-[100px] h-[4px] bg-[#1a1a1a] rounded-full" />
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
