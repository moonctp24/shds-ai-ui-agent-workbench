"use client"

import { useEffect, useRef } from "react"
import mermaid from "mermaid"

interface MermaidDiagramProps {
  chart: string
  className?: string
}

export default function MermaidDiagram({ chart, className }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: true,
      theme: "base",
      themeVariables: {
        primaryColor: "#c4b5fd",
        primaryTextColor: "#1e1b4b",
        primaryBorderColor: "#8b5cf6",
        lineColor: "#8b5cf6",
        secondaryColor: "#ede9fe",
        tertiaryColor: "#f5f3ff",
        fontFamily: "inherit",
        fontSize: "14px",
      },
      flowchart: {
        curve: "linear",
        padding: 20,
        nodeSpacing: 50,
        rankSpacing: 60,
      },
    })

    const renderDiagram = async () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = ""
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`
        try {
          const { svg } = await mermaid.render(id, chart)
          containerRef.current.innerHTML = svg
        } catch (error) {
          console.error("Mermaid rendering error:", error)
        }
      }
    }

    renderDiagram()
  }, [chart])

  return <div ref={containerRef} className={className} />
}
