"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import dynamic from "next/dynamic"
import {
  ChevronDown,
  ChevronRight,
  Layers,
  GitBranch,
  Code2,
  FileCode2,
  Diff,
  CheckCircle2,
  Loader2,
  Circle,
} from "lucide-react"
import { api } from "@/lib/api"

const ReactDiffViewer = dynamic(() => import("react-diff-viewer-continued"), { ssr: false })

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
}

type Hierarchy = {
  repository: string
  components: Component[]
}

type ModifyResult = {
  area_id: string
  source_file: string
  original_code: string
  modified_code: string
  diff: string
}

type SelectionTarget =
  | { type: "component"; data: Component }
  | { type: "area"; data: Area; parentComponent: Component }
  | null

type ProgressStep = {
  node: string
  label: string
  status: "pending" | "running" | "done"
  message?: string
}

const INITIAL_STEPS: ProgressStep[] = [
  { node: "repo_load",    label: "GitHub 레포지토리 클론",  status: "pending" },
  { node: "file_scan",    label: "파일 목록 수집",           status: "pending" },
  { node: "code_read",    label: "소스 코드 읽기",           status: "pending" },
  { node: "analyze_code", label: "AI 컴포넌트 구조 분석",    status: "pending" },
  { node: "encode_nl",    label: "AI 자연어 설명 생성",      status: "pending" },
]

// ─── 메인 컴포넌트 ─────────────────────────────────────────────────────────────

