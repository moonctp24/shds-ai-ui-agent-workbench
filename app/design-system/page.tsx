"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ArrowLeft } from "lucide-react"

export default function DesignSystemPage() {
  const [isDark, setIsDark] = useState(true)

  return (
    <div className={isDark ? "dark" : ""}>
      <div className="min-h-screen bg-[#0f172a] text-white">
        {/* Header */}
        <header className="border-b border-white/10 px-6 py-4">
          <div className="mx-auto flex max-w-6xl items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="rounded-lg p-2 hover:bg-white/10">
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#4f46e5]">
                  <span className="text-sm font-bold">AI</span>
                </div>
                <div>
                  <h1 className="text-lg font-semibold">AI UI AGENT</h1>
                  <p className="text-xs text-white/60">Design System</p>
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsDark(!isDark)}
              className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium hover:bg-white/20"
            >
              {isDark ? "Dark Mode" : "Light Mode"}
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-6 py-8">
          <div className="grid gap-8 lg:grid-cols-2">
            {/* Left Column - Colors & Buttons */}
            <div className="space-y-6">
              {/* Title Card */}
              <div className="rounded-xl bg-[#1e293b] p-6">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <div className="h-3 w-3 rounded-full bg-[#e11d48]" />
                    <div className="h-3 w-3 rounded-full bg-[#fb923c]" />
                    <div className="h-3 w-3 rounded-full bg-[#10b981]" />
                  </div>
                </div>
                <h2 className="text-xl font-semibold">UI 디자인시스템</h2>
              </div>

              {/* Color Palette */}
              <div className="rounded-xl bg-[#1e293b] p-6">
                <h3 className="mb-4 text-sm font-medium text-white/60">컬러 팔레트</h3>
                
                {/* Primary Colors */}
                <div className="mb-4">
                  <p className="mb-2 text-xs text-white/40">Primary</p>
                  <div className="flex gap-2">
                    <div className="h-8 w-8 rounded-lg bg-[#4f46e5]" />
                    <div className="h-8 w-8 rounded-lg bg-[#5e61e5]" />
                    <div className="h-8 w-8 rounded-lg bg-[#8559ec]" />
                    <div className="h-8 w-8 rounded-lg bg-[#8b5cf6]" />
                    <div className="h-8 w-8 rounded-lg bg-[#bbbef8]" />
                  </div>
                </div>

                {/* Neutral Colors */}
                <div className="mb-4">
                  <p className="mb-2 text-xs text-white/40">Neutral</p>
                  <div className="flex gap-2">
                    <div className="h-8 w-8 rounded-lg bg-[#0f172a]" />
                    <div className="h-8 w-8 rounded-lg bg-[#1e293b]" />
                    <div className="h-8 w-8 rounded-lg bg-[#334155]" />
                    <div className="h-8 w-8 rounded-lg bg-[#64748b]" />
                    <div className="h-8 w-8 rounded-lg bg-[#94a3b8]" />
                    <div className="h-8 w-8 rounded-lg bg-[#e4eaf2]" />
                    <div className="h-8 w-8 rounded-lg bg-[#ffffff]" />
                  </div>
                </div>

                {/* Status Colors */}
                <div>
                  <p className="mb-2 text-xs text-white/40">Status</p>
                  <div className="flex gap-2">
                    <div className="h-8 w-8 rounded-lg bg-[#10b981]" />
                    <div className="h-8 w-8 rounded-lg bg-[#34d399]" />
                    <div className="h-8 w-8 rounded-lg bg-[#e11d48]" />
                    <div className="h-8 w-8 rounded-lg bg-[#fb923c]" />
                    <div className="h-8 w-8 rounded-lg bg-[#06b6d4]" />
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div className="rounded-xl bg-[#1e293b] p-6">
                <h3 className="mb-4 text-sm font-medium text-white/60">버튼</h3>
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Button className="bg-[#4f46e5] hover:bg-[#4338ca]">Primary</Button>
                    <Button className="bg-[#334155] hover:bg-[#475569]">Secondary</Button>
                    <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">Outline</Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" className="bg-[#4f46e5] hover:bg-[#4338ca]">Small</Button>
                    <Button size="default" className="bg-[#4f46e5] hover:bg-[#4338ca]">Default</Button>
                    <Button size="lg" className="bg-[#4f46e5] hover:bg-[#4338ca]">Large</Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button className="bg-[#10b981] hover:bg-[#059669]">Success</Button>
                    <Button className="bg-[#fb923c] hover:bg-[#ea580c]">Warning</Button>
                    <Button className="bg-[#e11d48] hover:bg-[#be123c]">Danger</Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Forms */}
            <div className="space-y-6">
              {/* Input Fields */}
              <div className="rounded-xl bg-[#1e293b] p-6">
                <h3 className="mb-4 text-sm font-medium text-white/60">입력 필드</h3>
                <div className="space-y-4">
                  <div>
                    <Label className="mb-2 block text-sm text-white/80">레이블</Label>
                    <Input 
                      placeholder="placeholder" 
                      className="border-white/20 bg-[#0f172a] text-white placeholder:text-white/40"
                    />
                    <p className="mt-1 text-xs text-white/40">helper text</p>
                  </div>
                  <div>
                    <Label className="mb-2 block text-sm text-white/80">비활성</Label>
                    <Input 
                      placeholder="Disabled" 
                      disabled
                      className="border-white/10 bg-[#0f172a]/50 text-white/40"
                    />
                  </div>
                  <div>
                    <Label className="mb-2 block text-sm text-[#e11d48]">에러</Label>
                    <Input 
                      placeholder="Error state" 
                      className="border-[#e11d48] bg-[#0f172a] text-white"
                    />
                    <p className="mt-1 text-xs text-[#e11d48]">에러 메시지</p>
                  </div>
                </div>
              </div>

              {/* Select */}
              <div className="rounded-xl bg-[#1e293b] p-6">
                <h3 className="mb-4 text-sm font-medium text-white/60">선택</h3>
                <div className="space-y-4">
                  <div>
                    <Label className="mb-2 block text-sm text-white/80">드롭다운</Label>
                    <Select>
                      <SelectTrigger className="border-white/20 bg-[#0f172a] text-white">
                        <SelectValue placeholder="옵션 선택" />
                      </SelectTrigger>
                      <SelectContent className="border-white/20 bg-[#1e293b] text-white">
                        <SelectItem value="option1">옵션 1</SelectItem>
                        <SelectItem value="option2">옵션 2</SelectItem>
                        <SelectItem value="option3">옵션 3</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Checkbox */}
              <div className="rounded-xl bg-[#1e293b] p-6">
                <h3 className="mb-4 text-sm font-medium text-white/60">체크박스</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Checkbox id="c1" defaultChecked className="border-white/40 data-[state=checked]:bg-[#4f46e5]" />
                    <Label htmlFor="c1" className="text-sm text-white/80">선택됨</Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <Checkbox id="c2" className="border-white/40" />
                    <Label htmlFor="c2" className="text-sm text-white/80">선택 안됨</Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <Checkbox id="c3" disabled className="border-white/20" />
                    <Label htmlFor="c3" className="text-sm text-white/40">비활성화</Label>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="rounded-xl bg-[#1e293b] p-6">
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1 border-white/20 text-white hover:bg-white/10">
                    취소
                  </Button>
                  <Button className="flex-1 bg-[#4f46e5] hover:bg-[#4338ca]">
                    저장
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
