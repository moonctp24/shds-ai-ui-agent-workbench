"use client"

import { useEffect, useMemo, useState } from "react"
import { Check, Maximize2, Layers, Sparkles, LayoutGrid, ChevronDown, ChevronRight, Trash2, GitBranch, Code2 } from "lucide-react"
import dynamic from "next/dynamic"
import { NodeDetail, TreeNode } from "@/lib/learned-project"
import axios from "axios"
import { learnedProject, NodeDetail, TreeNode } from "@/lib/learned-project"
import { api } from "@/lib/api"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

const MermaidDiagram = dynamic(() => import("@/components/mermaid-diagram"), { ssr: false })

type TreeItem = TreeNode & {
  path?: string
  is_dir?: boolean
}

type ScenarioNode = {
  id: string
  title: string
  description?: string
  path?: string
  children?: ScenarioNode[]
}

type ScenarioV1 = {
  project_name: string
  version: string
  nodes: ScenarioNode[]
}

export default function WorkspaceActivePage() {
  const [activeTab, setActiveTab] = useState("PREVIEW")
  const [activeRenderMode, setActiveRenderMode] = useState<"batch" | "individual">("batch")
  const [expandedItems, setExpandedItems] = useState<string[]>([])
  const [selectedItem, setSelectedItem] = useState<string | null>(null)
  const [projectName, setProjectName] = useState("분석 대기")
  const [projectVersion, setProjectVersion] = useState("-")
  const [treeData, setTreeData] = useState<TreeItem[]>([])
  const [nodeDetails, setNodeDetails] = useState<Record<string, NodeDetail>>({})
  const [originalScenario, setOriginalScenario] = useState("")
  const [modifiedScenario, setModifiedScenario] = useState("")
  const [modifiedNodes, setModifiedNodes] = useState<string[]>([])
  const [checkedRequirements, setCheckedRequirements] = useState<Record<string, string[]>>({})
  const [gitUrl, setGitUrl] = useState("")
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [analysisMarkdown, setAnalysisMarkdown] = useState<string>("")
  const [scenarioV1, setScenarioV1] = useState<ScenarioV1 | null>(null)

  const tabs = ["PREVIEW", "FLOW", "DIAGRAM", "CODE"]

  const selectedDetail = useMemo(() => {
    if (selectedItem && nodeDetails[selectedItem]) return nodeDetails[selectedItem]
    return nodeDetails.root
  }, [nodeDetails, selectedItem])

  const isModified = selectedItem ? modifiedNodes.includes(selectedItem) : false
  const selectedLabel = useMemo(() => {
    if (!selectedItem) return undefined
    const findLabel = (nodes: TreeItem[]): string | undefined => {
      for (const node of nodes) {
        if (node.id === selectedItem) return node.label
        if (node.children?.length) {
          const found = findLabel(node.children)
          if (found) return found
        }
      }
      return undefined
    }
    return findLabel(treeData)
  }, [selectedItem, treeData])
  const highlightIds = useMemo(() => {
    if (!selectedItem || treeData.length === 0) return []
    const collect = (node: TreeItem): string[] => {
      const ids = [node.id]
      if (node.children?.length) {
        node.children.forEach(child => {
          ids.push(...collect(child))
        })
      }
      return ids
    }
    const findNode = (nodes: TreeItem[]): TreeItem | undefined => {
      for (const node of nodes) {
        if (node.id === selectedItem) return node
        if (node.children?.length) {
          const found = findNode(node.children)
          if (found) return found
        }
      }
      return undefined
    }
    const target = findNode(treeData)
    return target ? collect(target) : [selectedItem]
  }, [selectedItem, treeData])

  const isHighlighted = (id: string) => highlightIds.includes(id)

  const requirementItems = useMemo(() => {
    const source = modifiedScenario?.trim()
    if (!source) return []
    if (source.includes("\n")) {
      return source
        .split("\n")
        .map(line => line.trim())
        .filter(Boolean)
    }
    const dotSplit = source.split(/(?<=\.)\s+/).map(text => text.trim()).filter(Boolean)
    if (dotSplit.length > 1) return dotSplit
    return source
      .split(/다\.\s*/)
      .map(text => text.trim())
      .filter(Boolean)
      .map(text => `${text}다.`)
  }, [modifiedScenario])

  const scenarioNodeMap = useMemo(() => {
    const map = new Map<string, ScenarioNode>()
    if (!scenarioV1) return map
    const walk = (nodes: ScenarioNode[]) => {
      nodes.forEach(node => {
        map.set(node.id, node)
        if (node.children?.length) walk(node.children)
      })
    }
    walk(scenarioV1.nodes)
    return map
  }, [scenarioV1])

  const getScenarioDoc = (itemId: string | null) => {
    if (!itemId) return ""
    const detail = nodeDetails[itemId] ?? nodeDetails.root
    const fallback = detail?.doc ?? ""
    if (!scenarioV1) return fallback
    return scenarioNodeMap.get(itemId)?.description ?? fallback
  }

  useEffect(() => {
    if (!selectedItem) return
    const scenarioDoc = getScenarioDoc(selectedItem)
    if (!scenarioDoc) return
    setOriginalScenario(scenarioDoc)
    if (!modifiedNodes.includes(selectedItem)) {
      setModifiedScenario(scenarioDoc)
    }
  }, [nodeDetails, selectedItem, selectedLabel, modifiedNodes, scenarioV1])

  const collectExpandedIds = (items: TreeItem[]) => {
    const ids: string[] = []
    const walk = (nodes: TreeItem[]) => {
      nodes.forEach(node => {
        ids.push(node.id)
        if (node.children?.length) walk(node.children)
      })
    }
    walk(items)
    return ids
  }

  const buildDetailsFromTree = (items: TreeItem[], docs?: Record<string, string>) => {
    const details: Record<string, NodeDetail> = {}
    const walk = (nodes: TreeItem[]) => {
      nodes.forEach(node => {
        const isFolder = node.label.endsWith("/")
        const doc = docs?.[node.id]
        details[node.id] = {
          title: node.label,
          doc: doc ?? (isFolder ? "폴더 항목입니다. 하위 파일/폴더를 포함합니다." : "파일 항목입니다."),
          previewSummary: [node.label],
          flowSteps: [{ title: node.label, desc: "프로젝트 트리 항목" }],
          diagram: `flowchart TB\n  A["${node.label.replace(/"/g, "'")}"]`,
          codeFiles: [],
          status: "complete",
        }
        if (node.children?.length) walk(node.children)
      })
    }
    walk(items)
    return details
  }

  const buildTreeFromScenario = (scenario: ScenarioV1) => {
    const walk = (nodes: ScenarioNode[], level: number): TreeItem[] =>
      nodes.map(node => ({
        id: node.id,
        label: node.title,
        level,
        children: node.children ? walk(node.children, level + 1) : undefined,
      }))
    return walk(scenario.nodes, 0)
  }

  const buildDetailsFromScenario = (
    scenario: ScenarioV1,
    docs?: Record<string, string>
  ) => {
    const details: Record<string, NodeDetail> = {}
    const walk = (nodes: ScenarioNode[]) => {
      nodes.forEach(node => {
        const doc = node.description || (node.path ? docs?.[node.path] : undefined)
        details[node.id] = {
          title: node.title,
          doc: doc ?? "시나리오 설명이 없습니다.",
          previewSummary: [node.title],
          flowSteps: [{ title: node.title, desc: doc ?? "프로젝트 시나리오 노드" }],
          diagram: `flowchart TB\n  A["${node.title.replace(/"/g, "'")}"]`,
          codeFiles: [],
          status: "complete",
        }
        if (node.children?.length) walk(node.children)
      })
    }
    walk(scenario.nodes)
    return details
  }

  const handleAnalyzeGit = async () => {
    const url = gitUrl.trim()
    if (!url) {
      setAnalysisError("Git URL을 입력해주세요.")
      return
    }

    setAnalysisLoading(true)
    setAnalysisError(null)
    try {
      const res = await api.post("/api/analyze", { git_url: url })
      const md = typeof res.data?.markdown === "string" ? res.data.markdown : ""
      const tree = Array.isArray(res.data?.tree) ? (res.data.tree as TreeItem[]) : []
      const nodeDocs = res.data?.node_docs as Record<string, string> | undefined
      const scenarioV1 = res.data?.scenario_v1 as ScenarioV1 | undefined
      setAnalysisMarkdown(md || "분석 결과가 비어있습니다.")
      setScenarioV1(scenarioV1 ?? null)
      if (scenarioV1) {
        const scenarioTree = buildTreeFromScenario(scenarioV1)
        setTreeData(scenarioTree)
        const details = buildDetailsFromScenario(scenarioV1, nodeDocs)
        if (scenarioV1) {
          details["scenario_v1"] = {
            title: "v1.0 기획서",
            doc: JSON.stringify(scenarioV1, null, 2),
            previewSummary: ["v1.0 기획서 자동 생성 결과"],
            flowSteps: [{ title: "기획서 생성", desc: "코드 스캔 기반 v1.0 초안" }],
            diagram: 'flowchart TB\n  A["scenario_v1"]',
            codeFiles: [],
            status: "complete",
          }
        }
        setNodeDetails(details)
        setProjectName(url.split("/").pop()?.replace(".git", "") ?? "Git Project")
        setProjectVersion("git")
        setSelectedItem(scenarioTree[0]?.id ?? null)
        setExpandedItems(collectExpandedIds(scenarioTree))
      } else if (tree.length > 0) {
        setTreeData(tree)
        setNodeDetails(buildDetailsFromTree(tree, nodeDocs))
        setProjectName(url.split("/").pop()?.replace(".git", "") ?? "Git Project")
        setProjectVersion("git")
        setSelectedItem(tree[0].id)
        setExpandedItems(collectExpandedIds(tree))
      }
      setActiveTab("CODE")
    } catch (e: any) {
      const isNetworkError = Boolean(e?.request) && !e?.response
      if (isNetworkError) {
        console.error("API network error:", {
          message: e?.message,
          code: e?.code,
          config: e?.config,
        })
        alert("서버 연결 확인")
      }
      const message =
        e?.response?.data?.detail ||
        e?.message ||
        "분석에 실패했습니다. 백엔드 실행 및 CORS 설정을 확인해주세요."
      setAnalysisError(String(message))
      setAnalysisMarkdown("")
      setActiveTab("CODE")
    } finally {
      setAnalysisLoading(false)
    }
  }

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    )
  }

  const renderTreeItem = (item: TreeItem, depth: number = 0) => {
    const hasChildren = item.children && item.children.length > 0
    const isExpanded = expandedItems.includes(item.id)
    const isSelected = selectedItem === item.id
    const isNodeModified = modifiedNodes.includes(item.id)
    const nodeStatus = nodeDetails[item.id]?.status ?? "pending"
    const paddingLeft = depth * 20 + 8

    return (
      <div key={item.id}>
        <div
          className={`flex items-center justify-between py-2 px-3 rounded-lg cursor-pointer transition-colors ${
            isSelected ? "bg-[#8b5cf6] text-white" : "hover:bg-[#121726] hover:text-white"
          }`}
          style={{ paddingLeft: `${paddingLeft}px` }}
          onClick={() => setSelectedItem(item.id)}
        >
          <div className={`flex items-center gap-2`}>
            {hasChildren ? (
              <button
                type="button"
                className="w-5 h-5 flex items-center justify-center rounded hover:bg-black/10"
                onClick={(event) => {
                  event.stopPropagation()
                  toggleExpand(item.id)
                }}
                aria-label={isExpanded ? "트리 접기" : "트리 펼치기"}
              >
                {isExpanded ? (
                  <ChevronDown className={`w-4 h-4 ${isSelected ? "text-white" : "text-[#64748b]"}`} />
                ) : (
                  <ChevronRight className={`w-4 h-4 ${isSelected ? "text-white" : "text-[#64748b]"}`} />
                )}
              </button>
            ) : (
              <span className={`w-1.5 h-1.5 rounded-full ml-0.5 ${isSelected ? "bg-white" : "bg-[#8b5cf6]"} hover:text-white`} />
            )}
            <span
              className={`w-2 h-2 rounded-full ${
                nodeStatus === "complete" ? "bg-[#10b981]" : "bg-[#cbd5f5]"
              }`}
            />
            <span className={`text-[13px] ${isSelected ? "text-white font-medium" : "text-[#475569]"} group-hover:text-white 
              ${isNodeModified ? "text-[#fb923c]" : ""}
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
        <aside className="flex-1 flex flex-col bg-white overflow-hidden">
          {/* Workspace Header */}
          <div className="flex items-center gap-2.5 px-5 py-4">
            <div className="w-8 h-8 rounded-lg bg-linear-to-br from-[#8b5cf6] to-[#7c3aed] flex items-center justify-center shadow-sm">
              <Layers className="w-4 h-4 text-white" />
            </div>
            <span className="text-[15px] font-semibold text-[#0f172a]">Workspace</span>
          </div>

          <div className="flex-1 flex flex-col p-5 overflow-hidden">
            {/* Git Analysis */}
            <div className="mb-3">
              <div className="flex gap-2">
                <input
                  value={gitUrl}
                  onChange={(e) => setGitUrl(e.target.value)}
                  placeholder="Git URL 입력 (https://...)"
                  className="flex-1 h-11 px-3 rounded-lg border border-[#e4eaf2] text-[13px] text-[#0f172a] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#8b5cf6]/40"
                />
                <button
                  className="h-11 px-4 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  onClick={handleAnalyzeGit}
                  disabled={analysisLoading}
                >
                  <span className="text-[14px] font-medium">{analysisLoading ? "분석 중..." : "분석"}</span>
                </button>
              </div>
              {analysisError && (
                <p className="mt-2 text-[12px] text-[#ef4444]">{analysisError}</p>
              )}
            </div>

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
              <span className="px-2 py-0.5 bg-[#f1f5f9] text-[#64748b] text-[10px] font-medium rounded">
                {modifiedScenario && modifiedScenario !== originalScenario ? "Edited" : "Auto Saved"}
              </span>
            </div>

            {/* Original Scenario */}
            <div className="flex-1 flex flex-col">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#475569]" />
                <span className="text-[12px] text-[#475569]">변경 전 원본 시나리오</span>
              </div>
              <div className="flex-1 border border-[#e4eaf2] rounded-xl p-4 bg-[#f8fafc]">
                <textarea
                  className="text-[12px] text-[#94a3b8] leading-relaxed w-full h-full resize-none"
                  value={originalScenario}
                  placeholder="예) 기업용 대시보드 메인화면을 만들어줘. 좌측엔 메뉴바, 우측엔 통계 그래프 3개..."
                  readOnly
                />
              </div>
            </div>

            {/* Modified Scenario */}
            <div className="flex-1 flex flex-col mt-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6]" />
                <span className="text-[12px] text-[#8b5cf6]">변경 후 시나리오 (렌더링 대상)</span>
              </div>
              <div className="flex-1 border border-[#e4eaf2] rounded-xl p-4 bg-white overflow-y-auto">
                {requirementItems.length === 0 ? (
                  <p className="text-[12px] text-[#94a3b8]">요구사항이 없습니다.</p>
                ) : (
                  <div className="space-y-2">
                    {(selectedItem ? requirementItems : requirementItems).map((item, index) => {
                      const requirementKey = selectedItem ?? "root"
                      const checkedList = checkedRequirements[requirementKey] ?? []
                      const isChecked = checkedList.includes(item)
                      return (
                        <label key={`${item}-${index}`} className="flex items-start gap-2 text-[12px] text-[#0f172a]">
                          <input
                            type="checkbox"
                            className="mt-0.5 h-3.5 w-3.5 accent-[#8b5cf6]"
                            checked={isChecked}
                            onChange={(event) => {
                              const nextChecked = event.target.checked
                              setCheckedRequirements(prev => {
                                const nextList = nextChecked
                                  ? [...checkedList, item]
                                  : checkedList.filter(value => value !== item)
                                return { ...prev, [requirementKey]: nextList }
                              })
                            }}
                          />
                          <span>{item}</span>
                        </label>
                      )
                    })}
                  </div>
                )}
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
          <div className="flex-1 px-6 pb-6 flex flex-col min-h-0">
            {/* Active Plan Banner */}
            <div className="bg-[#0f172a] rounded-xl px-5 py-4 mb-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-white/70 uppercase tracking-wider">ACTIVE PLAN</span>
                <h2 className="text-[16px] font-semibold text-white mt-0.5">{projectName}</h2>
              </div>
              <div className="text-right">
                <span className="px-2 py-0.5 bg-white/20 text-white text-[10px] font-medium rounded">{projectVersion}</span>
                <p className="text-[10px] text-white/70 mt-1">Scenario Build</p>
              </div>
            </div>

            {/* Tree Structure */}
            <div className="flex-1 overflow-y-auto min-h-0">
              {treeData.length > 0 ? (
                treeData.map(item => renderTreeItem(item))
              ) : (
                <div className="border border-dashed border-[#c8d2e1] rounded-xl flex items-center justify-center h-full">
                  <span className="text-[12px] text-[#94a3b8]">시나리오 트리 분석을 실행하세요</span>
                </div>
              )}
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
              <div className={`w-[453px] h-[877px] bg-[#1a1a1a] rounded-[40px] p-3 shadow-xl ${isHighlighted("preview-device") ? "ring-2 ring-[#fb923c]" : ""}`}>
                <div className={`w-full h-full bg-[#f5f5f5] rounded-[32px] relative overflow-hidden ${isHighlighted("preview-screen") ? "ring-2 ring-[#fb923c]" : ""}`}>
                  {/* Notch */}
                  <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-[120px] h-[28px] bg-[#1a1a1a] rounded-b-2xl ${isHighlighted("preview-notch") ? "ring-2 ring-[#fb923c]" : ""}`} />
                  
                  {/* Screen Content */}
                  <div className={`w-full h-full overflow-y-auto px-5 pt-10 pb-6 ${isHighlighted("preview-content") ? "ring-2 ring-[#fb923c]" : ""}`}>
                  {treeData.length === 0 ? (
                    <div className="h-full flex items-center justify-center">
                      <div className="text-center">
                        <p className="text-[13px] text-[#94a3b8]">프리뷰 준비 완료</p>
                        <p className="text-[11px] text-[#cbd5f5] mt-2">시나리오 트리 분석을 실행하세요</p>
                      </div>
                    </div>
                  ) : (
                    <>
                  <div
                    className={`mb-4 rounded-xl bg-white p-4 shadow-sm ${isHighlighted("preview-spec") ? "ring-2 ring-[#fb923c]" : ""}`}
                  >
                    <h3 className="text-[14px] font-semibold text-[#0f172a] mb-2">
                      {selectedDetail?.title ?? selectedLabel ?? "Preview"}
                    </h3>
                    <p className="text-[12px] text-[#64748b] leading-relaxed">
                      {selectedDetail?.doc ?? "선택한 요소의 상세 정보가 아직 없습니다."}
                    </p>
                  </div>
                  <div
                    className={`mt-4 rounded-xl p-4 shadow-sm border ${
                      isHighlighted("dashboard-card") ? "border-[#fb923c] bg-[#fff7ed]" : "border-[#e4eaf2] bg-white"
                    }`}
                  >
                    <div className={`flex items-start justify-between gap-3 ${isHighlighted("dashboard-header") ? "ring-2 ring-[#fb923c]/60" : ""}`}>
                      <div className={isHighlighted("dashboard-title") ? "ring-2 ring-[#fb923c]/60 rounded" : ""}>
                        <h4 className="text-[13px] font-semibold text-[#0f172a]">내 카드 관리 대시보드</h4>
                        <p className="text-[11px] text-[#94a3b8] mt-1">보유 카드 현황과 결제 예정 금액 요약</p>
                      </div>
                      <span className={`text-[10px] text-white bg-[#4f46e5] px-2 py-1 rounded-full ${isHighlighted("dashboard-badge") ? "ring-2 ring-[#fb923c]/60" : ""}`}>
                        v1.0
                      </span>
                    </div>
                    <div className={`mt-3 grid grid-cols-2 gap-2 ${isHighlighted("dashboard-metrics") ? "ring-2 ring-[#fb923c]/60 rounded-lg" : ""}`}>
                      <div className={`rounded-lg bg-[#f1f5f9] p-2 ${isHighlighted("metric-total-limit") ? "ring-2 ring-[#fb923c]" : ""}`}>
                        <p className="text-[10px] text-[#64748b]">총 이용 한도</p>
                        <p className="text-[12px] font-semibold text-[#0f172a]">₩9,000,000</p>
                      </div>
                      <div className={`rounded-lg bg-[#f1f5f9] p-2 ${isHighlighted("metric-total-billing") ? "ring-2 ring-[#fb923c]" : ""}`}>
                        <p className="text-[10px] text-[#64748b]">총 결제 예정 금액</p>
                        <p className="text-[12px] font-semibold text-[#0f172a]">₩4,350,000</p>
                      </div>
                      <div className={`rounded-lg bg-[#f8fafc] p-2 ${isHighlighted("metric-active-cards") ? "ring-2 ring-[#fb923c]" : ""}`}>
                        <p className="text-[10px] text-[#64748b]">정상 이용 카드</p>
                        <p className="text-[12px] font-semibold text-[#0f172a]">2장</p>
                      </div>
                      <div className={`rounded-lg bg-[#f8fafc] p-2 ${isHighlighted("metric-paused-cards") ? "ring-2 ring-[#fb923c]" : ""}`}>
                        <p className="text-[10px] text-[#64748b]">일시정지 카드</p>
                        <p className="text-[12px] font-semibold text-[#0f172a]">1장</p>
                      </div>
                    </div>
                  </div>
                  <div
                    className={`mt-3 rounded-xl p-4 shadow-sm border ${
                      isHighlighted("card-list-card") ? "border-[#fb923c] bg-[#fff7ed]" : "border-[#e4eaf2] bg-white"
                    }`}
                  >
                    <div className={`flex items-baseline justify-between ${isHighlighted("card-list-header") ? "ring-2 ring-[#fb923c]/60" : ""}`}>
                      <h4 className={`text-[13px] font-semibold text-[#0f172a] ${isHighlighted("card-list-title") ? "ring-2 ring-[#fb923c]/60 rounded" : ""}`}>
                        보유 카드 리스트
                      </h4>
                      <span className={`text-[11px] text-[#64748b] ${isHighlighted("card-list-count") ? "ring-2 ring-[#fb923c]/60 rounded" : ""}`}>
                        총 3장
                      </span>
                    </div>
                    <div className={`mt-3 space-y-2 ${isHighlighted("card-items") ? "ring-2 ring-[#fb923c]/60 rounded-lg" : ""}`}>
                      {[
                        { id: "card-1", name: "신한 Deep Dream 카드", last4: "1234", limit: "₩3,000,000", billing: "₩1,250,000", status: "정상" },
                        { id: "card-2", name: "신한 The Best-F 카드", last4: "5678", limit: "₩5,000,000", billing: "₩2,750,000", status: "정상" },
                        { id: "card-3", name: "신한 체크카드 S-Line", last4: "9012", limit: "₩1,000,000", billing: "₩350,000", status: "일시정지" }
                      ].map((card) => {
                        return (
                          <div
                            key={card.id}
                            className={`rounded-lg border p-2 transition-colors ${
                              isHighlighted(card.id) ? "border-[#fb923c] bg-[#fff7ed]" : "border-[#e4eaf2] bg-white"
                            }`}
                          >
                            <div className={`flex items-center justify-between ${isHighlighted(`${card.id}-header`) ? "ring-2 ring-[#fb923c]/60" : ""}`}>
                              <div className={isHighlighted(`${card.id}-info`) ? "ring-2 ring-[#fb923c]/60 rounded" : ""}>
                                <p className="text-[12px] font-semibold text-[#0f172a]">{card.name}</p>
                                <p className="text-[10px] text-[#94a3b8]">{`•••• ${card.last4}`}</p>
                              </div>
                              <span className={`text-[10px] font-medium ${card.status === "정상" ? "text-[#10b981]" : "text-[#f59e0b]"} ${isHighlighted(`${card.id}-status`) ? "ring-2 ring-[#fb923c]/60 rounded" : ""}`}>
                                {card.status}
                              </span>
                            </div>
                            <div className={`mt-2 grid grid-cols-2 gap-2 text-[10px] text-[#64748b] ${isHighlighted(`${card.id}-metrics`) ? "ring-2 ring-[#fb923c]/60 rounded-lg" : ""}`}>
                              <div className={isHighlighted(`${card.id}-limit`) ? "ring-2 ring-[#fb923c]/60 rounded" : ""}>
                                <p>이용 한도</p>
                                <p className="text-[11px] font-semibold text-[#0f172a]">{card.limit}</p>
                              </div>
                              <div className={isHighlighted(`${card.id}-billing`) ? "ring-2 ring-[#fb923c]/60 rounded" : ""}>
                                <p>결제 예정</p>
                                <p className="text-[11px] font-semibold text-[#0f172a]">{card.billing}</p>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  <div
                    className={`mt-3 rounded-xl p-4 shadow-sm border flex items-center justify-between ${
                      isHighlighted("card-count-card") ? "border-[#fb923c] bg-[#fff7ed]" : "border-[#e4eaf2] bg-white"
                    }`}
                  >
                    <div className={isHighlighted("card-count-info") ? "ring-2 ring-[#fb923c]/60 rounded" : ""}>
                      <p className="text-[12px] font-semibold text-[#0f172a]">카드 개수 표시</p>
                      <p className="text-[11px] text-[#64748b]">보유 카드 합계</p>
                    </div>
                    <span className={`text-[14px] font-semibold text-[#4f46e5] ${isHighlighted("card-count-value") ? "ring-2 ring-[#fb923c]/60 rounded" : ""}`}>
                      3장
                    </span>
                  </div>
                    </>
                  )}
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
                  {(treeData.length === 0 ? [
                    { title: "분석 대기", desc: "시나리오 트리 분석을 실행하세요." }
                  ] : (selectedDetail?.flowSteps ?? [
                    { title: "분석 대기", desc: "시나리오 트리 분석을 실행하세요." }
                  ])).map((step, i) => (
                    <div key={`${step.title}-${i}`} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full bg-[#8b5cf6] text-white flex items-center justify-center text-[13px] font-semibold 
                            ${isModified ? "bg-[#fb923c]" : ""}
                          `}>
                          {i + 1}
                        </div>
                        {i < (selectedDetail?.flowSteps?.length ?? 1) - 1 && (
                          <div className="w-0.5 flex-1 bg-[#e4eaf2] mt-2" />
                        )}
                      </div>
                      <div className="flex-1 pb-6">
                        <h3 className={`text-[15px] font-semibold text-[#0f172a] mb-2 ${isModified ? "text-[#fb923c]" : ""}`}>{step.title}</h3>
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
                  {treeData.length === 0 ? (
                    <span className="text-[12px] text-[#94a3b8]">시나리오 트리 분석을 실행하세요.</span>
                  ) : selectedDetail?.diagram ? (
                    <MermaidDiagram
                      chart={selectedDetail.diagram}
                      className="w-full flex justify-center"
                    />
                  ) : (
                    <span className="text-[12px] text-[#94a3b8]">다이어그램이 없습니다.</span>
                  )}
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

                {analysisMarkdown ? (
                  <div className="space-y-4">
                    {scenarioV1 && (
                      <div className="bg-white border border-[#e4eaf2] rounded-xl p-5">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[12px] font-semibold text-[#0f172a]">v1.0 시나리오 (JSON)</span>
                        </div>
                        <pre className="text-[12px] whitespace-pre-wrap text-[#0f172a]">
                          {JSON.stringify(scenarioV1, null, 2)}
                        </pre>
                      </div>
                    )}
                    <div className="bg-white border border-[#e4eaf2] rounded-xl p-5">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {analysisMarkdown}
                      </ReactMarkdown>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {(treeData.length === 0 ? [{
                      name: "분석 대기",
                      content: "// 시나리오 트리 분석을 실행하면 코드가 표시됩니다."
                    }] : (selectedDetail?.codeFiles?.length ? selectedDetail.codeFiles : [{
                      name: "분석 대기",
                      content: "// 시나리오 트리 분석을 실행하면 코드가 표시됩니다."
                    }])).map((file) => (
                      <div key={file.name} className="bg-[#1e1e2e] rounded-xl overflow-hidden">
                        {/* File Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-[#2d2d3d]">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-[#a3e635]" />
                            <span className="text-[12px] text-white font-medium">{file.name}</span>
                          </div>
                          <span className="text-[11px] text-[#fbbf24]">{isModified ? "Modified" : "Read"}</span>
                        </div>
                        {/* Code Content */}
                        <div className="p-4 font-mono text-[12px] leading-relaxed whitespace-pre-wrap text-white/90">
                          {file.content}
                        </div>
                      </div>
                    ))}
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
