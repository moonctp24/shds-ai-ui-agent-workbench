"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  Check,
  Maximize2,
  Layers,
  Sparkles,
  LayoutGrid,
  ChevronDown,
  ChevronRight,
  Trash2,
  GitBranch,
  Code2,
} from "lucide-react"
import dynamic from "next/dynamic"
import { NodeDetail, TreeNode } from "@/lib/learned-project"
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

type FlowStep = {
  step: number
  node_id: string
  title: string
  label: string
  description: string
  section: string
  status: string
  highlight?: {
    color: string
    reason: string
  } | null
}

type FlowData = {
  project_name: string
  version: string
  view_type: "FLOW"
  title: string
  summary: {
    total_steps: number
    selected_node_id?: string | null
    modified_node_ids?: string[]
  }
  steps: FlowStep[]
}

type DiagramNodeMeta = {
  node_id: string
  title: string
  section: string
  status: string
  highlight?: {
    color: string
    reason: string
  } | null
}

type DiagramData = {
  project_name: string
  version: string
  view_type: "DIAGRAM"
  title: string
  mermaid: string
  nodes: DiagramNodeMeta[]
  summary: {
    total_nodes: number
    selected_nodes: string[]
    modified_nodes: string[]
    direction: string
  }
}

type CodeGuideItem = {
  item_no: number
  node_id: string
  title: string
  file_name: string
  file_type: string
  badge: string
  status: string
  highlight?: {
    color: string
    reason: string
  } | null
  reason: string
  guides: string[]
}

