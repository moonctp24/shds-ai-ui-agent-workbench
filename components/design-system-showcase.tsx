"use client"

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

export function DesignSystemShowcase() {
  return (
    <div className="grid gap-8 lg:grid-cols-2">
      {/* Color Palette */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="mb-4 text-lg font-semibold">컬러 팔레트</h3>
        <div className="space-y-4">
          {/* Primary Colors */}
          <div>
            <p className="mb-2 text-sm text-muted-foreground">Primary</p>
            <div className="flex gap-2">
              <div className="h-10 w-10 rounded-lg bg-[#4f46e5]" title="#4f46e5" />
              <div className="h-10 w-10 rounded-lg bg-[#5e61e5]" title="#5e61e5" />
              <div className="h-10 w-10 rounded-lg bg-[#8559ec]" title="#8559ec" />
              <div className="h-10 w-10 rounded-lg bg-[#8b5cf6]" title="#8b5cf6" />
              <div className="h-10 w-10 rounded-lg bg-[#bbbef8]" title="#bbbef8" />
            </div>
          </div>
          {/* Neutral Colors */}
          <div>
            <p className="mb-2 text-sm text-muted-foreground">Neutral</p>
            <div className="flex gap-2">
              <div className="h-10 w-10 rounded-lg bg-[#0f172a]" title="#0f172a" />
              <div className="h-10 w-10 rounded-lg bg-[#1e293b]" title="#1e293b" />
              <div className="h-10 w-10 rounded-lg bg-[#334155]" title="#334155" />
              <div className="h-10 w-10 rounded-lg bg-[#64748b]" title="#64748b" />
              <div className="h-10 w-10 rounded-lg bg-[#94a3b8]" title="#94a3b8" />
              <div className="h-10 w-10 rounded-lg border border-border bg-[#e4eaf2]" title="#e4eaf2" />
              <div className="h-10 w-10 rounded-lg border border-border bg-[#ffffff]" title="#ffffff" />
            </div>
          </div>
          {/* Status Colors */}
          <div>
            <p className="mb-2 text-sm text-muted-foreground">Status</p>
            <div className="flex gap-2">
              <div className="h-10 w-10 rounded-lg bg-[#10b981]" title="#10b981 Success" />
              <div className="h-10 w-10 rounded-lg bg-[#34d399]" title="#34d399" />
              <div className="h-10 w-10 rounded-lg bg-[#e11d48]" title="#e11d48 Error" />
              <div className="h-10 w-10 rounded-lg bg-[#fb923c]" title="#fb923c Warning" />
              <div className="h-10 w-10 rounded-lg bg-[#06b6d4]" title="#06b6d4 Info" />
            </div>
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="mb-4 text-lg font-semibold">버튼</h3>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Button className="bg-[#4f46e5] hover:bg-[#4338ca]">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button size="sm" className="bg-[#4f46e5] hover:bg-[#4338ca]">Small</Button>
            <Button size="default" className="bg-[#4f46e5] hover:bg-[#4338ca]">Default</Button>
            <Button size="lg" className="bg-[#4f46e5] hover:bg-[#4338ca]">Large</Button>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button disabled className="bg-[#4f46e5]">Disabled</Button>
            <Button className="bg-[#10b981] hover:bg-[#059669]">Success</Button>
            <Button className="bg-[#fb923c] hover:bg-[#ea580c]">Warning</Button>
          </div>
        </div>
      </div>

      {/* Inputs */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="mb-4 text-lg font-semibold">입력 필드</h3>
        <div className="space-y-4">
          <div>
            <Label htmlFor="default-input" className="mb-2 block text-sm">기본 입력</Label>
            <Input id="default-input" placeholder="텍스트를 입력하세요" />
          </div>
          <div>
            <Label htmlFor="disabled-input" className="mb-2 block text-sm">비활성 입력</Label>
            <Input id="disabled-input" placeholder="비활성화됨" disabled />
          </div>
          <div>
            <Label htmlFor="error-input" className="mb-2 block text-sm text-[#e11d48]">에러 상태</Label>
            <Input 
              id="error-input" 
              placeholder="잘못된 입력" 
              className="border-[#e11d48] focus-visible:ring-[#e11d48]/20"
            />
            <p className="mt-1 text-sm text-[#e11d48]">필수 입력 항목입니다.</p>
          </div>
        </div>
      </div>

      {/* Select & Checkbox */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="mb-4 text-lg font-semibold">선택 요소</h3>
        <div className="space-y-4">
          <div>
            <Label className="mb-2 block text-sm">드롭다운 선택</Label>
            <Select>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="옵션을 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="option1">옵션 1</SelectItem>
                <SelectItem value="option2">옵션 2</SelectItem>
                <SelectItem value="option3">옵션 3</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-3">
            <Label className="block text-sm">체크박스</Label>
            <div className="flex items-center gap-2">
              <Checkbox id="check1" defaultChecked />
              <Label htmlFor="check1" className="text-sm font-normal">선택됨</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="check2" />
              <Label htmlFor="check2" className="text-sm font-normal">선택 안됨</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="check3" disabled />
              <Label htmlFor="check3" className="text-sm font-normal text-muted-foreground">비활성화</Label>
            </div>
          </div>
        </div>
      </div>

      {/* Cards */}
      <div className="rounded-xl border border-border bg-card p-6 lg:col-span-2">
        <h3 className="mb-4 text-lg font-semibold">카드</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-border bg-background p-4">
            <div className="mb-3 h-24 rounded-md bg-muted" />
            <h4 className="font-medium">기본 카드</h4>
            <p className="mt-1 text-sm text-muted-foreground">기본 스타일의 카드입니다.</p>
          </div>
          <div className="rounded-lg border-2 border-[#4f46e5] bg-background p-4">
            <div className="mb-3 h-24 rounded-md bg-[#4f46e5]/10" />
            <h4 className="font-medium text-[#4f46e5]">하이라이트 카드</h4>
            <p className="mt-1 text-sm text-muted-foreground">강조된 스타일의 카드입니다.</p>
          </div>
          <div className="rounded-lg bg-[#0f172a] p-4 text-white">
            <div className="mb-3 h-24 rounded-md bg-white/10" />
            <h4 className="font-medium">다크 카드</h4>
            <p className="mt-1 text-sm text-[#94a3b8]">다크 스타일의 카드입니다.</p>
          </div>
        </div>
      </div>

      {/* Typography */}
      <div className="rounded-xl border border-border bg-card p-6 lg:col-span-2">
        <h3 className="mb-4 text-lg font-semibold">타이포그래피</h3>
        <div className="space-y-4">
          <div>
            <h1 className="text-4xl font-bold">Heading 1 - 제목</h1>
          </div>
          <div>
            <h2 className="text-3xl font-semibold">Heading 2 - 제목</h2>
          </div>
          <div>
            <h3 className="text-2xl font-semibold">Heading 3 - 제목</h3>
          </div>
          <div>
            <h4 className="text-xl font-medium">Heading 4 - 제목</h4>
          </div>
          <div>
            <p className="text-base">Body - 본문 텍스트입니다. 기본 크기의 텍스트를 표시합니다.</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Caption - 보조 텍스트입니다. 작은 크기의 텍스트를 표시합니다.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
