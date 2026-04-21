"use client"

/**
 * ⚠️ IMPORTANT: DO NOT MODIFY LAYOUT STRUCTURE ⚠️
 * 
 * - 퍼블리셔가 만든 HTML 구조(div, className)는 절대 변경 금지
 * - DOM 구조 변경 금지 (추가/삭제/순서 변경 금지)
 * - className 수정 금지
 * 
 * ✅ 허용:
 * - 상태(state) 로직
 * - API 호출
 * - 이벤트 핸들러
 * 
 * ❌ 금지:
 * - div 추가/삭제/이동
 * - className 변경
 */

import React, { useEffect, useMemo, useRef, useState } from "react"
import dynamic from "next/dynamic"
import {
  ChevronDown,
  ChevronRight,
  Layers,
  GitBranch,
  Code2,
  FileCode2,
  Diff,
  GitMerge,
  Share2,
  Plus,
  Trash2,
  Monitor,
  Sparkles,
  Check,
  X,
} from "lucide-react"
import { api } from "@/lib/api"
import analysisData from "@/lib/shcard_demo_analysis.json"

const ReactDiffViewer = dynamic(() => import("react-diff-viewer-continued"), { ssr: false })

// Mermaid 다이어그램 렌더러 (SSR 비활성화)
function MermaidDiagramClient({ chart }: { chart: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [renderError, setRenderError] = useState(false)
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    if (!chart || !ref.current) return
    setRenderError(false)
    import("mermaid").then(({ default: mermaid }) => {
      mermaid.initialize({ startOnLoad: false, theme: "default", securityLevel: "loose" })
      const id = `mermaid-${Math.random().toString(36).slice(2)}`
      mermaid.render(id, chart).then(({ svg }) => {
        if (ref.current) {
          ref.current.innerHTML = svg
          setRenderError(false)
        }
      }).catch(() => {
        if (ref.current) ref.current.innerHTML = ""
        setRenderError(true)
      })
    })
  }, [chart, retryKey])

  return (
    <div className="w-full">
      <div ref={ref} className={`w-full overflow-x-auto p-4 bg-white rounded-xl border ${renderError ? "border-red-200 hidden" : "border-[#e4eaf2]"}`} />
      {renderError && (
        <div className="flex flex-col items-center gap-3 py-6 px-4 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-[13px] text-red-500 text-center">
            다이어그램 렌더링에 실패했습니다.
          </p>
          <button
            onClick={() => setRetryKey(k => k + 1)}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-white border border-red-300 hover:border-red-400 hover:bg-red-50 text-red-600 text-[13px] font-medium rounded-lg transition-colors shadow-sm"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
            다시 그리기
          </button>
        </div>
      )}
    </div>
  )
}
const MermaidDiagram = dynamic(() => Promise.resolve(MermaidDiagramClient), { ssr: false })

// ─── 타입 정의 ────────────────────────────────────────────────────────────────

type Area = {
  id: string
  name: string
  source_file: string
  component_name: string
  code: string
  description: string[]
}

type Component = {
  id: string
  name: string
  source_file: string
  description: string[]
  areas: Area[]
  children: Component[]
}

type FlowStep = {
  step: number
  component: string
  area: string
  action: string
  result: string
}

type Flow = {
  title: string
  steps: FlowStep[]
}

type Hierarchy = {
  repository: string
  components: Component[]
  flow?: Flow
  diagram?: string
  preview_html?: string
}

type ModifyResult = {
  area_id: string
  source_file: string
  original_code: string
  modified_code: string
  diff: string
  modified_flow?: Flow
  flow_changed_steps?: number[]
  modified_diagram?: string
  diagram_changed_nodes?: string[]
}

type SelectionTarget =
  | { type: "component"; data: Component }
  | { type: "area"; data: Area; parentComponent: Component }
  | null

/** 컴포넌트와 모든 하위 자손의 area.code를 재귀적으로 수집해 하나의 문자열로 반환 */
const collectAreaCodes = (comp: Component): string => {
  const parts: string[] = []
  for (const area of comp.areas ?? []) {
    if (area.code) parts.push(`// [${comp.name} > ${area.name}]\n${area.code}`)
  }
  for (const child of comp.children ?? []) {
    const childCode = collectAreaCodes(child)
    if (childCode) parts.push(childCode)
  }
  return parts.join("\n\n")
}

/** Project Tree 초기 로드 시 전체 comp 노드 펼침용 id 목록 */
const collectAllComponentIds = (components: Component[]): string[] => {
  const ids: string[] = []
  for (const c of components) {
    ids.push(c.id)
    if (c.children?.length) {
      ids.push(...collectAllComponentIds(c.children))
    }
  }
  return ids
}

// ─── 메인 컴포넌트 ─────────────────────────────────────────────────────────────

const INITIAL_DATA = ((analysisData as any).data ?? analysisData) as Hierarchy