export default function WorkspacePage() {
  const [gitUrl, setGitUrl] = useState("")
  const [branch, setBranch] = useState("main")
  const [analyzeLoading, setAnalyzeLoading] = useState(false)
  const [analyzeError, setAnalyzeError] = useState<string | null>(null)

  const [hierarchy, setHierarchy] = useState<Hierarchy | null>(null)
  const [expandedComponents, setExpandedComponents] = useState<string[]>([])
  const [selection, setSelection] = useState<SelectionTarget>(null)

  const [modificationRequest, setModificationRequest] = useState("")
  const [modifyLoading, setModifyLoading] = useState(false)
  const [modifyError, setModifyError] = useState<string | null>(null)
  const [modifyResult, setModifyResult] = useState<ModifyResult | null>(null)

  const [rightTab, setRightTab] = useState<"CODE" | "DIFF">("CODE")
  const [checkedDescriptions, setCheckedDescriptions] = useState<Record<string, boolean>>({})
  const [progressSteps, setProgressSteps] = useState<ProgressStep[]>(INITIAL_STEPS)

  // 영역 선택 시 수정 결과 및 체크박스 초기화
  useEffect(() => {
    setModifyResult(null)
    setModifyError(null)
    setModificationRequest("")
    setRightTab("CODE")
    setCheckedDescriptions({})
  }, [selection])

  // ─── 핸들러 ──────────────────────────────────────────────────────────────────

  const handleAnalyze = async () => {
    const url = gitUrl.trim()
    if (!url) {
      setAnalyzeError("Git URL을 입력해주세요.")
      return
    }
    setAnalyzeLoading(true)
    setAnalyzeError(null)
    setHierarchy(null)
    setSelection(null)
    setModifyResult(null)
    setProgressSteps(INITIAL_STEPS)

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

    try {
      const response = await fetch(`${baseUrl}/api/analyze-repo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo_url: url, branch }),
      })

      if (!response.ok || !response.body) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.detail || "분석 요청에 실패했습니다.")
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split("\n\n")
        buffer = parts.pop() ?? ""

        for (const part of parts) {
          const line = part.trim()
          if (!line.startsWith("data: ")) continue

          try {
            const event = JSON.parse(line.slice(6))

            if (event.type === "progress") {
              setProgressSteps(prev =>
                prev.map(step =>
                  step.node === event.node
                    ? { ...step, status: event.status, message: event.message }
                    : step
                )
              )
            } else if (event.type === "result") {
              const data: Hierarchy = event.data
              setHierarchy(data)
              if (data.components?.length) {
                setExpandedComponents([data.components[0].id])
                setSelection({ type: "component", data: data.components[0] })
              }
            } else if (event.type === "error") {
              throw new Error(event.message)
            }
          } catch {
            // JSON parse 오류 무시
          }
        }
      }
    } catch (e: any) {
      setAnalyzeError(e?.message || "분석에 실패했습니다.")
    } finally {
      setAnalyzeLoading(false)
    }
  }

  const handleModify = async () => {
    if (selection?.type !== "area") return
    if (!modificationRequest.trim()) {
      setModifyError("수정 요청 내용을 입력해주세요.")
      return
    }
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
      })
      setModifyResult(res.data)
      setRightTab("DIFF")
    } catch (e: any) {
      const msg =
        e?.response?.data?.detail || e?.message || "수정에 실패했습니다."
      setModifyError(String(msg))
    } finally {
      setModifyLoading(false)
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

  // ─── 렌더링 ──────────────────────────────────────────────────────────────────

  return (
    <div className="h-screen bg-white flex overflow-hidden">

      {/* ── 좌측 패널 ─────────────────────────────────────────────────── */}
      <aside className="w-[300px] flex-shrink-0 flex flex-col border-r border-[#e4eaf2] bg-[#0f172a]">

        {/* 헤더 */}
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-white/10">
          <div className="w-8 h-8 rounded-lg bg-[#8b5cf6] flex items-center justify-center">
            <Layers className="w-4 h-4 text-white" />
          </div>
          <span className="text-[15px] font-semibold text-white">AI Agent Workbench</span>
        </div>

        {/* 좌측 상단: GitHub URL 입력 */}
        <div className="px-4 py-4 border-b border-white/10">
          <p className="text-[10px] text-white/50 uppercase tracking-widest mb-2">Repository</p>
          <input
            value={gitUrl}
            onChange={(e) => setGitUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
            placeholder="https://github.com/..."
            className="w-full h-9 px-3 rounded-lg bg-white/10 text-white text-[12px] placeholder:text-white/30 border border-white/10 focus:outline-none focus:ring-1 focus:ring-[#8b5cf6] mb-2"
          />
          <div className="flex gap-2 mb-2">
            <input
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              placeholder="branch (main)"
              className="flex-1 h-8 px-3 rounded-lg bg-white/10 text-white text-[11px] placeholder:text-white/30 border border-white/10 focus:outline-none focus:ring-1 focus:ring-[#8b5cf6]"
            />
            <button
              onClick={handleAnalyze}
              disabled={analyzeLoading}
              className="h-8 px-4 bg-[#8b5cf6] hover:bg-[#7c3aed] disabled:opacity-50 text-white text-[12px] font-medium rounded-lg transition-colors"
            >
              {analyzeLoading ? "분석 중..." : "분석"}
            </button>
          </div>
          {analyzeError && (
            <p className="text-[11px] text-red-400 mt-1">{analyzeError}</p>
          )}
        </div>

        {/* 분석 진행 상태 */}
        {analyzeLoading && (
          <div className="px-4 py-3 border-b border-white/10">
            <p className="text-[10px] text-white/40 uppercase tracking-widest mb-2.5">분석 진행 중</p>
            <ul className="space-y-2">
              {progressSteps.map((step) => (
                <li key={step.node} className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex-shrink-0">
                    {step.status === "done" ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    ) : step.status === "running" ? (
                      <Loader2 className="w-3.5 h-3.5 text-[#8b5cf6] animate-spin" />
                    ) : (
                      <Circle className="w-3.5 h-3.5 text-white/20" />
                    )}
                  </span>
                  <span className={`text-[11px] leading-relaxed transition-colors ${
                    step.status === "done"
                      ? "text-emerald-400"
                      : step.status === "running"
                      ? "text-white"
                      : "text-white/25"
                  }`}>
                    {step.status === "running" && step.message
                      ? step.message
                      : step.label}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 좌측 중단: 선택된 컴포넌트/영역 설명 (체크박스) */}
        <div className="flex-1 px-4 py-4 border-b border-white/10 overflow-y-auto">
          <p className="text-[10px] text-white/50 uppercase tracking-widest mb-3">
            {selection?.type === "area" ? "영역 분석 결과" : "컴포넌트 분석 결과"}
          </p>
          {selectedDescription && selectedDescription.length > 0 ? (
            <ul className="space-y-2">
              {selectedDescription.map((sentence, idx) => {
                const key = `${selection?.type === "area" ? selection.data.id : (selection as any)?.data?.id}-${idx}`
                const checked = checkedDescriptions[key] ?? false
                return (
                  <li key={key} className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      id={key}
                      checked={checked}
                      onChange={() =>
                        setCheckedDescriptions(prev => ({ ...prev, [key]: !checked }))
                      }
                      className="mt-0.5 w-3.5 h-3.5 flex-shrink-0 accent-[#8b5cf6] cursor-pointer"
                    />
                    <label
                      htmlFor={key}
                      className={`text-[12px] leading-relaxed cursor-pointer transition-colors ${
                        checked ? "line-through text-white/30" : "text-white/80"
                      }`}
                    >
                      {sentence}
                    </label>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="text-[12px] text-white/30">
              {hierarchy ? "항목을 선택하세요." : "레포지토리를 분석하면 결과가 표시됩니다."}
            </p>
          )}
        </div>

        {/* 좌측 하단: 자연어 수정 요청 */}
        <div className="px-4 py-4">
          <p className="text-[10px] text-white/50 uppercase tracking-widest mb-2">수정 요청</p>
          {selection?.type === "area" ? (
            <>
              <textarea
                value={modificationRequest}
                onChange={(e) => setModificationRequest(e.target.value)}
                placeholder="예) 검색 버튼을 오른쪽에 배치해줘"
                className="w-full h-24 px-3 py-2 rounded-lg bg-white/10 text-white text-[12px] placeholder:text-white/30 border border-white/10 focus:outline-none focus:ring-1 focus:ring-[#8b5cf6] resize-none mb-2"
              />
              <button
                onClick={handleModify}
                disabled={modifyLoading}
                className="w-full h-9 bg-[#8b5cf6] hover:bg-[#7c3aed] disabled:opacity-50 text-white text-[12px] font-medium rounded-lg transition-colors"
              >
                {modifyLoading ? "수정 중..." : "코드 수정"}
              </button>
              {modifyError && (
                <p className="text-[11px] text-red-400 mt-1">{modifyError}</p>
              )}
            </>
          ) : (
            <p className="text-[12px] text-white/30">
              영역(Area)을 선택하면 코드 수정이 가능합니다.
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
            hierarchy.components.map((comp) => {
              const isExpanded = expandedComponents.includes(comp.id)
              const isCompSelected =
                selection?.type === "component" && selection.data.id === comp.id

              return (
                <div key={comp.id}>
                  {/* Component 행 */}
                  <div
                    onClick={() => {
                      toggleComponent(comp.id)
                      setSelection({ type: "component", data: comp })
                    }}
                    className={`flex items-center gap-2 px-4 py-2.5 cursor-pointer transition-colors ${
                      isCompSelected
                        ? "bg-[#8b5cf6]/10 border-l-2 border-[#8b5cf6]"
                        : "hover:bg-[#f8fafc] border-l-2 border-transparent"
                    }`}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleComponent(comp.id)
                      }}
                      className="w-4 h-4 flex items-center justify-center text-[#64748b]"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <div className="w-2 h-2 rounded-sm bg-[#8b5cf6]" />
                    <span className={`text-[13px] font-medium ${isCompSelected ? "text-[#8b5cf6]" : "text-[#0f172a]"}`}>
                      {comp.name}
                    </span>
                  </div>

                  {/* Area 행들 */}
                  {isExpanded &&
                    comp.areas.map((area) => {
                      const isAreaSelected =
                        selection?.type === "area" && selection.data.id === area.id
                      return (
                        <div
                          key={area.id}
                          onClick={() =>
                            setSelection({ type: "area", data: area, parentComponent: comp })
                          }
                          className={`flex items-center gap-2 pl-10 pr-4 py-2 cursor-pointer transition-colors ${
                            isAreaSelected
                              ? "bg-[#8b5cf6] text-white"
                              : "hover:bg-[#f1f5f9] text-[#475569]"
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isAreaSelected ? "bg-white" : "bg-[#8b5cf6]"}`} />
                          <span className="text-[12px] truncate">{area.name}</span>
                        </div>
                      )
                    })}
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* ── 우측 패널: 코드 뷰 ────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[#f8fafc]">

        {/* 탭 헤더 */}
        <div className="flex items-center gap-1 px-5 py-3 border-b border-[#e4eaf2] bg-white">
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
                    <p className="text-[13px] text-[#475569] leading-relaxed">{selection.data.description}</p>
                  </div>
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
        </div>
      </div>
    </div>
  )
}
