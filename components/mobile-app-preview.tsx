"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight, Plus, Search, Settings, User, MessageSquare, Bell } from "lucide-react"

export function MobileAppPreview() {
  const [activeScreen, setActiveScreen] = useState(0)
  const screens = ["대시보드", "AI 대화", "설정"]

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Screen Navigation */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => setActiveScreen(Math.max(0, activeScreen - 1))}
          className="rounded-full bg-secondary p-2 hover:bg-secondary/80"
          disabled={activeScreen === 0}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="min-w-[100px] text-center font-medium">{screens[activeScreen]}</span>
        <button
          onClick={() => setActiveScreen(Math.min(screens.length - 1, activeScreen + 1))}
          className="rounded-full bg-secondary p-2 hover:bg-secondary/80"
          disabled={activeScreen === screens.length - 1}
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Mobile Frames */}
      <div className="flex flex-wrap items-start justify-center gap-8">
        {/* Dashboard Screen */}
        <div className={`transition-opacity ${activeScreen === 0 ? "opacity-100" : "hidden lg:block lg:opacity-50"}`}>
          <MobileFrame>
            <DashboardScreen />
          </MobileFrame>
        </div>

        {/* AI Chat Screen */}
        <div className={`transition-opacity ${activeScreen === 1 ? "opacity-100" : "hidden lg:block lg:opacity-50"}`}>
          <MobileFrame>
            <ChatScreen />
          </MobileFrame>
        </div>

        {/* Settings Screen */}
        <div className={`transition-opacity ${activeScreen === 2 ? "opacity-100" : "hidden lg:block lg:opacity-50"}`}>
          <MobileFrame>
            <SettingsScreen />
          </MobileFrame>
        </div>
      </div>
    </div>
  )
}

function MobileFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative rounded-[3rem] border-4 border-[#1e293b] bg-[#050b1a] p-2 shadow-2xl">
      {/* Notch */}
      <div className="absolute left-1/2 top-2 z-10 h-6 w-24 -translate-x-1/2 rounded-full bg-[#1e293b]" />
      {/* Screen */}
      <div className="h-[600px] w-[280px] overflow-hidden rounded-[2.5rem] bg-background">
        {children}
      </div>
    </div>
  )
}

function DashboardScreen() {
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="bg-[#4f46e5] px-4 pb-8 pt-12">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-white/20" />
            <div>
              <p className="text-sm text-white/70">안녕하세요</p>
              <p className="font-semibold text-white">사용자님</p>
            </div>
          </div>
          <Bell className="h-6 w-6 text-white" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 space-y-4 px-4 py-4">
        {/* Search */}
        <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">검색...</span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground">오늘 대화</p>
            <p className="text-2xl font-bold text-[#4f46e5]">12</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground">총 질문</p>
            <p className="text-2xl font-bold text-[#10b981]">156</p>
          </div>
        </div>

        {/* Recent */}
        <div>
          <p className="mb-2 text-sm font-medium">최근 대화</p>
          <div className="space-y-2">
            {["프로젝트 기획 도움", "코드 리뷰 요청", "일정 관리"].map((item, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#4f46e5]/10">
                  <MessageSquare className="h-4 w-4 text-[#4f46e5]" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{item}</p>
                  <p className="text-xs text-muted-foreground">방금 전</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Nav */}
      <BottomNav active="home" />
    </div>
  )
}

function ChatScreen() {
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border bg-card px-4 pb-4 pt-12">
        <ChevronLeft className="h-5 w-5" />
        <div className="flex-1">
          <p className="font-semibold">AI 어시스턴트</p>
          <p className="text-xs text-[#10b981]">● 온라인</p>
        </div>
        <Settings className="h-5 w-5 text-muted-foreground" />
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {/* AI Message */}
        <div className="flex gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#4f46e5]">
            <span className="text-xs font-bold text-white">AI</span>
          </div>
          <div className="max-w-[80%] rounded-2xl rounded-tl-none bg-muted p-3">
            <p className="text-sm">안녕하세요! 무엇을 도와드릴까요?</p>
          </div>
        </div>

        {/* User Message */}
        <div className="flex justify-end">
          <div className="max-w-[80%] rounded-2xl rounded-tr-none bg-[#4f46e5] p-3">
            <p className="text-sm text-white">프로젝트 일정을 정리해줘</p>
          </div>
        </div>

        {/* AI Response */}
        <div className="flex gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#4f46e5]">
            <span className="text-xs font-bold text-white">AI</span>
          </div>
          <div className="max-w-[80%] rounded-2xl rounded-tl-none bg-muted p-3">
            <p className="text-sm">네, 프로젝트 일정을 정리해드릴게요.</p>
            <div className="mt-2 space-y-1">
              <p className="text-xs text-muted-foreground">• 1주차: 기획 및 디자인</p>
              <p className="text-xs text-muted-foreground">• 2주차: 개발 시작</p>
              <p className="text-xs text-muted-foreground">• 3주차: 테스트</p>
            </div>
          </div>
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-border bg-card p-3">
        <div className="flex items-center gap-2 rounded-full bg-muted px-4 py-2">
          <input
            type="text"
            placeholder="메시지를 입력하세요..."
            className="flex-1 bg-transparent text-sm outline-none"
          />
          <button className="flex h-8 w-8 items-center justify-center rounded-full bg-[#4f46e5]">
            <Plus className="h-4 w-4 text-white" />
          </button>
        </div>
      </div>
    </div>
  )
}

