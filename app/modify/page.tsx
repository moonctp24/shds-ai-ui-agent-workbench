"use client"

import { useState } from "react"
import { Check, Maximize2, Layers, Sparkles, LayoutGrid, ChevronDown, ChevronRight, Trash2, GitBranch, Code2, X } from "lucide-react"
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
  // 260319 옵션 추가
  const [activeTab, setActiveTab] = useState("PREVIEW")
  const [activeRenderMode, setActiveRenderMode] = useState<"batch" | "individual">("batch")
  const [expandedItems, setExpandedItems] = useState<string[]>(["root", "header", "body", "shortcuts", "footer"])
  const [selectedItem, setSelectedItem] = useState<string | null>("header-depth2")
  const [microRequirements, setMicroRequirements] = useState<string[]>([
    "터치 결제, 스캔/코드 입력, 바코드/QR 결제 등 오프라인 결제 수단 아이콘\n아이콘 이미지 주소를 https://www.......\nalt는 00아이콘으로",
    "하단에 '모바일 티머니 등록하기' 버튼",
    "하단에 '모바일 티머니 등록하기' 버튼",
    "*터치 결제, 스캔/코드 입력, 바코드/QR 결제 등 오프라인 결제 수단을 직관적인 아이콘으로 제공합니다. 하단에 '모바일 티머니 등록하기' 버튼을 통해 교통카드 기능을 강조 합니다."
  ])
  const [checkedRequirements, setCheckedRequirements] = useState<Set<number>>(new Set([0, 1]))
  const [gitlabUrl, setGitlabUrl] = useState("깃랩url")
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
          <div className="flex items-center gap-2.5 px-5 py-4">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#8b5cf6] to-[#7c3aed] flex items-center justify-center shadow-sm">
              {/* 260319 icon변경 */}
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="0.5" y="0.5" width="39" height="39" rx="14.5" fill="#8B5CF6"/>
                <rect x="0.5" y="0.5" width="39" height="39" rx="14.5" stroke="#8B5CF6"/>
                <path d="M20.1343 10.7396L12.5682 14.0854C11.7741 14.4366 11.7741 15.5634 12.5682 15.9146L20.1343 19.2604C20.3988 19.3773 20.7009 19.374 20.9628 19.2514L28.1086 15.9056C28.8766 15.5461 28.8766 14.4539 28.1086 14.0943L20.9628 10.7485C20.7009 10.6259 20.3988 10.6227 20.1343 10.7396Z" stroke="white" stroke-width="2"/>
                <path d="M11.5857 20.5555L20.0611 24.7719C20.349 24.9151 20.6881 24.9112 20.9726 24.7614L28.9571 20.5555" stroke="white" stroke-width="2" stroke-linecap="round"/>
                <path d="M11.5857 25L20.0611 29.2164C20.349 29.3596 20.6881 29.3557 20.9726 29.2058L28.9571 25" stroke="white" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </div>
            <span className="text-[15px] font-semibold text-[#0f172a]">Workspace</span>
          </div>

          <div className="flex-1 flex flex-col p-5 overflow-hidden">
            <button className="w-full h-11 bg-[#f1f5f9] text-[#94a3b8] rounded-lg flex items-center justify-center gap-2 mb-3 cursor-not-allowed transition-colors">
              {/* 260319 icon변경 */}
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="6.2666" y="0.75" width="3.83333" height="3.85498" stroke="#77879D" stroke-width="1.5"/>
                <rect x="0.75" y="11.395" width="3.83333" height="3.85498" stroke="#77879D" stroke-width="1.5"/>
                <rect x="11.4167" y="11.395" width="3.83333" height="3.85498" stroke="#77879D" stroke-width="1.5"/>
                <path d="M13.3333 10.645V8.41373H8.2222M3.11108 10.645V8.41373H8.2222M8.2222 8.41373V4.84375" stroke="#77879D"/>
              </svg>
              <span className="text-[14px] font-medium">시나리오 트리 분석</span>
            </button>

            <div className="flex gap-2 mb-15">
              <button
                onClick={() => setActiveRenderMode("batch")}
                className={`flex-1 h-10 rounded-lg flex items-center justify-center gap-2 text-[13px] font-medium transition-colors ${
                  activeRenderMode === "batch"
                    ? "bg-[#8b5cf6] text-white"
                    : "bg-[#e4eaf2] text-[#94a3b8] hover:bg-[#d9e0e8]"
                }`}
              >
                <Sparkles className="w-4 h-4 stroke-[1.5]" />
                일괄 UI렌더링
              </button>
              <button
                onClick={() => setActiveRenderMode("individual")}
                className={`flex-1 h-10 rounded-lg flex items-center justify-center gap-2 text-[13px] font-medium transition-colors ${
                  activeRenderMode === "individual"
                    ? "bg-[#8b5cf6] text-white"
                    : "bg-[#e4eaf2] text-[#94a3b8] hover:bg-[#d9e0e8]"
                }`}
              >
                {/* 260319 icon변경 */}
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="0.75" y="0.75" width="14.5" height="5.35714" stroke="#77879D" stroke-width="1.5"/>
                  <rect x="0.75" y="9.89282" width="7.64286" height="5.35714" stroke="#77879D" stroke-width="1.5"/>
                  <rect x="11.75" y="9.75" width="3.07143" height="5.35714" stroke="#77879D" stroke-width="1.5"/>
                </svg>
                개별 UI렌더링
              </button>
            </div>

            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-semibold text-[#475569] tracking-widest">SCENARIO EDITOR</span>
              <span className="px-2 py-0.5 bg-[#f1f5f9] text-[#64748b] text-[10px] font-medium rounded">Auto Saved</span>
            </div>

            {/* Scenario Editor Content - Scrollable */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              {/* 원문 Section */}
              <div>
                <h3 className="text-[12px] font-medium text-[#475569] mb-2 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0f172a]" />
                  원문
                </h3>
                <div className="bg-[#e4eaf2] rounded-xl p-4 min-h-[100px]">
                  <p className="text-[12px] text-[#94a3b8] leading-relaxed">
                    *터치 결제, 스캔/코드 입력, 바코드/QR 결제 등 오프라인 결제 수단을 직관적인 아이콘으로 제공합니다. 하단에 '모바일 티머니 등록하기' 버튼을 통해 교통카드 기능을 강조 합니다.
                  </p>
                </div>
              </div>

              {/* 마이크로 요구사항 Section */}
              <div>
                <h3 className="text-[12px] font-medium text-[#8b5cf6] mb-2 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6]" />
                  마이크로 요구사항
                </h3>
                <div className="space-y-2">
                  {microRequirements.map((req, idx) => {
                    const isChecked = checkedRequirements.has(idx)
                    return (
                      <div 
                        key={idx} 
                        className={`flex items-start gap-2 border rounded-lg px-3 py-2 ${
                          isChecked ? "bg-[#f8fafc] border-[#8b5cf6]" : "bg-white border-[#e4eaf2]"
                        }`}
                      >
                        <div 
                          onClick={() => {
                            const newSet = new Set(checkedRequirements)
                            if (isChecked) {
                              newSet.delete(idx)
                            } else {
                              newSet.add(idx)
                            }
                            setCheckedRequirements(newSet)
                          }}
                          className={`w-5 h-5 rounded flex items-center justify-center cursor-pointer mt-0.5 flex-shrink-0 ${
                            isChecked ? "bg-[#8b5cf6]" : "border border-[#d9d9d9]"
                          }`}
                        >
                          {isChecked && <Check className="w-3 h-3 text-white stroke-[2]" />}
                        </div>
                        {isChecked ? (
                          <textarea
                            value={req}
                            onChange={(e) => {
                              const newReqs = [...microRequirements]
                              newReqs[idx] = e.target.value
                              setMicroRequirements(newReqs)
                            }}
                            className="flex-1 text-[12px] text-[#0f172a] bg-transparent border-none resize-none focus:outline-none min-h-[60px] leading-relaxed"
                          />
                        ) : (
                          <span className="flex-1 text-[12px] text-[#0f172a] leading-relaxed whitespace-pre-line">{req}</span>
                        )}
                        <button 
                          onClick={() => {
                            const newReqs = microRequirements.filter((_, i) => i !== idx)
                            setMicroRequirements(newReqs)
                            const newSet = new Set(checkedRequirements)
                            newSet.delete(idx)
                            setCheckedRequirements(newSet)
                          }}
                          className="text-[#94a3b8] hover:text-[#0f172a] transition-colors flex-shrink-0 mt-0.5"
                        >
                          <X className="w-4 h-4 stroke-[1.5]" />
                        </button>
                      </div>
                    )
                  })}
                  <button 
                    onClick={() => {
                      const newIdx = microRequirements.length
                      setMicroRequirements([...microRequirements, ""])
                      setCheckedRequirements(new Set([...checkedRequirements, newIdx]))
                    }}
                    className="w-full h-10 border-2 border-dashed border-[#c8d2e1] rounded-lg flex items-center justify-center gap-1 text-[#94a3b8] hover:border-[#8b5cf6] hover:text-[#8b5cf6] transition-colors"
                  >
                    <span className="text-lg">+</span>
                    <span className="text-[12px] font-medium">새로운 내용 추가</span>
                  </button>
                </div>
              </div>
            </div>

            {/* NEW SCENARIO Section */}
            <div className="mt-auto pt-4">
              <span className="text-[11px] font-semibold text-[#475569] tracking-widest mb-3 block">NEW SCENARIO</span>
              <div className="border border-[#e4eaf2] rounded-xl p-4 bg-white mb-3 min-h-[80px]">
                <textarea className="text-[12px] text-[#94a3b8] leading-relaxed w-full resize-none" placeholder="새 시나리오" />
              </div>
              <div className="flex items-center gap-2 border border-[#e4eaf2] rounded-lg px-3 py-2 bg-white">
                <input className="flex-1 text-[12px] text-[#0f172a]" value={gitlabUrl} />
                <button 
                  onClick={() => setGitlabUrl("")}
                  className="text-[#94a3b8] hover:text-[#0f172a] transition-colors"
                >
                  <X className="w-4 h-4 stroke-[1.5]" />
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* Center Group - Project Tree */}
        <div className="flex-[1.33] flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md bg-[#8b5cf6]/10 flex items-center justify-center">
                {/* 260319 icon변경 */}
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1 0.333374V3.66671M5.48 13.6667H2.70622C2.43392 13.6667 2.1734 13.5557 1.98483 13.3592L1.27861 12.6236C1.09983 12.4374 1 12.1892 1 11.9311V3.66671M1 3.66671H5.48M11.535 1.46099L12.225 2.53909C12.4088 2.82629 12.7263 3.00004 13.0673 3.00004H16C16.5523 3.00004 17 3.44775 17 4.00004V5.33337C17 5.88566 16.5523 6.33337 16 6.33337H9.68C9.12772 6.33337 8.68 5.88566 8.68 5.33337V2.00004C8.68 1.44776 9.12772 1.00004 9.68 1.00004H10.6927C11.0337 1.00004 11.3512 1.17379 11.535 1.46099Z" stroke="#8559EC" stroke-width="2"/>
                  <path d="M8.67993 15.3333V12C8.67993 11.4477 9.12765 11 9.67993 11H10.6927C11.0336 11 11.3511 11.1737 11.5349 11.4609L12.2249 12.5391C12.4087 12.8263 12.7262 13 13.0672 13H15.9999C16.5522 13 16.9999 13.4477 16.9999 14V15.3333C16.9999 15.8856 16.5522 16.3333 15.9999 16.3333H9.67993C9.12765 16.3333 8.67993 15.8856 8.67993 15.3333Z" stroke="#8559EC" stroke-width="2"/>
                </svg>
              </div>
              <div className="flex flex-col">
                <span className="text-[14px] font-medium text-[#0f172a]">Project Tree</span>
                <span className="text-[11px] text-[#94a3b8] tracking-wide">1-2-3 HIERARCHY</span>
              </div>
            </div>
            
            {/* Check Button */}
            <button className="w-9 h-9 rounded-full border border-[#e4eaf2] flex items-center justify-center hover:bg-[#f8fafc] transition-colors">
              {/* 260319 icon변경 */}
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="0.5" y="0.5" width="39" height="39" rx="14.5" fill="white"/>
                <rect x="0.5" y="0.5" width="39" height="39" rx="14.5" stroke="#8559EC"/>
                <path d="M27.8206 11.8148C28.1895 11.4135 28.8048 11.3957 29.1954 11.7748C29.5858 12.1539 29.6032 12.7862 29.2343 13.1876L20.9646 22.1861C20.7842 22.3823 20.5345 22.4956 20.2719 22.4995C20.0091 22.5034 19.7557 22.3976 19.5698 22.2066L16.6511 19.2071C16.2711 18.8167 16.2711 18.1838 16.6511 17.7933C17.031 17.4028 17.6469 17.4028 18.0268 17.7933L20.2377 20.0654L27.8206 11.8148Z" fill="#8559EC"/>
                <path d="M16.8525 25.5612C13.5951 23.6285 12.4791 19.3481 14.3597 16.0006C16.2403 12.6531 20.4055 11.5062 23.6629 13.4388L24.6358 11.7071C20.4478 9.22221 15.0925 10.6968 12.6746 15.0008C10.2566 19.3047 11.6915 24.8081 15.8796 27.2929C20.0676 29.7778 25.4228 28.3032 27.8408 23.9992C28.9904 21.953 29.0139 20 29.0139 17.5004H27.0681C27.0681 19.5 26.9509 21.5838 26.1557 22.9994C24.275 26.3469 20.1098 27.4938 16.8525 25.5612Z" fill="#8559EC"/>
              </svg>
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
              {/* 260319 icon변경 */}
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="0.5" y="0.5" width="39" height="39" rx="14.5" fill="white"/>
                <rect x="0.5" y="0.5" width="39" height="39" rx="14.5" stroke="#8559EC"/>
                <path d="M19.3858 21.6747C19.6796 21.3827 19.6811 20.9079 19.3891 20.6141C19.0971 20.3203 18.6222 20.3189 18.3284 20.6109L18.8571 21.1428L19.3858 21.6747ZM12.6509 26.5637C12.6497 26.9779 12.9844 27.3148 13.3987 27.316L20.1486 27.3365C20.5628 27.3377 20.8996 27.003 20.9009 26.5887C20.9022 26.1745 20.5674 25.8377 20.1532 25.8365L14.1532 25.8183L14.1714 19.8183C14.1726 19.4041 13.8379 19.0673 13.4237 19.066C13.0095 19.0648 12.6727 19.3996 12.6714 19.8138L12.6509 26.5637ZM18.8571 21.1428L18.3284 20.6109L12.8722 26.0341L13.4009 26.566L13.9296 27.0979L19.3858 21.6747L18.8571 21.1428Z" fill="#8559EC"/>
                <path d="M20.8716 18.0341C20.578 18.3263 20.5769 18.8012 20.869 19.0948C21.1612 19.3884 21.6361 19.3896 21.9297 19.0974L21.4007 18.5658L20.8716 18.0341ZM27.5999 13.1447C27.601 12.7305 27.266 12.3939 26.8518 12.3929L20.1018 12.3765C19.6876 12.3755 19.351 12.7105 19.35 13.1247C19.349 13.5389 19.6839 13.8755 20.0981 13.8765L26.0981 13.8911L26.0835 19.8911C26.0825 20.3053 26.4175 20.6419 26.8317 20.6429C27.2459 20.6439 27.5825 20.3089 27.5835 19.8947L27.5999 13.1447ZM21.4007 18.5658L21.9297 19.0974L27.379 13.6745L26.8499 13.1429L26.3209 12.6113L20.8716 18.0341L21.4007 18.5658Z" fill="#8559EC"/>
              </svg>
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
                  {/* 260319 icon변경 */}
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="3" cy="3" r="2.5" stroke="#8B5CF6" stroke-linejoin="round"/>
                    <circle cx="15" cy="3" r="2.5" stroke="#8B5CF6" stroke-linejoin="round"/>
                    <path d="M9 1.5V16.5M3 5.875V10.875M15 5.875V9.625C15 10.0417 14.55 11 12.75 11.5" stroke="#8B5CF6" stroke-width="1.5" stroke-linecap="round"/>
                    <circle cx="3" cy="13.5" r="2.5" stroke="#8B5CF6" stroke-linejoin="round"/>
                  </svg>
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
                  {/* 260319 icon변경 */}
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6.5 16.0495C6.5 14.6858 5.38071 13.5804 4 13.5804C2.61929 13.5804 1.5 14.6858 1.5 16.0495C1.5 17.4132 2.61929 18.5186 4 18.5186V20.0001C1.79086 20.0001 0 18.2314 0 16.0495C0 13.8676 1.79086 12.0989 4 12.0989C6.20914 12.0989 8 13.8676 8 16.0495C8 18.2314 6.20914 20.0001 4 20.0001V18.5186C5.38071 18.5186 6.5 17.4132 6.5 16.0495Z" fill="#8B5CF6"/>
                    <path d="M18.5 4.19744C18.5 2.83378 17.3807 1.72831 16 1.72831C14.6193 1.72831 13.5 2.83378 13.5 4.19744C13.5 5.56111 14.6193 6.66658 16 6.66658V8.14806C13.7909 8.14806 12 6.37931 12 4.19744C12 2.01558 13.7909 0.246826 16 0.246826C18.2091 0.246826 20 2.01558 20 4.19744C20 6.37931 18.2091 8.14806 16 8.14806V6.66658C17.3807 6.66658 18.5 5.56111 18.5 4.19744Z" fill="#8B5CF6"/>
                    <path d="M16.75 6.66667C16.75 9.89105 15.1989 12.2673 13.293 13.8397C11.4098 15.3933 9.13466 16.2029 7.54395 16.2953L7.45605 14.8158C8.69868 14.7436 10.6736 14.0717 12.332 12.7035C13.9677 11.3541 15.25 9.36821 15.25 6.66667H16.75ZM3.25 0.740741C3.25 0.331641 3.58579 0 4 0C4.41421 0 4.75 0.331641 4.75 0.740741V12.5926H3.25V0.740741Z" fill="#8B5CF6"/>
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
                  {/* 260319 icon변경 */}
                  <svg width="22" height="13" viewBox="0 0 22 13" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M15.079 0.244008C15.4545 -0.102476 16.0382 -0.0768776 16.3823 0.301135L22 6.47086L16.8723 12.666C16.5462 13.0598 15.9639 13.113 15.5726 12.7848C15.1814 12.4564 15.1286 11.8702 15.4546 11.4763L19.5492 6.52798L15.0223 1.55612C14.6781 1.17809 14.7036 0.59052 15.079 0.244008ZM5.64377 0.301135C5.98796 -0.0768777 6.57159 -0.102477 6.94708 0.244008C7.32256 0.59052 7.34799 1.17809 7.00383 1.55612L2.50214 6.49987L7.00383 11.4436C7.34799 11.8217 7.32256 12.4092 6.94708 12.7557C6.57159 13.1022 5.98796 13.0766 5.64377 12.6986L0 6.49987L5.64377 0.301135Z" fill="#8B5CF6"/>
                    <path d="M12.2949 0.744101C12.4364 0.354983 12.8667 0.153661 13.2558 0.294882C13.6449 0.43638 13.8463 0.866669 13.705 1.25582L9.70504 12.2558C9.56354 12.6449 9.13325 12.8463 8.7441 12.705C8.35498 12.5635 8.15366 12.1333 8.29488 11.7441L12.2949 0.744101Z" fill="#8B5CF6"/>
                  </svg>
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