export default function WorkspacePage() {
  const [minorVersion, setMinorVersion] = useState(0)   // v1.0 → v1.1 → …
  const [activeRenderMode, setActiveRenderMode] = useState<"batch" | "individual">("batch")

  // JSON에서 직접 초기화 (API 호출 없음)
  const [hierarchy, setHierarchy] = useState<Hierarchy>(INITIAL_DATA)
  const [expandedComponents, setExpandedComponents] = useState<string[]>(() =>
    INITIAL_DATA.components?.length
      ? collectAllComponentIds(INITIAL_DATA.components)
      : []
  )
  const [selection, setSelection] = useState<SelectionTarget>(
    INITIAL_DATA.components?.length
      ? { type: "component", data: INITIAL_DATA.components[0] as Component }
      : null
  )

  const [modifyLoading, setModifyLoading] = useState(false)
  const isModifyingRef = useRef(false)   // 동기 가드: 중복 호출 방지
  const [modifyError, setModifyError] = useState<string | null>(null)
  const [modifyResult, setModifyResult] = useState<ModifyResult | null>(null)

  const [activeTab, setActiveTab] = useState<"PREVIEW" | "FLOW" | "DIAGRAM" | "COMPARE">("PREVIEW")
  const tabs = ["PREVIEW", "FLOW", "DIAGRAM", "COMPARE"]
  const [compareTab, setCompareTab] = useState<"files" | "detail">("files")
  const [checkedDescriptions, setCheckedDescriptions] = useState<Record<string, boolean>>({})
  // 체크된 항목의 편집된 텍스트 (key: `${id}-${idx}`, value: 편집 중인 텍스트)
  const [editedDescriptions, setEditedDescriptions] = useState<Record<string, string>>({})
  // 사용자가 직접 추가한 자유 입력 항목
  const [addedItems, setAddedItems] = useState<{ id: string; text: string }[]>([])

  const [flow, setFlow] = useState<Flow | null>(INITIAL_DATA.flow ?? null)
  const [diagram, setDiagram] = useState<string | null>(INITIAL_DATA.diagram ?? null)
  const [previewHtml, setPreviewHtml] = useState<string | null>(INITIAL_DATA.preview_html ?? null)
  const [flowChangedSteps, setFlowChangedSteps] = useState<number[]>([])
  const [diagramChangedNodes, setDiagramChangedNodes] = useState<string[]>([])
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // 영역/컴포넌트 선택 변경 시 수정 결과·체크박스·편집내역·추가항목 초기화 (탭은 유지)
  useEffect(() => {
    setModifyResult(null)
    setModifyError(null)
    setCheckedDescriptions({})
    setEditedDescriptions({})
    setAddedItems([])
  }, [selection])

  // 트리에서 항목 선택 시 preview iframe 하이라이트 동기화
  useEffect(() => {
    const id = selection ? (selection.data as { id?: string }).id ?? null : null
    iframeRef.current?.contentWindow?.postMessage({ type: "highlight", id }, "*")
  }, [selection])

  // ─── 핸들러 ──────────────────────────────────────────────────────────────────

  const handleModify = async () => {
    if (!selection) return
    if (isModifyingRef.current) return   // 이미 요청 중이면 즉시 차단
    isModifyingRef.current = true

    // 체크된 항목의 편집 텍스트 수집
    const checkedKeys = Object.entries(checkedDescriptions)
      .filter(([, v]) => v)
      .map(([k]) => k)
    const checkedTexts = checkedKeys.map(k => editedDescriptions[k] ?? "").filter(Boolean)

    // 사용자가 직접 추가한 항목 텍스트 수집
    const addedTexts = addedItems.map(item => item.text.trim()).filter(Boolean)

    if (checkedTexts.length === 0 && addedTexts.length === 0) {
      setModifyError("수정할 항목을 선택하거나 추가해주세요.")
      isModifyingRef.current = false
      return
    }

    const modificationRequest = [...checkedTexts, ...addedTexts].join("\n")

    setModifyLoading(true)
    setModifyError(null)
    setModifyResult(null)

    try {
      const data = selection.data
      const isArea = selection.type === "area"
      const origCode = isArea
        ? (data as any).code ?? ""
        : collectAreaCodes(data as Component)
      const res = await api.post("/api/modify-code", {
        area_id: data.id,
        source_file: data.source_file,
        original_code: origCode,
        modification_request: modificationRequest,
        original_flow: flow ?? undefined,
        original_diagram: diagram ?? undefined,
      })
      setModifyResult(res.data)
      setMinorVersion(prev => prev + 1)   // v1.0 → v1.1 → v1.2 …
      if (res.data.modified_flow) {
        setFlow(res.data.modified_flow)
        setFlowChangedSteps(res.data.flow_changed_steps ?? [])
      } else {
        setFlowChangedSteps([])
      }
      if (res.data.modified_diagram) {
        setDiagram(res.data.modified_diagram)
        setDiagramChangedNodes(res.data.diagram_changed_nodes ?? [])
      } else {
        setDiagramChangedNodes([])
      }
      setActiveTab("DIAGRAM")
    } catch (e: any) {
      const msg =
        e?.response?.data?.detail || e?.message || "수정에 실패했습니다."
      setModifyError(String(msg))
    } finally {
      setModifyLoading(false)
      isModifyingRef.current = false   // 가드 해제
    }
  }

  const toggleComponent = (id: string) => {
    setExpandedComponents((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  // ─── 선택된 항목의 description ───────────────────────────────────────────────

  const selectedDescription = useMemo((): string[] => {
    if (!selection) return []
    const desc = selection.data.description
    if (!desc) return []
    if (Array.isArray(desc)) return desc
    return [desc]
  }, [selection])

  const selectedCode = useMemo(() => {
    if (!selection) return ""
    if (modifyResult) return modifyResult.original_code
    if (selection.type === "area") return selection.data.code
    return collectAreaCodes(selection.data)
  }, [selection, modifyResult])

  // ─── PREVIEW 와이어프레임 헬퍼 ──────────────────────────────────────────────

  const getAreaType = (area: Area): "button" | "banner" | "nav" | "input" | "list" | "card" | "default" => {
    const text = `${area.name} ${(area.description ?? []).join(" ")}`.toLowerCase()
    if (/버튼|button|cta|클릭|링크/.test(text)) return "button"
    if (/배너|banner|이미지|image|사진|슬라이드|썸네일/.test(text)) return "banner"
    if (/내비|네비|nav|메뉴|menu|gnb|lnb|탭|tab/.test(text)) return "nav"
    if (/입력|input|검색|search|폼|form|텍스트박스/.test(text)) return "input"
    if (/목록|리스트|list|아이템|피드|항목/.test(text)) return "list"
    if (/카드|card/.test(text)) return "card"
    return "default"
  }

  const AREA_STYLE_MAP = {
    button:  { bg: "bg-[#eff6ff]", border: "border-[#93c5fd]", tag: "BTN",   tagCls: "bg-[#2563eb]" },
    banner:  { bg: "bg-[#fff7ed]", border: "border-[#fdba74]", tag: "IMG",   tagCls: "bg-[#ea580c]" },
    nav:     { bg: "bg-[#f0fdf4]", border: "border-[#86efac]", tag: "NAV",   tagCls: "bg-[#16a34a]" },
    input:   { bg: "bg-[#fefce8]", border: "border-[#fde047]", tag: "INPUT", tagCls: "bg-[#ca8a04]" },
    list:    { bg: "bg-[#fafafa]", border: "border-[#d4d4d8]", tag: "LIST",  tagCls: "bg-[#52525b]" },
    card:    { bg: "bg-[#f0f9ff]", border: "border-[#7dd3fc]", tag: "CARD",  tagCls: "bg-[#0284c7]" },
    default: { bg: "bg-[#f8fafc]", border: "border-[#94a3b8]", tag: "UI",   tagCls: "bg-[#475569]" },
  } as const

  const renderWireframeArea = (area: Area, isOnDark: boolean): React.ReactNode => {
    const type = getAreaType(area)
    const s = AREA_STYLE_MAP[type]
    const isBanner = type === "banner"
    const isButton = type === "button"

    const sharedTag = (
      <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded ${s.tagCls} text-white`}>
        {s.tag}
      </span>
    )

    if (isOnDark) {
      return (
        <div
          key={area.id}
          className={`flex items-center gap-1.5 rounded-lg border-2 border-dashed border-white/20 bg-white/10 px-3 py-2 ${isBanner ? "w-full" : isButton ? "min-w-[70px]" : "min-w-[100px]"}`}
          style={isBanner || isButton ? undefined : { maxWidth: "240px" }}
        >
          {sharedTag}
          <span className="text-[12px] font-medium text-white/85 truncate">{area.name}</span>
        </div>
      )
    }

    return (
      <div
        key={area.id}
        className={`flex items-center gap-1.5 rounded-lg border-2 border-dashed ${s.bg} ${s.border} px-3 py-2 ${isBanner ? "w-full" : isButton ? "min-w-[70px]" : "min-w-[100px]"}`}
        style={isBanner || isButton ? undefined : { maxWidth: "240px" }}
      >
        {sharedTag}
        <span className="text-[12px] font-semibold text-[#0f172a] truncate">{area.name}</span>
      </div>
    )
  }

  const renderPreviewSection = (comp: Component, depth: number): React.ReactNode => {
    const lname = comp.name.toLowerCase()
    const isHeader = /헤더|header|내비|네비|gnb|lnb/.test(lname)
    const isFooter = /푸터|footer/.test(lname)
    const isOnDark = isHeader && depth === 0

    const hasAreas = comp.areas.length > 0
    const hasChildren = (comp.children?.length ?? 0) > 0

    const sectionBg =
      isOnDark           ? "bg-[#1e293b]" :
      isFooter && depth === 0 ? "bg-[#f1f5f9]" :
      depth === 0         ? "bg-white"    :
      depth === 1         ? "bg-[#f8fafc]":
                            "bg-white"

    const wrapCls =
      depth === 0
        ? `${sectionBg} border-b border-[#e2e8f0] last:border-b-0`
        : `${sectionBg} rounded-lg border border-[#e2e8f0] overflow-hidden`

    const labelColor  = isOnDark ? "text-white/50" : depth > 0 ? "text-[#64748b]" : "text-[#94a3b8]"
    const dividerCls  = isOnDark ? "border-white/10" : "border-[#f1f5f9]"
    const padX        = depth === 0 ? "px-4" : "px-3"
    const depthIndent = depth > 1 ? `ml-${Math.min(depth * 2, 8)}` : ""

    return (
      <div key={comp.id} className={`${wrapCls} ${depthIndent}`}>
        <div className={`flex items-center gap-2 ${padX} py-2 ${(hasAreas || hasChildren) ? `border-b ${dividerCls}` : ""}`}>
          {depth === 0
            ? <div className={`w-1.5 h-1.5 rounded-sm shrink-0 ${isOnDark ? "bg-slate-500" : "bg-slate-300"}`} />
            : <ChevronRight className={`w-3 h-3 shrink-0 ${isOnDark ? "text-white/30" : "text-[#94a3b8]"}`} />
          }
          <span className={`text-[11px] font-bold uppercase tracking-widest ${labelColor}`}>
            {comp.name}
          </span>
        </div>

        {hasAreas && (
          <div className={`flex flex-wrap gap-2 ${padX} py-3 ${hasChildren ? `border-b ${dividerCls}` : ""}`}>
            {comp.areas.map((area) => renderWireframeArea(area, isOnDark))}
          </div>
        )}

        {hasChildren && (
          <div className={`${padX} py-2.5 space-y-2`}>
            {comp.children!.map((child) => renderPreviewSection(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  // ─── 재귀 트리 노드 렌더러 ─────────────────────────────���────���────────────────

  const renderComponentNode = (comp: Component, depth: number = 0): React.ReactNode => {
    const isExpanded = expandedComponents.includes(comp.id)
    const isCompSelected = selection?.type === "component" && selection.data.id === comp.id
    const hasChildren = (comp.children?.length ?? 0) > 0
    const isExpandable = hasChildren   // areas는 트리에 노출하지 않음
    const paddingLeft = depth * 20 + 8

    return (
      <div key={comp.id}>
        <div
          className={`flex items-center justify-between py-2 px-3 rounded-lg cursor-pointer transition-colors ${
            isCompSelected ? "bg-[#8b5cf6] text-white" : "hover:bg-[#121726]"
          } group`}
          style={{ paddingLeft: `${paddingLeft}px` }}
          onClick={() => setSelection({ type: "component", data: comp })}
        >
          <div className="flex items-center gap-2">
            {isExpandable ? (
              <button
                type="button"
                className="w-5 h-5 flex items-center justify-center rounded hover:bg-black/10"
                onClick={(event) => {
                  event.stopPropagation()
                  toggleComponent(comp.id)
                }}
                aria-label={isExpanded ? "트리 접기" : "트리 펼치기"}
              >
                {isExpanded ? (
                  <ChevronDown className={`w-4 h-4 ${isCompSelected ? "text-white" : "text-[#64748b]"}`} />
                ) : (
                  <ChevronRight className={`w-4 h-4 ${isCompSelected ? "text-white" : "text-[#64748b]"}`} />
                )}
              </button>
            ) : (
              <span className={`w-1.5 h-1.5 rounded-full ml-0.5 ${isCompSelected ? "bg-white" : "bg-[#8b5cf6]"} group-hover:text-white`} />
            )}
            <span className={`text-[16px] ${isCompSelected ? "text-white font-medium" : "text-[#475569]"} group-hover:text-white`}>
              {comp.name}
            </span>
          </div>
          <button
            className={`p-1 rounded hover:bg-black/10 transition-colors ${isCompSelected ? "text-white/70" : "text-[#c8d2e1]"}`}
            onClick={(e) => {
              e.stopPropagation()
            }}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
        {isExpandable && isExpanded && (
          <div>
            {comp.children!.map(child => renderComponentNode(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  // ─── 렌더링 ──────────────────────────────────────────────────────────────────

  return (
    <div className="h-screen bg-white flex flex-col overflow-hidden">
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Scenario Editor */}
        <aside className="flex-[1] flex flex-col bg-white overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-4">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#8b5cf6] to-[#7c3aed] flex items-center justify-center shadow-sm">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="0.5" y="0.5" width="39" height="39" rx="14.5" fill="#8B5CF6"/>
                <rect x="0.5" y="0.5" width="39" height="39" rx="14.5" stroke="#8B5CF6"/>
                <path d="M20.1343 10.7396L12.5682 14.0854C11.7741 14.4366 11.7741 15.5634 12.5682 15.9146L20.1343 19.2604C20.3988 19.3773 20.7009 19.374 20.9628 19.2514L28.1086 15.9056C28.8766 15.5461 28.8766 14.4539 28.1086 14.0943L20.9628 10.7485C20.7009 10.6259 20.3988 10.6227 20.1343 10.7396Z" stroke="white" strokeWidth="2"/>
                <path d="M11.5857 20.5555L20.0611 24.7719C20.349 24.9151 20.6881 24.9112 20.9726 24.7614L28.9571 20.5555" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                <path d="M11.5857 25L20.0611 29.2164C20.349 29.3596 20.6881 29.3557 20.9726 29.2058L28.9571 25" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <span className="text-[19px] font-semibold text-[#0f172a]">Workspace</span>
            {/* 버전 배지 */}
            <span className="text-[12px] font-mono font-semibold px-2 py-0.5 rounded-full bg-[#8b5cf6]/20 text-[#8b5cf6] border border-[#8b5cf6]/40 ml-auto">
              v1.{minorVersion}
            </span>
          </div>

          <div className="flex-1 flex flex-col p-5 overflow-hidden">
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setActiveRenderMode("batch")}
                className={`flex-1 h-13 rounded-lg flex items-center justify-center gap-2 text-[14px] font-medium transition-colors ${
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
                className={`flex-1 h-13 rounded-lg flex items-center justify-center gap-2 text-[14px] font-medium transition-colors ${
                  activeRenderMode === "individual"
                    ? "bg-[#8b5cf6] text-white"
                    : "bg-[#e4eaf2] text-[#94a3b8] hover:bg-[#d9e0e8]"
                }`}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="0.75" y="0.75" width="14.5" height="5.35714" stroke={activeRenderMode === "individual" ? "#fff" : "#77879D"} strokeWidth="1.5"/>
                  <rect x="0.75" y="9.89282" width="7.64286" height="5.35714" stroke={activeRenderMode === "individual" ? "#fff" : "#77879D"} strokeWidth="1.5"/>
                  <rect x="11.75" y="9.75" width="3.07143" height="5.35714" stroke={activeRenderMode === "individual" ? "#fff" : "#77879D"} strokeWidth="1.5"/>
                </svg>
                개별 UI렌더링
              </button>
            </div>

            <div className="flex items-center justify-between mb-3">
              <span className="text-[15px] font-semibold text-[#475569] tracking-widest">SCENARIO EDITOR</span>
              <span className="px-2 py-1 bg-[#f1f5f9] text-[#64748b] text-[12px] font-medium rounded">
                Auto Saved
              </span>
            </div>
            
            {!selection || selection.type !== "component" ? (
              <div className="flex-1 border-2 border-dashed border-[#c8d2e1] rounded-xl h-full flex items-center justify-center mb-4">
                <p className="text-[15px] text-[#94a3b8]">항목을 선택하세요.</p>
              </div>
            ) : (selection.data.children?.length ?? 0) > 0 ? (
              /* 비리프 comp (자식 있음) → description 줄글 */
              <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                <div>
                  <h3 className="text-[15px] font-medium text-[#475569] mb-2 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0f172a]" />
                    원문
                  </h3>
                  <div className="flex-1 bg-[#e4eaf2] rounded-xl p-4 min-h-[140px]">
                    <ul className="space-y-1.5 list-none">
                      {(Array.isArray(selection.data.description)
                        ? selection.data.description
                        : [selection.data.description ?? ""]
                      ).filter((s): s is string => typeof s === "string" && s.trim().length > 0).map((sentence, i) => (
                        <li key={i} className="flex items-start gap-2 text-[14px] text-[#64748b] leading-relaxed">
                          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#94a3b8] shrink-0" />
                          <span>{sentence}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ) : selection.data.areas.length > 0 ? (
              /* 리프 comp (자식 없음, areas 있음) → area name 체크박스 리스트 */
              <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                {/* 원문 섹션 */}
                <div>
                  <h3 className="text-[15px] font-medium text-[#475569] mb-2 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0f172a]" />
                    원문
                  </h3>
                  <div className="flex-1 bg-[#e4eaf2] rounded-xl p-4 min-h-[100px]">
                    <ul className="space-y-1.5 list-none">
                      {(Array.isArray(selection.data.description)
                        ? selection.data.description
                        : [selection.data.description ?? ""]
                      ).filter((s): s is string => typeof s === "string" && s.trim().length > 0).map((sentence, i) => (
                        <li key={i} className="flex items-start gap-2 text-[14px] text-[#64748b] leading-relaxed">
                          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#94a3b8] shrink-0" />
                          <span>{sentence}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                {/* 마이크로 요구사항 섹션 */}
                <div>
                  <h3 className="text-[13px] font-medium text-[#8b5cf6] mb-2 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6]" />
                    마이크로 요구사항
                  </h3>
                  <p className="text-[12px] text-[#94a3b8] mb-3">항목을 선택하면 직접 편집할 수 있습니다.</p>
                  <div className="space-y-2">
                    {selection.data.areas.map((area) => {
                      const key = area.id
                      const checked = checkedDescriptions[key] ?? false
                      const editedText = editedDescriptions[key] ?? area.name

                      const toggleCheck = () => {
                        const next = !checked
                        setCheckedDescriptions(prev => ({ ...prev, [key]: next }))
                        if (next) {
                          setEditedDescriptions(prev => ({ ...prev, [key]: area.name }))
                        } else {
                          setEditedDescriptions(prev => {
                            const n = { ...prev }
                            delete n[key]
                            return n
                          })
                        }
                      }

                      return (
                        <div 
                          key={key} 
                          className={`flex items-start gap-2 border rounded-lg px-3 py-2 ${
                            checked ? "bg-[#f8fafc] border-[#8b5cf6]" : "bg-white border-[#e4eaf2]"
                          }`}
                        >
                          <div 
                            onClick={toggleCheck}
                            className={`w-5 h-5 rounded flex items-center justify-center cursor-pointer mt-0.5 flex-shrink-0 ${
                              checked ? "bg-[#8b5cf6]" : "border border-[#c8d2e1]"
                            }`}
                          >
                            {checked && <Check className="w-3 h-3 text-white stroke-[2]" />}
                          </div>
                          {checked ? (
                            <textarea
                              value={editedText}
                              onChange={(e) =>
                                setEditedDescriptions(prev => ({ ...prev, [key]: e.target.value }))
                              }
                              rows={Math.max(2, Math.ceil(editedText.length / 28))}
                              className="flex-1 text-[13px] text-[#0f172a] bg-transparent border-none resize-none focus:outline-none min-h-[60px] leading-relaxed"
                            />
                          ) : (
                            <span className="flex-1 text-[13px] text-[#0f172a] leading-relaxed whitespace-pre-line">{area.name}</span>
                          )}
                          <button 
                            onClick={() => {}}
                            className="text-[#94a3b8] hover:text-[#0f172a] transition-colors flex-shrink-0 mt-0.5"
                          >
                            <X className="w-4 h-4 stroke-[1.5]" />
                          </button>
                        </div>
                      )
                    })}

                    {/* 직접 추가한 텍스트박스 목록 */}
                    {addedItems.map(item => (
                      <div
                        key={item.id}
                        className="flex items-start gap-2 rounded-lg px-3 py-2 bg-[#f8fafc] border border-[#8b5cf6]"
                      >
                        <div className="w-5 h-5 rounded flex items-center justify-center cursor-pointer mt-0.5 flex-shrink-0 bg-[#8b5cf6]">
                          <Check className="w-3 h-3 text-white stroke-[2]" />
                        </div>
                        <textarea
                          value={item.text}
                          onChange={e =>
                            setAddedItems(prev =>
                              prev.map(i => i.id === item.id ? { ...i, text: e.target.value } : i)
                            )
                          }
                          placeholder="추가 수정 내용을 입력하세요..."
                          rows={Math.max(2, Math.ceil((item.text.length || 20) / 28))}
                          className="flex-1 text-[13px] text-[#0f172a] bg-transparent border-none resize-none focus:outline-none min-h-[60px] leading-relaxed placeholder:text-[#94a3b8]"
                        />
                        <button
                          onClick={() => setAddedItems(prev => prev.filter(i => i.id !== item.id))}
                          className="text-[#94a3b8] hover:text-red-400 transition-colors flex-shrink-0 mt-0.5"
                          title="삭제"
                        >
                          <X className="w-4 h-4 stroke-[1.5]" />
                        </button>
                      </div>
                    ))}

                    <button 
                      onClick={() =>
                        setAddedItems(prev => [
                          ...prev,
                          { id: `added-${Date.now()}`, text: "" },
                        ])
                      }
                      className="w-full h-10 border-2 border-dashed border-[#c8d2e1] rounded-lg flex items-center justify-center gap-1 text-[#94a3b8] hover:border-[#8b5cf6] hover:text-[#8b5cf6] transition-colors"
                    >
                      <span className="text-lg">+</span>
                      <span className="text-[13px] font-medium">새로운 내용 추가</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* 리프 comp인데 areas도 없는 경우 → description 줄글 */
              <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                <div>
                  <h3 className="text-[15px] font-medium text-[#475569] mb-2 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0f172a]" />
                    원문
                  </h3>
                  <div className="flex-1 bg-[#e4eaf2] rounded-xl p-4 min-h-[140px]">
                    <p className="text-[15px] text-[#94a3b8] leading-relaxed">
                      {Array.isArray(selection.data.description)
                        ? selection.data.description.join(" ")
                        : (selection.data.description ?? "설명이 없습니다.")}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 기획 수정 버튼 */}
            <div className="mt-auto pt-4">
              <span className="text-[15px] font-semibold text-[#475569] tracking-widest mb-3 block">NEW SCENARIO</span>
              {selection ? (
                <>
                  <button
                    onClick={handleModify}
                    disabled={
                      modifyLoading ||
                      (Object.values(checkedDescriptions).every(v => !v) &&
                        addedItems.every(i => !i.text.trim()))
                    }
                    className="w-full h-13 px-4 hover:bg-[#7c3aed] bg-[#8b5cf6] text-white rounded-lg flex items-center justify-center gap-2 mb-3 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect x="6.2666" y="0.75" width="3.83333" height="3.85498" stroke="#fff" strokeWidth="1.5"/>
                      <rect x="0.75" y="11.395" width="3.83333" height="3.85498" stroke="#fff" strokeWidth="1.5"/>
                      <rect x="11.4167" y="11.395" width="3.83333" height="3.85498" stroke="#fff" strokeWidth="1.5"/>
                      <path d="M13.3333 10.645V8.41373H8.2222M3.11108 10.645V8.41373H8.2222M8.2222 8.41373V4.84375" stroke="#fff"/>
                    </svg>
                    <span className="text-[17px] font-medium">{modifyLoading ? "분석설계 수정 중..." : "분석설계 수정"}</span>
                  </button>
                  {modifyError && (
                    <p className="text-[12px] text-red-500 mt-1.5">{modifyError}</p>
                  )}
                </>
              ) : (
                <p className="text-[13px] text-[#94a3b8]">
                  항목을 선택하면 기획서 수정이 가능합니다.
                </p>
              )}
            </div>
          </div>
        </aside>
        
        {/* Center Group - Project Tree */}
        <div className="flex-[1] flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-6 pt-4">
            <div className="flex gap-2.5">
              <div className="w-7 h-7 rounded-md flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1 0.333374V3.66671M5.48 13.6667H2.70622C2.43392 13.6667 2.1734 13.5557 1.98483 13.3592L1.27861 12.6236C1.09983 12.4374 1 12.1892 1 11.9311V3.66671M1 3.66671H5.48M11.535 1.46099L12.225 2.53909C12.4088 2.82629 12.7263 3.00004 13.0673 3.00004H16C16.5523 3.00004 17 3.44775 17 4.00004V5.33337C17 5.88566 16.5523 6.33337 16 6.33337H9.68C9.12772 6.33337 8.68 5.88566 8.68 5.33337V2.00004C8.68 1.44776 9.12772 1.00004 9.68 1.00004H10.6927C11.0337 1.00004 11.3512 1.17379 11.535 1.46099Z" stroke="#8559EC" strokeWidth="2"/>
                  <path d="M8.67993 15.3333V12C8.67993 11.4477 9.12765 11 9.67993 11H10.6927C11.0336 11 11.3511 11.1737 11.5349 11.4609L12.2249 12.5391C12.4087 12.8263 12.7262 13 13.0672 13H15.9999C16.5522 13 16.9999 13.4477 16.9999 14V15.3333C16.9999 15.8856 16.5522 16.3333 15.9999 16.3333H9.67993C9.12765 16.3333 8.67993 15.8856 8.67993 15.3333Z" stroke="#8559EC" strokeWidth="2"/>
                </svg>
              </div>
              <div className="flex flex-col">
                <span className="text-[19px] font-semibold text-[#0f172a]">Project Tree</span>
                <span className="text-[15px] text-[#94a3b8] tracking-wide">1-2-3 HIERARCHY</span>
              </div>
            </div>
            
            <button className="w-9 h-9 rounded-full border border-[#e4eaf2] flex items-center justify-center hover:bg-[#f8fafc] transition-colors">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="0.5" y="0.5" width="39" height="39" rx="14.5" fill="white"/>
                <rect x="0.5" y="0.5" width="39" height="39" rx="14.5" stroke="#8559EC"/>
                <path d="M27.8206 11.8148C28.1895 11.4135 28.8048 11.3957 29.1954 11.7748C29.5858 12.1539 29.6032 12.7862 29.2343 13.1876L20.9646 22.1861C20.7842 22.3823 20.5345 22.4956 20.2719 22.4995C20.0091 22.5034 19.7557 22.3976 19.5698 22.2066L16.6511 19.2071C16.2711 18.8167 16.2711 18.1838 16.6511 17.7933C17.031 17.4028 17.6469 17.4028 18.0268 17.7933L20.2377 20.0654L27.8206 11.8148Z" fill="#8559EC"/>
                <path d="M16.8525 25.5612C13.5951 23.6285 12.4791 19.3481 14.3597 16.0006C16.2403 12.6531 20.4055 11.5062 23.6629 13.4388L24.6358 11.7071C20.4478 9.22221 15.0925 10.6968 12.6746 15.0008C10.2566 19.3047 11.6915 24.8081 15.8796 27.2929C20.0676 29.7778 25.4228 28.3032 27.8408 23.9992C28.9904 21.953 29.0139 20 29.0139 17.5004H27.0681C27.0681 19.5 26.9509 21.5838 26.1557 22.9994C24.275 26.3469 20.1098 27.4938 16.8525 25.5612Z" fill="#8559EC"/>
              </svg>
            </button>
          </div>

          <div className="flex-1 px-6 pt-5 pb-8 flex flex-col">
            <div className="bg-[#0F172A] rounded-xl px-5 py-4 mb-8 flex items-center justify-between">
              <div>
                <span className="text-[13px] text-white/70 uppercase tracking-wider">ACTIVE PLAN</span>
                <h2 className="text-[17px] font-semibold text-white mt-0.5">{hierarchy?.repository ?? "분석 대기"}</h2>
              </div>
              <div className="text-right">
                <span className="px-2 py-0.5 bg-white/20 text-white text-[13px] font-medium rounded">v1.{minorVersion}</span>
                <p className="text-[13px] text-white/70 mt-1">Scenario Build</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-2">
              {hierarchy?.components?.length ? (
                hierarchy.components.map(comp => renderComponentNode(comp))
              ) : (
                <div className="border-2 border-dashed border-[#c8d2e1] rounded-xl flex items-center justify-center h-full w-full">
                  <span className="text-[15px] text-[#94a3b8]">시나리오 트리 분석을 실행하세요</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Group - Tabs & Preview */}
        <aside className="flex-[2] flex flex-col bg-white overflow-hidden">
          <div className="flex items-center justify-between px-4 py-4">
            <div className="flex items-center">
              {tabs.map((tab) => {
                const isCompare = tab === "COMPARE"
                const isDisabled = isCompare && !modifyResult
                return (
                  <button
                    key={tab}
                    onClick={() => !isDisabled && setActiveTab(tab as typeof activeTab)}
                    disabled={isDisabled}
                    className={`px-4 py-1.5 mr-0.5 text-[15px] font-medium rounded-full transition-all flex items-center gap-1.5 ${
                    activeTab === tab
                    ? "bg-[#0f172a] text-white shadow-sm"
                    : isDisabled
                    ? "text-[#cbd5e1] cursor-not-allowed"
                    : "text-[#64748b] hover:text-[#0f172a]"
                    }`}
                  >
                    {tab}
                    {isCompare && modifyResult && <span className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6]" />}
                  </button>
                )
              })}
            </div>

            <button className="w-8 h-8 rounded-full border border-[#e4eaf2] flex items-center justify-center hover:bg-[#f8fafc] transition-colors">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="0.5" y="0.5" width="39" height="39" rx="14.5" fill="white"/>
                <rect x="0.5" y="0.5" width="39" height="39" rx="14.5" stroke="#8559EC"/>
                <path d="M19.3858 21.6747C19.6796 21.3827 19.6811 20.9079 19.3891 20.6141C19.0971 20.3203 18.6222 20.3189 18.3284 20.6109L18.8571 21.1428L19.3858 21.6747ZM12.6509 26.5637C12.6497 26.9779 12.9844 27.3148 13.3987 27.316L20.1486 27.3365C20.5628 27.3377 20.8996 27.003 20.9009 26.5887C20.9022 26.1745 20.5674 25.8377 20.1532 25.8365L14.1532 25.8183L14.1714 19.8183C14.1726 19.4041 13.8379 19.0673 13.4237 19.066C13.0095 19.0648 12.6727 19.3996 12.6714 19.8138L12.6509 26.5637ZM18.8571 21.1428L18.3284 20.6109L12.8722 26.0341L13.4009 26.566L13.9296 27.0979L19.3858 21.6747L18.8571 21.1428Z" fill="#8559EC"/>
                <path d="M20.8716 18.0341C20.578 18.3263 20.5769 18.8012 20.869 19.0948C21.1612 19.3884 21.6361 19.3896 21.9297 19.0974L21.4007 18.5658L20.8716 18.0341ZM27.5999 13.1447C27.601 12.7305 27.266 12.3939 26.8518 12.3929L20.1018 12.3765C19.6876 12.3755 19.351 12.7105 19.35 13.1247C19.349 13.5389 19.6839 13.8755 20.0981 13.8765L26.0981 13.8911L26.0835 19.8911C26.0825 20.3053 26.4175 20.6419 26.8317 20.6429C27.2459 20.6439 27.5825 20.3089 27.5835 19.8947L27.5999 13.1447ZM21.4007 18.5658L21.9297 19.0974L27.379 13.6745L26.8499 13.1429L26.3209 12.6113L20.8716 18.0341L21.4007 18.5658Z" fill="#8559EC"/>
              </svg>
            </button>
          </div>
          
          <div className="flex-1 flex items-center justify-center px-6 pt-5 pb-8 overflow-hidden">
            {activeTab === "PREVIEW" && (
              /* iPhone Frame */
              <div className="h-full aspect-[12/19.5] max-h-full bg-[#1a1a1a] rounded-[40px] p-2 shadow-xl">
                <div className="w-full h-full bg-[#f5f5f5] rounded-[32px] relative overflow-hidden">
                  {/* Notch */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[90px] h-[24px] bg-[#1a1a1a] rounded-b-2xl z-10" />
                  
                  {/* Screen Content */}
                  <div className="w-full h-full overflow-y-auto px-3 pt-8 pb-4">
                    {!hierarchy?.components?.length ? (
                      <div className="h-full flex items-center justify-center">
                        <div className="text-center">
                          <p className="text-[14px] text-[#94a3b8]">프리뷰 준비 완료</p>
                          <p className="text-[15px] text-[#cbd5f5] mt-2">시나리오 트리 분석을 실행하세요</p>
                        </div>
                      </div>
                    ) : previewHtml ? (
                      <iframe
                        ref={iframeRef}
                        srcDoc={previewHtml}
                        sandbox="allow-same-origin allow-scripts"
                        style={{ width: "100%", height: "100%", border: "none", display: "block", overflowX: "hidden" }}
                        scrolling="auto"
                        title="페이지 구조 미리보기"
                        onLoad={() => {
                          const id = selection ? (selection.data as { id?: string }).id ?? null : null
                          iframeRef.current?.contentWindow?.postMessage({ type: "highlight", id }, "*")
                        }}
                      />
                    ) : (
                      /* 폴백 — 컴포넌트 기반 와이어프레임 */
                      <div className="overflow-y-auto" style={{ maxHeight: "700px" }}>
                        {hierarchy.components.map((comp) => renderPreviewSection(comp, 0))}
                      </div>
                    )}
                  </div>
                  <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2">
                    <div className="w-[80px] h-[3px] bg-[#1a1a1a] rounded-full" />
                  </div>
                </div>
              </div>
            )}

            {activeTab === "FLOW" && (
              <div className="w-full h-full bg-[#f8fafc] rounded-2xl p-8 overflow-y-auto">
                <div className="flex items-center gap-2 mb-8">
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="3" cy="3" r="2.5" stroke="#8B5CF6" strokeLinejoin="round"/>
                    <circle cx="15" cy="3" r="2.5" stroke="#8B5CF6" strokeLinejoin="round"/>
                    <path d="M9 1.5V16.5M3 5.875V10.875M15 5.875V9.625C15 10.0417 14.55 11 12.75 11.5" stroke="#8B5CF6" strokeWidth="1.5" strokeLinecap="round"/>
                    <circle cx="3" cy="13.5" r="2.5" stroke="#8B5CF6" strokeLinejoin="round"/>
                  </svg>
                  <span className="text-[17px] font-semibold text-[#0f172a]">Business Flow</span>
                </div>

                {flow ? (
                  <>
                    {flowChangedSteps.length > 0 && (
                      <div className="flex items-center gap-1.5 mb-3 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                        <span className="text-[12px] text-amber-700 font-medium">
                          {flowChangedSteps.length}개 단계 수정됨 (step {flowChangedSteps.join(", ")})
                        </span>
                      </div>
                    )}
                    <div className="space-y-6">
                      {flow.steps.map((step) => {
                        const isChanged = flowChangedSteps.includes(step.step)
                        return (
                          <div key={step.step} className="flex gap-4">
                            <div className="flex flex-col items-center">
                              <div className={`w-8 h-8 rounded-full text-white flex items-center justify-center text-[14px] font-semibold ${isChanged ? "bg-amber-500" : "bg-[#8b5cf6]"}`}>
                                {step.step}
                              </div>
                              {step.step < flow.steps.length && (
                                <div className="w-0.5 flex-1 bg-[#e4eaf2] mt-2" />
                              )}
                            </div>
                            <div className="flex-1 pb-6">
                              <div className="flex items-center gap-2 mb-2">
                                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${isChanged ? "text-amber-700 bg-amber-100" : "text-[#8b5cf6] bg-[#8b5cf6]/10"}`}>
                                  {step.component}
                                </span>
                                <span className="text-[11px] text-[#64748b] bg-[#f1f5f9] px-2 py-0.5 rounded-full">
                                  {step.area}
                                </span>
                                {isChanged && (
                                  <span className="ml-auto text-[11px] text-amber-600 font-semibold bg-amber-100 px-2 py-0.5 rounded-full">
                                    수정됨
                                  </span>
                                )}
                              </div>
                              <h3 className={`text-[19px] font-semibold mb-2 ${isChanged ? "text-amber-600" : "text-[#0f172a]"}`}>{step.action}</h3>
                              <p className="text-[14px] text-[#64748b] leading-relaxed">{step.result}</p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <p className="text-[14px] text-[#94a3b8]">
                      레포지토리를 분석하면 플로우가 생성됩니다.
                    </p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "DIAGRAM" && (
              <div className="w-full h-full bg-[#f8fafc] rounded-2xl p-8 overflow-y-auto">
                <div className="flex items-center gap-2 mb-8">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6.5 16.0495C6.5 14.6858 5.38071 13.5804 4 13.5804C2.61929 13.5804 1.5 14.6858 1.5 16.0495C1.5 17.4132 2.61929 18.5186 4 18.5186V20.0001C1.79086 20.0001 0 18.2314 0 16.0495C0 13.8676 1.79086 12.0989 4 12.0989C6.20914 12.0989 8 13.8676 8 16.0495C8 18.2314 6.20914 20.0001 4 20.0001V18.5186C5.38071 18.5186 6.5 17.4132 6.5 16.0495Z" fill="#8B5CF6"/>
                    <path d="M18.5 4.19744C18.5 2.83378 17.3807 1.72831 16 1.72831C14.6193 1.72831 13.5 2.83378 13.5 4.19744C13.5 5.56111 14.6193 6.66658 16 6.66658V8.14806C13.7909 8.14806 12 6.37931 12 4.19744C12 2.01558 13.7909 0.246826 16 0.246826C18.2091 0.246826 20 2.01558 20 4.19744C20 6.37931 18.2091 8.14806 16 8.14806V6.66658C17.3807 6.66658 18.5 5.56111 18.5 4.19744Z" fill="#8B5CF6"/>
                    <path d="M16.75 6.66667C16.75 9.89105 15.1989 12.2673 13.293 13.8397C11.4098 15.3933 9.13466 16.2029 7.54395 16.2953L7.45605 14.8158C8.69868 14.7436 10.6736 14.0717 12.332 12.7035C13.9677 11.3541 15.25 9.36821 15.25 6.66667H16.75ZM3.25 0.740741C3.25 0.331641 3.58579 0 4 0C4.41421 0 4.75 0.331641 4.75 0.740741V12.5926H3.25V0.740741Z" fill="#8B5CF6"/>
                  </svg>
                  <span className="text-[17px] font-semibold text-[#0f172a]">시스템 아키텍쳐 다이어그램</span>
                  {diagramChangedNodes.length > 0 && (
                    <span className="flex items-center gap-1 text-[11px] text-amber-700 font-semibold bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      {diagramChangedNodes.length}개 노드 수정됨
                    </span>
                  )}
                </div>

                {diagram ? (
                  <>
                    <MermaidDiagram chart={diagram} />
                    <details className="mt-4">
                      <summary className="text-[12px] text-[#94a3b8] cursor-pointer hover:text-[#64748b] select-none">
                        Mermaid 원본 보기
                      </summary>
                      <pre className="mt-2 text-[12px] leading-relaxed font-mono text-[#475569] bg-white border border-[#e4eaf2] rounded-lg p-4 overflow-x-auto whitespace-pre-wrap">
                        {diagram}
                      </pre>
                    </details>
                  </>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <p className="text-[14px] text-[#94a3b8]">
                      레포지토리를 분석하면 다이어그램이 생성됩니다.
                    </p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "COMPARE" && modifyResult && (
              <div className="w-full h-full bg-[#f8fafc] rounded-2xl p-6 overflow-hidden flex flex-col">
                {/* 내부 탭 */}
                <div className="flex items-center gap-2 mb-4">
                  <button
                    onClick={() => setCompareTab("files")}
                    className={`px-4 py-1.5 text-[14px] font-medium rounded-lg transition-all ${
                      compareTab === "files"
                        ? "bg-[#8b5cf6] text-white"
                        : "bg-white border border-[#e4eaf2] text-[#64748b] hover:border-[#8b5cf6]"
                    }`}
                  >
                    파일목록
                  </button>
                  <button
                    onClick={() => setCompareTab("detail")}
                    className={`px-4 py-1.5 text-[14px] font-medium rounded-lg transition-all ${
                      compareTab === "detail"
                        ? "bg-[#8b5cf6] text-white"
                        : "bg-white border border-[#e4eaf2] text-[#64748b] hover:border-[#8b5cf6]"
                    }`}
                  >
                    상세비교
                  </button>
                </div>
              
                {compareTab === "files" ? (
                  /* 파일목록 탭 */
                  <div className="flex-1 overflow-y-auto">
                    <div className="space-y-2">
                      <div
                        onClick={() => setCompareTab("detail")}
                        className="flex items-center gap-3 p-4 bg-white rounded-xl border border-[#e4eaf2] hover:border-[#8b5cf6] cursor-pointer transition-colors"
                      >
                        <div className="w-10 h-10 rounded-lg bg-[#8b5cf6]/10 flex items-center justify-center">
                          <FileCode2 className="w-5 h-5 text-[#8b5cf6]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[15px] font-medium text-[#0f172a] truncate">{modifyResult.source_file}</p>
                          <p className="text-[13px] text-[#94a3b8]">수정됨</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <ChevronRight className="w-4 h-4 text-[#94a3b8]" />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* 상세비교 탭 */
                  <div className="flex-1 overflow-y-auto">
                    {/* 파일명 헤더 */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#fef2f2] border border-[#fecaca]">
                        <span className="w-2 h-2 rounded-full bg-[#ef4444]" />
                        <span className="text-[12px] font-medium text-[#ef4444]">Before</span>
                      </div>
                      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f0fdf4] border border-[#bbf7d0]">
                        <span className="w-2 h-2 rounded-full bg-[#22c55e]" />
                        <span className="text-[12px] font-medium text-[#22c55e]">After</span>
                      </div>
                      <span className="text-[12px] text-[#94a3b8] ml-auto font-mono">
                        {modifyResult.source_file}
                      </span>
                    </div>
              
                    {/* Diff Viewer */}
                    <div className="rounded-xl overflow-hidden border border-[#e4eaf2] text-[13px]">
                      <ReactDiffViewer
                        oldValue={modifyResult.original_code}
                        newValue={modifyResult.modified_code}
                        splitView={true}
                        leftTitle="Before"
                        rightTitle="After"
                        useDarkTheme={false}
                        hideLineNumbers={false}
                        styles={{
                          variables: {
                            light: {
                              diffViewerBackground: "#ffffff",
                              addedBackground: "#f0fdf4",
                              addedColor: "#166534",
                              removedBackground: "#fef2f2",
                              removedColor: "#991b1b",
                              wordAddedBackground: "#bbf7d0",
                              wordRemovedBackground: "#fecaca",
                              addedGutterBackground: "#dcfce7",
                              removedGutterBackground: "#fee2e2",
                              gutterBackground: "#f8fafc",
                              gutterBackgroundDark: "#f1f5f9",
                              highlightBackground: "#fefce8",
                              highlightGutterBackground: "#fef9c3",
                              codeFoldBackground: "#f1f5f9",
                              emptyLineBackground: "#f8fafc",
                              codeFoldContentColor: "#94a3b8",
                              diffViewerTitleBackground: "#f8fafc",
                              diffViewerTitleColor: "#0f172a",
                              diffViewerTitleBorderColor: "#e4eaf2",
                            },
                          },
                          line: { fontSize: "12px", fontFamily: "monospace" },
                          gutter: { fontSize: "11px", minWidth: "40px" },
                          titleBlock: { fontSize: "12px", fontWeight: "600" },
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
