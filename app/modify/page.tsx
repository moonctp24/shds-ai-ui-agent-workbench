"use client"

import { useState } from "react"
import { Check, Maximize2, Layers, Sparkles, LayoutGrid, ChevronDown, ChevronRight, Trash2, GitBranch, Code2 } from "lucide-react"
import dynamic from "next/dynamic"

const MermaidDiagram = dynamic(() => import("@/components/mermaid-diagram"), { ssr: false })

interface TreeItem {
  id: string
  label: string
  level: number
  isExpanded?: boolean
  isSelected?: boolean
  children?: TreeItem[]
}

export default function Sub1Page() {
  const [activeTab, setActiveTab] = useState("PREVIEW")
  const [activeRenderMode, setActiveRenderMode] = useState<"batch" | "individual">("batch")
  const [expandedItems, setExpandedItems] = useState<string[]>(["root", "header", "body", "shortcuts", "footer"])
  const [selectedItem, setSelectedItem] = useState<string | null>("header-depth2")

  const tabs = ["PREVIEW", "FLOW", "DIAGRAM", "CODE"]

  const treeData: TreeItem[] = [
    {
      id: "root",
      label: "신한카드 메인 기획",
      level: 0,
      children: [
        {
          id: "header",
          label: "Header",
          level: 1,
          children: [
            { id: "header-depth2", label: "deth 2 - 리스트 호버(마우스 올림)", level: 2 }
          ]
        },
        {
          id: "body",
          label: "Body",
          level: 1,
          children: [
            { id: "top-banner", label: "최상단 배너", level: 2, modify:true },
            { id: "depth2-list", label: "deth 2 - ui렌더링 된 리스트", level: 2 },
            {
              id: "shortcuts",
              label: "슈퍼솔 로고 및 바로가기 (모듈4)",
              level: 2,
              children: [
                { id: "logo-image", label: "로고 이미지", level: 3 },
                { id: "shortcut-button", label: "바로가기 버튼", level: 3 }
              ]
            }
          ]
        },
        {
          id: "footer",
          label: "Footer",
          level: 1,
          children: [
            { id: "support", label: "고객지원 및 공지사항", level: 2 }
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
            isSelected ? "bg-[#8b5cf6] text-white" : "hover:bg-[#121726]"
          } group`}
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
              <span className={`w-1.5 h-1.5 rounded-full ml-0.5 ${isSelected ? "bg-white" : "bg-[#8b5cf6]"} group-hover:text-white`} />
            )}
            <span className={`text-[13px] ${isSelected ? "text-white font-medium" : "text-[#475569]"} group-hover:text-white 
              ${item.modify && 'text-[#fb923c]'}
            `}>
              {item.label}
            </span>
          </div>
          <button
            className={`p-1 rounded hover:bg-black/10 transition-colors ${isSelected ? "text-white/70" : "text-[#c8d2e1]"}`}
            onClick={(e) => {
              e.stopPropagation()
            }}
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
    <div className="h-screen bg-white flex flex-col overflow-hidden">
      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Scenario Editor */}
        <aside className="flex-[1] flex flex-col bg-white overflow-hidden">
          {/* Workspace Header */}
          <div className="flex items-center gap-2.5 px-5 py-4">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#8b5cf6] to-[#7c3aed] flex items-center justify-center shadow-sm">
              <Layers className="w-4 h-4 text-white" />
            </div>
            <span className="text-[15px] font-semibold text-[#0f172a]">Workspace</span>
          </div>

          <div className="flex-1 flex flex-col p-5 overflow-hidden">
            {/* Scenario Tree Analysis Button - Disabled state */}
            <button className="w-full h-11 bg-[#f1f5f9] text-[#94a3b8] rounded-lg flex items-center justify-center gap-2 mb-4 cursor-not-allowed">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="9" cy="3" r="2" stroke="currentColor" strokeWidth="1.5"/>
                <circle cx="4" cy="11" r="2" stroke="currentColor" strokeWidth="1.5"/>
                <circle cx="14" cy="11" r="2" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M9 5V7M9 7L4 9M9 7L14 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <span className="text-[14px] font-medium">시나리오 트리 분석</span>
            </button>

            {/* Render Mode Toggle */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setActiveRenderMode("batch")}
                className={`flex-1 h-10 rounded-lg flex items-center justify-center gap-2 text-[13px] font-medium transition-colors ${
                  activeRenderMode === "batch"
                    ? "bg-[#8b5cf6] text-white"
                    : "bg-white text-[#94a3b8] border border-[#e4eaf2] hover:border-[#c8d2e1]"
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
                    : "bg-white text-[#94a3b8] border border-[#e4eaf2] hover:border-[#c8d2e1]"
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
                개별 UI렌더링
              </button>
            </div>

            {/* Scenario Editor Header */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-semibold text-[#475569] tracking-widest">SCENARIO EDITOR</span>
              <span className="px-2 py-0.5 bg-[#f1f5f9] text-[#64748b] text-[10px] font-medium rounded">Auto Saved</span>
            </div>

            {/* Original Scenario */}
            <div className="flex-1 flex flex-col">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#475569]" />
                <span className="text-[12px] text-[#475569]">변경 전 원본 시나리오</span>
              </div>
              <div className="flex-1 border border-[#e4eaf2] rounded-xl p-4 bg-[#f8fafc]">
                <textarea className="text-[12px] text-[#94a3b8] leading-relaxed w-full h-full resize-none">
                  예) 기업용 대시보드 메인화면을 만들어줘. 좌측엔 메뉴바, 우측엔 통계 그래프 3개...
                </textarea>
              </div>
            </div>

            {/* Modified Scenario */}
            <div className="flex-1 flex flex-col mt-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6]" />
                <span className="text-[12px] text-[#8b5cf6]">변경 후 시나리오 (렌더링 대상)</span>
              </div>
              <div className="flex-1 border border-[#fb923c] rounded-xl p-4 bg-white">
                <textarea className="text-[12px] text-[#0f172a] leading-relaxed w-full h-full resize-none">
                  아이콘 몇개
                </textarea>
              </div>
            </div>
          </div>
        </aside>

        {/* Center Group - Project Tree */}
        <div className="flex-[1.33] flex flex-col overflow-hidden">
          {/* Center Header - Project Tree */}
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
            
            {/* Check Button */}
            <button className="w-9 h-9 rounded-full border border-[#e4eaf2] flex items-center justify-center hover:bg-[#f8fafc] transition-colors">
              <Check className="w-4 h-4 text-[#8b5cf6]" />
            </button>
          </div>

          {/* Center Content */}
          <div className="flex-1 px-6 pb-6 flex flex-col overflow-hidden">
            {/* Active Plan Banner */}
            <div className="bg-[#0f172a] rounded-xl px-5 py-4 mb-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-white/70 uppercase tracking-wider">ACTIVE PLAN</span>
                <h2 className="text-[16px] font-semibold text-white mt-0.5">신한카드 메인 기획</h2>
              </div>
              <div className="text-right">
                <span className="px-2 py-0.5 bg-white/20 text-white text-[10px] font-medium rounded">v1.0</span>
                <p className="text-[10px] text-white/70 mt-1">Stable Build</p>
              </div>
            </div>

            {/* Tree Structure */}
            <div className="flex-1 overflow-y-auto">
              {treeData.map(item => renderTreeItem(item))}
            </div>
          </div>
        </div>

        {/* Right Group - Tabs & Preview */}
        <aside className="flex-[1.7] flex flex-col bg-white overflow-hidden">
          {/* Right Header - Tabs */}
          <div className="flex items-center justify-between px-4 py-4">
            {/* Tab Navigation */}
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

            {/* Expand Button */}
            <button className="w-8 h-8 rounded-full border border-[#e4eaf2] flex items-center justify-center hover:bg-[#f8fafc] transition-colors">
              <Maximize2 className="w-3.5 h-3.5 text-[#64748b]" />
            </button>
          </div>

          {/* Right Content - Tab Content */}
          <div className="flex-1 flex items-center justify-center p-6 overflow-hidden">
            {activeTab === "PREVIEW" && (
              /* iPhone Frame */
              <div className="w-[453px] h-[877px] bg-[#1a1a1a] rounded-[40px] p-3 shadow-xl">
                <div className="w-full h-full bg-white rounded-[32px] relative overflow-hidden">
                  {/* Notch */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120px] h-[28px] bg-[#1a1a1a] rounded-b-2xl z-10" />
                  
                  {/* Screen Content */}
                  <div className="w-full h-full overflow-y-auto pt-8">
                    {/* Banner */}
                    <div className="mx-4 mt-2 bg-[#f1f5f9] rounded-lg p-4 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-[#d9d9d9] rounded" />
                        <span className="text-[12px] text-[#475569] font-medium">랜덤 퍼펙트발간!</span>
                      </div>
                      <span className="text-[#8b5cf6] text-[16px]">{'>'}</span>
                    </div>
                  </div>

                  {/* Home Indicator */}
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-[100px] h-[4px] bg-[#1a1a1a] rounded-full" />
                </div>
              </div>
            )}

            {activeTab === "FLOW" && (
              <div className="w-full h-full bg-[#f8fafc] rounded-2xl p-8 overflow-y-auto">
                {/* Flow Header */}
                <div className="flex items-center gap-2 mb-8">
                  <GitBranch className="w-5 h-5 text-[#8b5cf6]" />
                  <span className="text-[16px] font-semibold text-[#0f172a]">Business Flow</span>
                </div>

                {/* Flow Steps */}
                <div className="space-y-6">
                  {[
                    { num: 1, title: "헤더 네비게이션", desc: "헤더 컴포넌트 : 텍스트와 아이콘 버튼 정렬 여러개, 최우측엔 메뉴버튼, 필요한 아이콘/픽토그램은 랜덤으로 구성" },
                    { num: 2, modify:true, title: "최상단 배너 영역", desc: "최상단 : 통 이미지 배너" },
                    { num: 3, title: "페이 서비스 리스트 (모듈2)", desc: "모듈2: 리스트+버튼 모듈 / 전체 높이값 AUTO / 모듈 상단: 제목문구 '페이' / 문구옆 화살표 버튼" },
                    { num: 4, title: "슈퍼솔 로고 및 바로가기 (모듈4)", desc: "모듈4: 이미지 + 버튼 1줄 / 레이아웃 한줄로 중앙 정렬" }
                  ].map((step, i) => (
                    <div key={step.num} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full bg-[#8b5cf6] text-white flex items-center justify-center text-[13px] font-semibold 
                            ${step.modify && 'bg-[#fb923c]'}
                          `}>
                          {step.num}
                        </div>
                        {i < 3 && <div className="w-0.5 flex-1 bg-[#e4eaf2] mt-2" />}
                      </div>
                      <div className="flex-1 pb-6">
                        <h3 className={`text-[15px] font-semibold text-[#0f172a] mb-2 ${step.modify && 'text-[#fb923c]'}`}>{step.title}</h3>
                        <p className="text-[13px] text-[#64748b] leading-relaxed">{step.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "DIAGRAM" && (
              <div className="w-full h-full bg-[#f8fafc] rounded-2xl p-8 overflow-y-auto">
                {/* Diagram Header */}
                <div className="flex items-center gap-2 mb-8">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="2" y="2" width="6" height="4" rx="1" stroke="#8b5cf6" strokeWidth="1.5"/>
                    <rect x="12" y="2" width="6" height="4" rx="1" stroke="#8b5cf6" strokeWidth="1.5"/>
                    <rect x="7" y="14" width="6" height="4" rx="1" stroke="#8b5cf6" strokeWidth="1.5"/>
                    <path d="M5 6V10H10M15 6V10H10M10 10V14" stroke="#8b5cf6" strokeWidth="1.5"/>
                  </svg>
                  <span className="text-[16px] font-semibold text-[#0f172a]">시스템 아키텍쳐 다이어그램</span>
                </div>

                {/* Mermaid Diagram */}
                <div className="flex justify-center">
                  <MermaidDiagram
                    chart={`flowchart TB
    A[헤더 네비게이션] --> B[최상단 배너 영역]
    B --> C[페이 서비스 리스트<br/>모듈2]
    C --> D[슈퍼솔 로고 및 바로가기<br/>모듈4]
    D --> E[고객지원 및 공지사항]
    
    style A fill:#c4b5fd,stroke:#8b5cf6,color:#1e1b4b
    style B fill:#fb923c,stroke:#fb923c,color:#fff
    style C fill:#c4b5fd,stroke:#8b5cf6,color:#1e1b4b
    style D fill:#c4b5fd,stroke:#8b5cf6,color:#1e1b4b
    style E fill:#c4b5fd,stroke:#8b5cf6,color:#1e1b4b`}
                    className="w-full flex justify-center"
                  />
                </div>
              </div>
            )}

            {activeTab === "CODE" && (
              <div className="w-full h-full bg-[#f8fafc] rounded-2xl p-8 overflow-y-auto">
                {/* Code Header */}
                <div className="flex items-center gap-2 mb-6">
                  <Code2 className="w-5 h-5 text-[#8b5cf6]" />
                  <span className="text-[16px] font-semibold text-[#0f172a]">Spec Overview</span>
                </div>

                {/* Code Blocks */}
                <div className="space-y-4">
                  {[
                    { name: "REST_SERVICE.java", status: "Update Required" },
                    { name: "COMPONENT.vue", status: "Update Required" }
                  ].map((file) => (
                    <div key={file.name} className="bg-[#1e1e2e] rounded-xl overflow-hidden">
                      {/* File Header */}
                      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2d2d3d]">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-[#a3e635]" />
                          <span className="text-[12px] text-white font-medium">{file.name}</span>
                        </div>
                        <span className="text-[11px] text-[#fbbf24]">{file.status}</span>
                      </div>
                      {/* Code Content */}
                      <div className="p-4 font-mono text-[12px] leading-relaxed">
                        <p className="text-[#6b7280]">{"// AI-Generated logic for 최상단 배너 영역"}</p>
                        <p className="text-[#c084fc]">@PostMapping<span className="text-white">(</span><span className="text-[#a5f3fc]">"/v1/workbench/m-1-0-1772868581952"</span><span className="text-white">)</span></p>
                        <p className="text-[#60a5fa]">public <span className="text-[#fbbf24]">SyncResponse</span> <span className="text-[#4ade80]">pushUpdate</span><span className="text-white">() {"{"}</span></p>
                        <p className="text-[#4ade80] pl-4">{"+ // Mapping from current scenario..."}</p>
                        <p className="text-white">{"}"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