type CodeGuideData = {
  project_name: string
  version: string
  view_type: "CODE"
  title: string
  summary: {
    total_items: number
    selected_node_id?: string | null
    modified_node_ids?: string[]
  }
  items: CodeGuideItem[]
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
  const [fileTreeMarkdown, setFileTreeMarkdown] = useState<string>("")
  const [scenarioJsonOpen, setScenarioJsonOpen] = useState(false)
  const [fileTreeOpen, setFileTreeOpen] = useState(false)
  const [scenarioV1, setScenarioV1] = useState<ScenarioV1 | null>(null)
  const [flowData, setFlowData] = useState<FlowData | null>(null)
  const [diagramData, setDiagramData] = useState<DiagramData | null>(null)
  const [codeGuideData, setCodeGuideData] = useState<CodeGuideData | null>(null)
  const [previewData, setPreviewData] = useState<any | null>(null)
  const previewFrameRef = useRef<HTMLIFrameElement | null>(null)

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
        node.children.forEach((child: TreeItem) => {
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

  useEffect(() => {
    if (!previewFrameRef.current || !selectedItem) return
    previewFrameRef.current.contentWindow?.postMessage({ selectedNodeId: selectedItem }, "*")
  }, [selectedItem, previewData?.html])

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

  const buildDetailsFromScenario = (scenario: ScenarioV1) => {
    const details: Record<string, NodeDetail> = {}
  
    const walk = (nodes: ScenarioNode[]) => {
      nodes.forEach((node) => {
        details[node.id] = {
          title: node.title,
          doc: node.description ?? "시나리오 설명이 없습니다.",
          previewSummary: [node.title],
          flowSteps: [],
          diagram: "",
          codeFiles: [],
          status: "complete",
        }
  
        if (node.children?.length) walk(node.children)
      })
    }
  
    walk(scenario.nodes)
    return details
  }

  const buildFileTreeMarkdown = (
    files: Array<{ path: string }> | undefined,
    repoUrl?: string,
  ) => {
    if (!files?.length) return ""

    type FileNode = {
      name: string
      children: Map<string, FileNode>
      isFile?: boolean
    }

    const root: FileNode = { name: "", children: new Map() }

    for (const file of files) {
      const parts = file.path.split("/").filter(Boolean)
      let current = root
      parts.forEach((part, idx) => {
        const existing = current.children.get(part)
        const node = existing ?? { name: part, children: new Map<string, FileNode>() }
        if (idx === parts.length - 1) node.isFile = true
        current.children.set(part, node)
        current = node
      })
    }

    const lines: string[] = []
    const walk = (node: FileNode, prefix: string) => {
      const entries = Array.from(node.children.values()).sort((a, b) => {
        const aDir = a.children.size > 0 && !a.isFile
        const bDir = b.children.size > 0 && !b.isFile
        if (aDir !== bDir) return aDir ? -1 : 1
        return a.name.localeCompare(b.name)
      })

      entries.forEach((child, index) => {
        const isDir = child.children.size > 0 && !child.isFile
        const connector = index === entries.length - 1 ? "\\-- " : "|-- "
        lines.push(`${prefix}${connector}${child.name}${isDir ? "/" : ""}`)
        if (child.children.size > 0) {
          const extension = index === entries.length - 1 ? "    " : "|   "
          walk(child, prefix + extension)
        }
      })
    }

    walk(root, "")
    const tree = lines.join("\n")
    return [
      "## Repository 분석 결과",
      "",
      repoUrl ? `- **URL**: \`${repoUrl}\`` : "",
      "",
      "### File Tree",
      "",
      "```text",
      tree,
      "```",
    ]
      .filter(Boolean)
      .join("\n")
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
    const res = await api.post("/api/analyze-repo", {
      repo_url: url,
      branch: "main",
    })

    const raw = res.data ?? {}
    const payload = raw?.result ?? raw ?? {}

    const nextScenario = (raw.scenario_v1 ?? payload.scenario_v1 ?? null) as ScenarioV1 | null
    const nextFlow = (raw.flow ?? payload.flow ?? null) as FlowData | null
    const nextDiagram = (raw.diagram ?? payload.diagram ?? null) as DiagramData | null
    const nextCodeGuide = (raw.code_guide ?? payload.code_guide ?? null) as CodeGuideData | null
    const nextMarkdown = (payload.markdown ?? payload.result?.markdown ?? "") as string
    const nextFileTreeMarkdown = buildFileTreeMarkdown(raw.files ?? payload.files, url)
    const nextPreview = (payload.preview ?? null)
    setScenarioV1(nextScenario)
    setFlowData(nextFlow)
    setDiagramData(nextDiagram)
    setCodeGuideData(nextCodeGuide)
    setAnalysisMarkdown(nextMarkdown)
    setFileTreeMarkdown(nextFileTreeMarkdown)
    setPreviewData(nextPreview)

    if (nextScenario) {
      const scenarioTree = buildTreeFromScenario(nextScenario)
      setTreeData(scenarioTree)

      const details = buildDetailsFromScenario(nextScenario)
      details["scenario_v1"] = {
        title: "v1.0 기획서",
        doc: JSON.stringify(nextScenario, null, 2),
        previewSummary: ["v1.0 기획서 자동 생성 결과"],
        flowSteps: nextFlow?.steps?.map((step) => ({
          title: step.title,
          desc: step.description,
        })) ?? [{ title: "기획서 생성", desc: "코드 스캔 기반 v1.0 초안" }],
        diagram: nextDiagram?.mermaid ?? 'flowchart TB\n  A["scenario_v1"]',
        codeFiles:
          nextCodeGuide?.items?.map((item) => ({
            name: item.file_name,
            content: item.guides.join("\n"),
          })) ?? [],
        status: "complete",
      }

      setNodeDetails(details)
      setProjectName(nextScenario.project_name || url.split("/").pop()?.replace(".git", "") || "Git Project")
      setProjectVersion(nextScenario.version || "v1.0")
      setSelectedItem(scenarioTree[0]?.id ?? null)
      setExpandedItems(collectExpandedIds(scenarioTree))
    } else {
      setTreeData([])
      setNodeDetails({})
      setProjectName(url.split("/").pop()?.replace(".git", "") || "Git Project")
      setProjectVersion("-")
    }

    setActiveTab("PREVIEW")
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
      "분석에 실패했습니다. 백엔드 실행 및 API 경로를 확인해주세요."

    setAnalysisError(String(message))
    setAnalysisMarkdown("")
    setFileTreeMarkdown("")
    setScenarioV1(null)
    setFlowData(null)
    setDiagramData(null)
    setCodeGuideData(null)
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
            {item.children!.map((child: TreeItem) => renderTreeItem(child, depth + 1))}
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
            <div className="w-full h-full bg-[#f8fafc] rounded-2xl p-8 overflow-y-auto">
              <div className="flex justify-center">
                <div className="w-[453px] min-h-[877px] bg-white rounded-[32px] border border-[#e4eaf2] overflow-hidden">
                  {previewData?.html ? (
                    <iframe
                      title="preview"
                      className="w-full h-[877px] bg-white"
                      ref={previewFrameRef}
                      srcDoc={previewData.html}
                      onLoad={() => {
                        if (!selectedItem) return
                        previewFrameRef.current?.contentWindow?.postMessage(
                          { selectedNodeId: selectedItem },
                          "*"
                        )
                      }}
                    />
                  ) : (
                    <div className="h-[877px] flex items-center justify-center text-[12px] text-[#94a3b8]">
                      프리뷰가 없습니다.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

            {activeTab === "FLOW" && (
              <div className="w-full h-full bg-[#f8fafc] rounded-2xl p-8 overflow-y-auto">
                <div className="flex items-center gap-2 mb-8">
                  <GitBranch className="w-5 h-5 text-[#8b5cf6]" />
                  <span className="text-[16px] font-semibold text-[#0f172a]">Business Flow</span>
                </div>

                <div className="space-y-6">
                  {(flowData?.steps?.length
                    ? flowData.steps
                    : [{ step: 1, title: "분석 대기", description: "시나리오 트리 분석을 실행하세요.", status: "default" }]
                  ).map((step, i, arr) => {
                    const isStepModified =
                      step.status === "modified" || step.status === "selected_modified"
                    const isStepSelected =
                      step.status === "selected" || step.status === "selected_modified"

                    return (
                      <div key={`${step.title}-${i}`} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div
                            className={`w-8 h-8 rounded-full text-white flex items-center justify-center text-[13px] font-semibold ${
                              isStepModified
                                ? "bg-[#fb923c]"
                                : isStepSelected
                                ? "bg-[#8b5cf6]"
                                : "bg-[#8b5cf6]"
                            }`}
                          >
                            {step.step ?? i + 1}
                          </div>
                          {i < arr.length - 1 && (
                            <div className="w-0.5 flex-1 bg-[#e4eaf2] mt-2" />
                          )}
                        </div>
                        <div className="flex-1 pb-6">
                          <h3
                            className={`text-[15px] font-semibold mb-2 ${
                              isStepModified ? "text-[#fb923c]" : "text-[#0f172a]"
                            }`}
                          >
                            {step.title}
                          </h3>
                          <p className="text-[13px] text-[#64748b] leading-relaxed">
                            {step.description}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {activeTab === "DIAGRAM" && (
              <div className="w-full h-full bg-[#f8fafc] rounded-2xl p-8 overflow-y-auto">
                <div className="flex items-center gap-2 mb-8">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="2" y="2" width="6" height="4" rx="1" stroke="#8b5cf6" strokeWidth="1.5"/>
                    <rect x="12" y="2" width="6" height="4" rx="1" stroke="#8b5cf6" strokeWidth="1.5"/>
                    <rect x="7" y="14" width="6" height="4" rx="1" stroke="#8b5cf6" strokeWidth="1.5"/>
                    <path d="M5 6V10H10M15 6V10H10M10 10V14" stroke="#8b5cf6" strokeWidth="1.5"/>
                  </svg>
                  <span className="text-[16px] font-semibold text-[#0f172a]">시스템 아키텍쳐 다이어그램</span>
                </div>

                <div className="flex justify-center">
                  {diagramData?.mermaid ? (
                    <MermaidDiagram
                      chart={diagramData.mermaid}
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
                <div className="flex items-center gap-2 mb-6">
                  <Code2 className="w-5 h-5 text-[#8b5cf6]" />
                  <span className="text-[16px] font-semibold text-[#0f172a]">Spec Overview</span>
                </div>

                {scenarioV1 && (
                  <div className="bg-white border border-[#e4eaf2] rounded-xl p-5 mb-4">
                    <button
                      className="w-full flex items-center justify-between text-left"
                      onClick={() => setScenarioJsonOpen((prev) => !prev)}
                    >
                      <span className="text-[12px] font-semibold text-[#0f172a]">v1.0 시나리오 (JSON)</span>
                      <span className="text-[12px] text-[#64748b]">
                        {scenarioJsonOpen ? "접기" : "펼치기"}
                      </span>
                    </button>
                    {scenarioJsonOpen && (
                      <pre className="mt-3 text-[12px] whitespace-pre-wrap text-[#0f172a]">
                        {JSON.stringify(scenarioV1, null, 2)}
                      </pre>
                    )}
                  </div>
                )}

                <div className="bg-white border border-[#e4eaf2] rounded-xl p-5 mb-4">
                  <button
                    className="w-full flex items-center justify-between text-left"
                    onClick={() => setFileTreeOpen((prev) => !prev)}
                  >
                    <span className="text-[12px] font-semibold text-[#0f172a]">파일 트리</span>
                    <span className="text-[12px] text-[#64748b]">
                      {fileTreeOpen ? "접기" : "펼치기"}
                    </span>
                  </button>
                  {fileTreeOpen && (
                    <div className="mt-3 text-[12px] text-[#0f172a]">
                      {fileTreeMarkdown ? (
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {fileTreeMarkdown}
                        </ReactMarkdown>
                      ) : (
                        <span className="text-[12px] text-[#94a3b8]">파일 트리가 없습니다.</span>
                      )}
                    </div>
                  )}
                </div>

                {codeGuideData?.items?.length ? (
                  <div className="space-y-4">
                    {codeGuideData.items.map((item) => {
                      const isItemModified =
                        item.status === "modified" || item.status === "selected_modified"
                      const borderClass = isItemModified
                        ? "border-[#fb923c] bg-[#fff7ed]"
                        : "border-[#e4eaf2] bg-white"

                      return (
                        <div key={item.node_id} className={`rounded-xl border p-5 ${borderClass}`}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="font-semibold text-sm text-slate-900">
                              {item.file_name}
                            </div>
                            <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-700">
                              {item.badge}
                            </span>
                          </div>

                          <div className="text-xs text-slate-500 mb-2">{item.file_type}</div>

                          <div className="text-sm text-slate-700 mb-3">{item.reason}</div>

                          <ul className="list-disc pl-5 space-y-1 text-sm text-slate-700">
                            {item.guides.map((guide, idx) => (
                              <li key={idx}>{guide}</li>
                            ))}
                          </ul>
                        </div>
                      )
                    })}
                  </div>
                ) : analysisMarkdown ? (
                  <div className="bg-white border border-[#e4eaf2] rounded-xl p-5">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {analysisMarkdown}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <span className="text-[12px] text-[#94a3b8]">코드 가이드가 없습니다.</span>
                )}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