function SettingsScreen() {
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-border bg-card px-4 pb-4 pt-12">
        <p className="text-lg font-semibold">설정</p>
      </div>

      {/* Profile */}
      <div className="border-b border-border bg-card p-4">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#4f46e5]">
            <User className="h-8 w-8 text-white" />
          </div>
          <div>
            <p className="font-semibold">사용자</p>
            <p className="text-sm text-muted-foreground">user@example.com</p>
          </div>
        </div>
      </div>

      {/* Settings List */}
      <div className="flex-1 space-y-1 p-4">
        {[
          { label: "알림 설정", icon: Bell },
          { label: "계정 관리", icon: User },
          { label: "AI 설정", icon: MessageSquare },
          { label: "일반 설정", icon: Settings },
        ].map(({ label, icon: Icon }, i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded-lg p-3 transition-colors hover:bg-muted"
          >
            <div className="flex items-center gap-3">
              <Icon className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm">{label}</span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        ))}

        {/* Toggle Items */}
        <div className="mt-4 space-y-3 rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm">다크 모드</span>
            <div className="h-6 w-10 rounded-full bg-[#4f46e5] p-1">
              <div className="h-4 w-4 translate-x-4 rounded-full bg-white transition-transform" />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">푸시 알림</span>
            <div className="h-6 w-10 rounded-full bg-muted p-1">
              <div className="h-4 w-4 rounded-full bg-white transition-transform" />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Nav */}
      <BottomNav active="settings" />
    </div>
  )
}

function BottomNav({ active }: { active: string }) {
  return (
    <div className="flex items-center justify-around border-t border-border bg-card px-4 py-3">
      <button className={`flex flex-col items-center gap-1 ${active === "home" ? "text-[#4f46e5]" : "text-muted-foreground"}`}>
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
        <span className="text-xs">홈</span>
      </button>
      <button className={`flex flex-col items-center gap-1 ${active === "chat" ? "text-[#4f46e5]" : "text-muted-foreground"}`}>
        <MessageSquare className="h-5 w-5" />
        <span className="text-xs">대화</span>
      </button>
      <button className={`flex flex-col items-center gap-1 ${active === "settings" ? "text-[#4f46e5]" : "text-muted-foreground"}`}>
        <Settings className="h-5 w-5" />
        <span className="text-xs">설정</span>
      </button>
    </div>
  )
}
