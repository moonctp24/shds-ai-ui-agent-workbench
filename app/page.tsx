"use client"

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
          <p className="text-[12px] text-red-500 text-center">
            다이어그램 렌더링에 실패했습니다.
          </p>
          <button
            onClick={() => setRetryKey(k => k + 1)}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-white border border-red-300 hover:border-red-400 hover:bg-red-50 text-red-600 text-[12px] font-medium rounded-lg transition-colors shadow-sm"
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

// ─── 메인 컴포넌트 ─────────────────────────────────────────────────────────────

const INITIAL_DATA = analysisData as unknown as Hierarchy

export default function WorkspacePage() {
  const [minorVersion, setMinorVersion] = useState(0)   // v1.0 → v1.1 → …

  // JSON에서 직접 초기화 (API 호출 없음)
  const [hierarchy, setHierarchy] = useState<Hierarchy>(INITIAL_DATA)
  const [expandedComponents, setExpandedComponents] = useState<string[]>(
    INITIAL_DATA.components?.length ? [INITIAL_DATA.components[0].id] : []
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

  const [rightTab, setRightTab] = useState<"PREVIEW" | "FLOW" | "DIAGRAM" | "CODE" | "DIFF">("PREVIEW")
  const [checkedDescriptions, setCheckedDescriptions] = useState<Record<string, boolean>>({})
  // 체크된 항목의 편집된 텍스트 (key: `${id}-${idx}`, value: 편집 중인 텍스트)
  const [editedDescriptions, setEditedDescriptions] = useState<Record<string, string>>({})
  // 사용자가 직접 추가한 자유 입력 항목
  const [addedItems, setAddedItems] = useState<{ id: string; text: string }[]>([])

  const [flow, setFlow] = useState<Flow | null>(INITIAL_DATA.flow ?? null)
  const [diagram, setDiagram] = useState<string | null>(INITIAL_DATA.diagram ?? null)
  const [flowChangedSteps, setFlowChangedSteps] = useState<number[]>([])
  const [diagramChangedNodes, setDiagramChangedNodes] = useState<string[]>([])

  // 영역/컴포넌트 선택 변경 시 수정 결과·체크박스·편집내역·추가항목 초기화 (탭은 유지)
  useEffect(() => {
    setModifyResult(null)
    setModifyError(null)
    setCheckedDescriptions({})
    setEditedDescriptions({})
    setAddedItems([])
  }, [selection])

  // ─── 핸들러 ──────────────────────────────────────────────────────────────────

  const handleModify = async () => {
    if (selection?.type !== "area") return
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
      return
    }

    const modificationRequest = [...checkedTexts, ...addedTexts].join("\n")

    setModifyLoading(true)
    setModifyError(null)
    setModifyResult(null)

    try {
      const area = selection.data
      const res = await api.post("/api/modify-code", {
        area_id: area.id,
        source_file: area.source_file,
        original_code: area.code,
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
      setRightTab("DIFF")
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
    if (selection?.type !== "area") return ""
    return modifyResult ? modifyResult.original_code : selection.data.code
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
      <span className={`shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded ${s.tagCls} text-white`}>
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
          <span className="text-[11px] font-medium text-white/85 truncate">{area.name}</span>
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
        <span className="text-[11px] font-semibold text-[#0f172a] truncate">{area.name}</span>
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
          <span className={`text-[10px] font-bold uppercase tracking-widest ${labelColor}`}>
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

  // ─── 재귀 트리 노드 렌더러 ───────────────────────────────────────────────────

  const renderComponentNode = (comp: Component, depth: number = 0): React.ReactNode => {
    const isExpanded = expandedComponents.includes(comp.id)
    const isCompSelected = selection?.type === "component" && selection.data.id === comp.id
    const hasChildren = (comp.children?.length ?? 0) > 0
    const hasAreas = comp.areas.length > 0
    const isExpandable = hasChildren || hasAreas
    const indentPx = depth * 14

    const dotColor =
      depth === 0 ? "bg-[#8b5cf6]" : depth === 1 ? "bg-[#a78bfa]" : "bg-[#c4b5fd]"

    return (
      <div key={comp.id}>
        <div
          onClick={() => {
            if (isExpandable) toggleComponent(comp.id)
            setSelection({ type: "component", data: comp })
            setRightTab("CODE")
          }}
          style={{ paddingLeft: `${16 + indentPx}px` }}
          className={`flex items-center gap-2 py-2.5 pr-4 cursor-pointer transition-colors ${
            isCompSelected
              ? "bg-[#8b5cf6]/10 border-l-2 border-[#8b5cf6]"
              : "hover:bg-[#f8fafc] border-l-2 border-transparent"
          }`}
        >
          <button
            onClick={(e) => { e.stopPropagation(); if (isExpandable) toggleComponent(comp.id) }}
            className="w-4 h-4 flex items-center justify-center text-[#64748b] shrink-0"
          >
            {isExpandable ? (
              isExpanded
                ? <ChevronDown className="w-3.5 h-3.5" />
                : <ChevronRight className="w-3.5 h-3.5" />
            ) : (
              <span className="w-3.5 h-3.5 inline-block" />
            )}
          </button>
          <div className={`w-2 h-2 rounded-sm shrink-0 ${dotColor}`} />
          <span className={`truncate font-medium ${
            isCompSelected ? "text-[#8b5cf6]" : "text-[#0f172a]"
          } ${depth === 0 ? "text-[13px]" : "text-[12px]"}`}>
            {comp.name}
          </span>
        </div>

        {isExpanded && (
          <>
            {comp.children?.map(child => renderComponentNode(child, depth + 1))}
            {comp.areas.map(area => {
              const isAreaSelected = selection?.type === "area" && selection.data.id === area.id
              return (
                <div
                  key={area.id}
                  onClick={() => {
                    setSelection({ type: "area", data: area, parentComponent: comp })
                    setRightTab("CODE")
                  }}
                  style={{ paddingLeft: `${40 + indentPx}px` }}
                  className={`flex items-center gap-2 pr-4 py-2 cursor-pointer transition-colors ${
                    isAreaSelected
                      ? "bg-[#8b5cf6] text-white"
                      : "hover:bg-[#f1f5f9] text-[#475569]"
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    isAreaSelected ? "bg-white" : "bg-[#8b5cf6]"
                  }`} />
                  <span className="text-[12px] truncate">{area.name}</span>
                </div>
              )
            })}
          </>
        )}
      </div>
    )
  }

  // ─── 렌더링 ──────────────────────────────────────────────────────────────────

  return (
    <div className="h-screen bg-white flex overflow-hidden">

      {/* ── 좌측 패널 ─────────────────────────────────────────────────── */}
      <aside className="w-[300px] flex-shrink-0 flex flex-col border-r border-[#e4eaf2] bg-[#0f172a]">

        {/* 헤더 */}
        <div className="flex flex-col gap-1.5 px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#8b5cf6] flex items-center justify-center shrink-0">
              <Layers className="w-4 h-4 text-white" />
            </div>
            <span className="text-[15px] font-semibold text-white flex-1">AI Agent Workbench</span>
            {/* 버전 배지 */}
            <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-[#8b5cf6]/30 text-[#c4b5fd] border border-[#8b5cf6]/40">
              v1.{minorVersion}
            </span>
          </div>
          {/* 분석 대상 레포 표시 */}
          <p className="text-[10px] text-white/30 font-mono truncate pl-10">
            shcard_demo · main
          </p>
        </div>


        {/* 좌측 중단: 선택된 컴포넌트/영역 설명 (체크 → 인라인 편집) */}
        <div className="flex-1 px-4 py-4 border-b border-white/10 overflow-y-auto">
          <p className="text-[10px] text-white/50 uppercase tracking-widest mb-3">
            {selection?.type === "area" ? "영역 분석 결과" : "컴포넌트 분석 결과"}
          </p>
          {selectedDescription && selectedDescription.length > 0 ? (
            <>
              <p className="text-[10px] text-white/30 mb-3">항목을 선택하면 직접 편집할 수 있습니다.</p>
              <ul className="space-y-2">
                {selectedDescription.map((sentence, idx) => {
                  const key = `${selection?.data?.id}-${idx}`
                  const checked = checkedDescriptions[key] ?? false
                  const editedText = editedDescriptions[key] ?? sentence

                  const toggleCheck = () => {
                    const next = !checked
                    setCheckedDescriptions(prev => ({ ...prev, [key]: next }))
                    if (next) {
                      // 체크 시 원본 텍스트로 편집 초기화
                      setEditedDescriptions(prev => ({ ...prev, [key]: sentence }))
                    } else {
                      // 해제 시 편집 내역 삭제 (원본 복구)
                      setEditedDescriptions(prev => {
                        const next = { ...prev }
                        delete next[key]
                        return next
                      })
                    }
                  }

                  return (
                    <li
                      key={key}
                      className={`rounded-lg px-2 py-2 transition-colors ${
                        checked ? "bg-[#8b5cf6]/20 border border-[#8b5cf6]/40" : "border border-transparent"
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          id={key}
                          checked={checked}
                          onChange={toggleCheck}
                          className="mt-1 w-3.5 h-3.5 shrink-0 accent-[#8b5cf6] cursor-pointer"
                        />
                        {checked ? (
                          <textarea
                            value={editedText}
                            onChange={(e) =>
                              setEditedDescriptions(prev => ({ ...prev, [key]: e.target.value }))
                            }
                            rows={Math.max(2, Math.ceil(editedText.length / 28))}
                            className="flex-1 bg-white/10 text-[#c4b5fd] text-[12px] leading-relaxed rounded px-2 py-1 border border-[#8b5cf6]/50 focus:outline-none focus:ring-1 focus:ring-[#8b5cf6] resize-none"
                          />
                        ) : (
                          <label
                            htmlFor={key}
                            className="flex-1 text-[12px] leading-relaxed text-white/60 cursor-pointer select-none"
                          >
                            {sentence}
                          </label>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </>
          ) : (
            <p className="text-[12px] text-white/30">
              {hierarchy ? "항목을 선택하세요." : "레포지토리를 분석하면 결과가 표시됩니다."}
            </p>
          )}

          {/* 분석 완료 후에만 추가 항목 영역 표시 */}
          {hierarchy && (
            <>
              {/* 직접 추가한 텍스트박스 목록 */}
              {addedItems.length > 0 && (
                <ul className="mt-3 space-y-2">
                  {addedItems.map(item => (
                    <li
                      key={item.id}
                      className="flex items-start gap-2 rounded-lg px-2 py-2 bg-[#8b5cf6]/20 border border-[#8b5cf6]/40"
                    >
                      <textarea
                        value={item.text}
                        onChange={e =>
                          setAddedItems(prev =>
                            prev.map(i => i.id === item.id ? { ...i, text: e.target.value } : i)
                          )
                        }
                        placeholder="추가 수정 내용을 입력하세요..."
                        rows={Math.max(2, Math.ceil((item.text.length || 20) / 28))}
                        className="flex-1 bg-white/10 text-[#c4b5fd] text-[12px] leading-relaxed rounded px-2 py-1 border border-[#8b5cf6]/50 focus:outline-none focus:ring-1 focus:ring-[#8b5cf6] resize-none placeholder:text-white/25"
                      />
                      <button
                        onClick={() => setAddedItems(prev => prev.filter(i => i.id !== item.id))}
                        className="mt-1 p-1 rounded hover:bg-white/10 text-white/40 hover:text-red-400 transition-colors shrink-0"
                        title="삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {/* 컴포넌트 추가 버튼 */}
              <button
                onClick={() =>
                  setAddedItems(prev => [
                    ...prev,
                    { id: `added-${Date.now()}`, text: "" },
                  ])
                }
                className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-[#8b5cf6]/60 bg-[#8b5cf6]/10 hover:bg-[#8b5cf6]/20 text-[#c4b5fd] text-[12px] font-medium transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                컴포넌트 추가
              </button>
            </>
          )}
        </div>

        {/* 좌측 하단: 기획 수정 버튼 */}
        <div className="px-4 py-4">
          {selection?.type === "area" ? (
            <>
              <button
                onClick={handleModify}
                disabled={
                  modifyLoading ||
                  (Object.values(checkedDescriptions).every(v => !v) &&
                    addedItems.every(i => !i.text.trim()))
                }
                className="w-full h-9 bg-[#8b5cf6] hover:bg-[#7c3aed] disabled:opacity-40 disabled:cursor-not-allowed text-white text-[12px] font-medium rounded-lg transition-colors"
              >
                {modifyLoading ? "수정 중..." : "기획 수정"}
              </button>
              {modifyError && (
                <p className="text-[11px] text-red-400 mt-1.5">{modifyError}</p>
              )}
            </>
          ) : (
            <p className="text-[12px] text-white/30">
              영역(Area)을 선택하면 기획서 수정이 가능합니다.
            </p>
          )}
        </div>
      </aside>

      {/* ── 중앙 패널: 계층 트리 ──────────────────────────────────────── */}
      <div className="w-[280px] flex-shrink-0 flex flex-col border-r border-[#e4eaf2] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#e4eaf2]">
          <div className="flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-[#8b5cf6]" />
            <span className="text-[13px] font-semibold text-[#0f172a]">
              {hierarchy?.repository ?? "Project Tree"}
            </span>
          </div>
          <p className="text-[10px] text-[#94a3b8] mt-0.5 uppercase tracking-widest">
            Repository → 컴포넌트 → 영역
          </p>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {!hierarchy ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-[12px] text-[#94a3b8]">분석 결과가 없습니다.</p>
            </div>
          ) : (
            hierarchy.components.map(comp => renderComponentNode(comp, 0))
          )}
        </div>
      </div>

      {/* ── 우측 패널: 코드 뷰 ────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[#f8fafc]">

        {/* 탭 헤더 */}
        <div className="flex items-center gap-1 px-5 py-3 border-b border-[#e4eaf2] bg-white">
          <button
            onClick={() => setRightTab("PREVIEW")}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[12px] font-medium transition-colors ${
              rightTab === "PREVIEW"
                ? "bg-[#0f172a] text-white"
                : "text-[#64748b] hover:text-[#0f172a]"
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            PREVIEW
          </button>
          <button
            onClick={() => setRightTab("FLOW")}
            disabled={!flow}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[12px] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
              rightTab === "FLOW"
                ? "bg-[#0f172a] text-white"
                : "text-[#64748b] hover:text-[#0f172a]"
            }`}
          >
            <GitMerge className="w-3.5 h-3.5" />
            FLOW
            {flow && (
              <span className={`w-1.5 h-1.5 rounded-full ${flowChangedSteps.length > 0 ? "bg-amber-400" : "bg-emerald-400"}`} />
            )}
          </button>
          <button
            onClick={() => setRightTab("DIAGRAM")}
            disabled={!diagram}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[12px] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
              rightTab === "DIAGRAM"
                ? "bg-[#0f172a] text-white"
                : "text-[#64748b] hover:text-[#0f172a]"
            }`}
          >
            <Share2 className="w-3.5 h-3.5" />
            DIAGRAM
            {diagram && (
              <span className={`w-1.5 h-1.5 rounded-full ${diagramChangedNodes.length > 0 ? "bg-amber-400" : "bg-blue-400"}`} />
            )}
          </button>
          <button
            onClick={() => setRightTab("CODE")}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[12px] font-medium transition-colors ${
              rightTab === "CODE"
                ? "bg-[#0f172a] text-white"
                : "text-[#64748b] hover:text-[#0f172a]"
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            CODE
          </button>
          <button
            onClick={() => setRightTab("DIFF")}
            disabled={!modifyResult}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[12px] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
              rightTab === "DIFF"
                ? "bg-[#0f172a] text-white"
                : "text-[#64748b] hover:text-[#0f172a]"
            }`}
          >
            <Diff className="w-3.5 h-3.5" />
            DIFF
            {modifyResult && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6]" />
            )}
          </button>

          {selection?.type === "area" && (
            <div className="ml-auto flex items-center gap-2 text-[11px] text-[#94a3b8]">
              <FileCode2 className="w-3.5 h-3.5" />
              {selection.data.source_file}
            </div>
          )}
        </div>

        {/* 콘텐츠 */}
        <div className="flex-1 overflow-auto p-5">

          {rightTab === "PREVIEW" && (
            <div className="flex flex-col items-center">
              {/* 타이틀 + 범례 */}
              <div className="w-full max-w-[390px] mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <Monitor className="w-4 h-4 text-[#0ea5e9]" />
                  <h2 className="text-[14px] font-semibold text-[#0f172a]">페이지 구조 미리보기</h2>
                  <span className="ml-auto text-[11px] text-[#94a3b8] font-mono">{hierarchy.repository}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {(["button","banner","nav","input","list","card","default"] as const).map((t) => {
                    const s = AREA_STYLE_MAP[t]
                    const labels: Record<string, string> = {
                      button:"버튼", banner:"이미지/배너", nav:"내비/메뉴",
                      input:"입력/검색", list:"목록", card:"카드", default:"기타 UI"
                    }
                    return (
                      <span key={t} className="flex items-center gap-1">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${s.tagCls} text-white`}>{s.tag}</span>
                        <span className="text-[10px] text-[#94a3b8]">{labels[t]}</span>
                      </span>
                    )
                  })}
                </div>
              </div>

              {/* 아이폰 17 프레임 */}
              <div className="relative w-[390px] shrink-0">
                <div className="relative bg-[#1c1c1e] rounded-[52px] p-[10px] shadow-2xl ring-1 ring-white/10">
                  {/* 사이드 버튼 (왼쪽) */}
                  <div className="absolute -left-[3px] top-[112px] w-[3px] h-[36px] bg-[#3a3a3c] rounded-l-full" />
                  <div className="absolute -left-[3px] top-[160px] w-[3px] h-[64px] bg-[#3a3a3c] rounded-l-full" />
                  <div className="absolute -left-[3px] top-[236px] w-[3px] h-[64px] bg-[#3a3a3c] rounded-l-full" />
                  {/* 전원 버튼 (오른쪽) */}
                  <div className="absolute -right-[3px] top-[176px] w-[3px] h-[80px] bg-[#3a3a3c] rounded-r-full" />

                  {/* 스크린 영역 */}
                  <div className="bg-white rounded-[44px] overflow-hidden relative">
                    {/* Dynamic Island */}
                    <div className="absolute top-[14px] left-1/2 -translate-x-1/2 w-[120px] h-[34px] bg-[#1c1c1e] rounded-full z-20 flex items-center justify-center gap-3">
                      <div className="w-[10px] h-[10px] rounded-full bg-[#2c2c2e]" />
                      <div className="w-[14px] h-[14px] rounded-full bg-[#2c2c2e]" />
                    </div>

                    {/* 상태바 */}
                    <div className="flex items-center justify-between px-8 pt-4 pb-1 h-[52px]">
                      <span className="text-[12px] font-semibold text-[#0f172a]">9:41</span>
                      <div className="flex items-center gap-1.5 mt-1">
                        <svg width="17" height="12" viewBox="0 0 17 12" fill="none">
                          <rect x="0" y="4" width="3" height="8" rx="0.8" fill="#0f172a"/>
                          <rect x="4.5" y="2.5" width="3" height="9.5" rx="0.8" fill="#0f172a"/>
                          <rect x="9" y="0.5" width="3" height="11.5" rx="0.8" fill="#0f172a"/>
                          <rect x="13.5" y="0" width="3" height="12" rx="0.8" fill="#e2e8f0"/>
                        </svg>
                        <svg width="16" height="12" viewBox="0 0 16 12" fill="#0f172a">
                          <path d="M8 9.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3z"/>
                          <path d="M3.5 6.5C4.9 5.1 6.4 4.3 8 4.3s3.1.8 4.5 2.2" stroke="#0f172a" strokeWidth="1.4" fill="none" strokeLinecap="round"/>
                          <path d="M1 4C3 2 5.4 1 8 1s5 1 7 3" stroke="#0f172a" strokeWidth="1.4" fill="none" strokeLinecap="round"/>
                        </svg>
                        <div className="flex items-center gap-0.5">
                          <div className="w-[22px] h-[11px] border border-[#0f172a] rounded-[3px] p-[1.5px]">
                            <div className="w-full h-full bg-[#0f172a] rounded-[1.5px]" />
                          </div>
                          <div className="w-[2px] h-[5px] bg-[#0f172a] rounded-r-sm" />
                        </div>
                      </div>
                    </div>

                    {/* 페이지 컨텐츠 (스크롤) */}
                    <div className="overflow-y-auto" style={{ maxHeight: "700px" }}>
                      {hierarchy.components.map((comp) => renderPreviewSection(comp, 0))}
                    </div>

                    {/* 홈 인디케이터 */}
                    <div className="flex justify-center py-2 bg-white">
                      <div className="w-[130px] h-[5px] bg-[#1c1c1e] rounded-full" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {rightTab === "CODE" && (
            <>
              {selection?.type === "area" ? (
                <pre className="text-[12px] leading-relaxed text-[#0f172a] font-mono whitespace-pre-wrap bg-white border border-[#e4eaf2] rounded-xl p-5 min-h-full">
                  {selectedCode || "코드가 없습니다."}
                </pre>
              ) : selection?.type === "component" ? (
                <div className="space-y-4">
                  <div className="bg-white border border-[#e4eaf2] rounded-xl p-5">
                    <p className="text-[12px] font-semibold text-[#0f172a] mb-1">{selection.data.name}</p>
                    <p className="text-[11px] text-[#94a3b8] mb-3">{selection.data.source_file}</p>
                    <p className="text-[13px] text-[#475569] leading-relaxed">
                      {Array.isArray(selection.data.description)
                        ? selection.data.description.join(" ")
                        : selection.data.description}
                    </p>
                  </div>

                  {(selection.data.children?.length ?? 0) > 0 && (
                    <>
                      <p className="text-[11px] text-[#94a3b8] px-1">하위 컴포넌트 ({selection.data.children.length}개)</p>
                      {selection.data.children.map((child) => (
                        <div
                          key={child.id}
                          onClick={() => setSelection({ type: "component", data: child })}
                          className="bg-white border border-[#e4eaf2] rounded-xl p-4 cursor-pointer hover:border-[#a78bfa] transition-colors"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="w-1.5 h-1.5 rounded-sm bg-[#a78bfa]" />
                            <p className="text-[12px] font-medium text-[#0f172a]">{child.name}</p>
                            <span className="text-[10px] text-[#94a3b8] ml-auto">{child.source_file}</span>
                          </div>
                          <p className="text-[12px] text-[#64748b] leading-relaxed pl-3.5">
                            {Array.isArray(child.description) ? child.description.join(" ") : child.description}
                          </p>
                        </div>
                      ))}
                    </>
                  )}

                  {selection.data.areas.length > 0 && (
                    <>
                      <p className="text-[11px] text-[#94a3b8] px-1">하위 영역 ({selection.data.areas.length}개)</p>
                      {selection.data.areas.map((area) => (
                        <div
                          key={area.id}
                          onClick={() => setSelection({ type: "area", data: area, parentComponent: selection.data })}
                          className="bg-white border border-[#e4eaf2] rounded-xl p-4 cursor-pointer hover:border-[#8b5cf6] transition-colors"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6]" />
                            <p className="text-[12px] font-medium text-[#0f172a]">{area.name}</p>
                            <span className="text-[10px] text-[#94a3b8] ml-auto">{area.source_file}</span>
                          </div>
                          <p className="text-[12px] text-[#64748b] leading-relaxed pl-3.5">
                            {Array.isArray(area.description) ? area.description.join(" ") : area.description}
                          </p>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <p className="text-[13px] text-[#94a3b8]">
                    {hierarchy ? "트리에서 항목을 선택하세요." : "레포지토리를 분석하세요."}
                  </p>
                </div>
              )}
            </>
          )}

          {rightTab === "DIFF" && modifyResult && (
            <div>
              {/* 파일명 헤더 */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#fef2f2] border border-[#fecaca]">
                  <span className="w-2 h-2 rounded-full bg-[#ef4444]" />
                  <span className="text-[11px] font-medium text-[#ef4444]">Before</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f0fdf4] border border-[#bbf7d0]">
                  <span className="w-2 h-2 rounded-full bg-[#22c55e]" />
                  <span className="text-[11px] font-medium text-[#22c55e]">After</span>
                </div>
                <span className="text-[11px] text-[#94a3b8] ml-auto font-mono">
                  {modifyResult.source_file}
                </span>
              </div>

              {/* Diff Viewer */}
              <div className="rounded-xl overflow-hidden border border-[#e4eaf2] text-[12px]">
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

          {rightTab === "FLOW" && (
            <div>
              {flow ? (
                <>
                  <div className="flex items-center gap-2 mb-5">
                    <GitMerge className="w-4 h-4 text-[#8b5cf6]" />
                    <h2 className="text-[14px] font-semibold text-[#0f172a]">{flow.title}</h2>
                    <span className="ml-auto text-[11px] text-[#94a3b8]">{flow.steps.length}단계</span>
                  </div>
                  {flowChangedSteps.length > 0 && (
                    <div className="flex items-center gap-1.5 mb-3 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                      <span className="text-[11px] text-amber-700 font-medium">
                        {flowChangedSteps.length}개 단계 수정됨 (step {flowChangedSteps.join(", ")})
                      </span>
                    </div>
                  )}
                  <ol className="relative border-l-2 border-[#e4eaf2] ml-3 space-y-0">
                    {flow.steps.map((step) => {
                      const isChanged = flowChangedSteps.includes(step.step)
                      return (
                        <li key={step.step} className="ml-6 pb-6 last:pb-0">
                          {/* 타임라인 노드 */}
                          <span className={`absolute -left-[13px] flex items-center justify-center w-6 h-6 rounded-full ring-4 ring-white text-white text-[10px] font-bold ${isChanged ? "bg-amber-500" : "bg-[#8b5cf6]"}`}>
                            {step.step}
                          </span>
                          <div className={`border rounded-xl p-4 shadow-sm ${isChanged ? "bg-amber-50 border-amber-300" : "bg-white border-[#e4eaf2]"}`}>
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${isChanged ? "text-amber-700 bg-amber-100" : "text-[#8b5cf6] bg-[#8b5cf6]/10"}`}>
                                {step.component}
                              </span>
                              <span className="text-[10px] text-[#64748b] bg-[#f1f5f9] px-2 py-0.5 rounded-full">
                                {step.area}
                              </span>
                              {isChanged && (
                                <span className="ml-auto text-[10px] text-amber-600 font-semibold bg-amber-100 px-2 py-0.5 rounded-full">
                                  ✦ 수정됨
                                </span>
                              )}
                            </div>
                            <p className="text-[12px] text-[#0f172a] font-medium mb-1">
                              {step.action}
                            </p>
                            <p className="text-[11px] text-[#64748b] flex items-start gap-1.5">
                              <span className={`mt-0.5 w-3.5 h-3.5 rounded-full shrink-0 flex items-center justify-center text-[8px] font-bold ${isChanged ? "bg-amber-100 text-amber-600" : "bg-emerald-100 text-emerald-600"}`}>→</span>
                              {step.result}
                            </p>
                          </div>
                        </li>
                      )
                    })}
                  </ol>
                </>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <p className="text-[13px] text-[#94a3b8]">
                    레포지토리를 분석하면 플로우가 생성됩니다.
                  </p>
                </div>
              )}
            </div>
          )}

          {rightTab === "DIAGRAM" && (
            <div>
              {diagram ? (
                <>
                  <div className="flex items-center gap-2 mb-4">
                    <Share2 className="w-4 h-4 text-[#3b82f6]" />
                    <h2 className="text-[14px] font-semibold text-[#0f172a]">컴포넌트 구조 다이어그램</h2>
                    {diagramChangedNodes.length > 0 && (
                      <span className="flex items-center gap-1 text-[10px] text-amber-700 font-semibold bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                        {diagramChangedNodes.length}개 노드 수정됨
                      </span>
                    )}
                    {hierarchy?.repository && (
                      <span className="ml-auto text-[11px] text-[#94a3b8] font-mono">{hierarchy.repository}</span>
                    )}
                  </div>
                  <MermaidDiagram chart={diagram} />
                  {/* 원본 Mermaid 텍스트 (접이식) */}
                  <details className="mt-4">
                    <summary className="text-[11px] text-[#94a3b8] cursor-pointer hover:text-[#64748b] select-none">
                      Mermaid 원본 보기
                    </summary>
                    <pre className="mt-2 text-[11px] leading-relaxed font-mono text-[#475569] bg-[#f8fafc] border border-[#e4eaf2] rounded-lg p-4 overflow-x-auto whitespace-pre-wrap">
                      {diagram}
                    </pre>
                  </details>
                </>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <p className="text-[13px] text-[#94a3b8]">
                    레포지토리를 분석하면 다이어그램이 생성됩니다.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
