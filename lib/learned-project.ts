export type TreeNode = {
  id: string;
  label: string;
  level: number;
  children?: TreeNode[];
};

export type CodeFile = {
  name: string;
  content: string;
};

export type NodeDetail = {
  title: string;
  doc: string;
  previewSummary: string[];
  flowSteps: { title: string; desc: string }[];
  diagram: string;
  codeFiles: CodeFile[];
  status: "complete" | "pending";
};

export type LearnedProject = {
  name: string;
  version: string;
  scenarioOriginal: string;
  tree: TreeNode[];
  details: Record<string, NodeDetail>;
};

export const learnedProject: LearnedProject = {
  name: "카드 메인페이지",
  version: "v1.0",
  scenarioOriginal:
    "신한카드 스타일의 단일 카드 메인페이지를 기준으로 화면을 구성한다. " +
    "상단 요약 배너(내 카드 관리 대시보드), 보유 카드 리스트(카드 3장), 카드 개수 표시로 구성된다.",
  tree: [
    {
      id: "root",
      label: "카드 메인페이지",
      level: 0,
      children: [
        {
          id: "preview-frame",
          label: "프리뷰 프레임",
          level: 1,
          children: [
            { id: "preview-device", label: "프레임 컨테이너", level: 2 },
            { id: "preview-screen", label: "스크린 영역", level: 2 },
            { id: "preview-notch", label: "노치", level: 2 },
            {
              id: "preview-content",
              label: "스크린 콘텐츠",
              level: 2,
              children: [
                { id: "preview-spec", label: "스펙 요약 카드", level: 3 },
                {
                  id: "dashboard",
                  label: "컴포넌트1) 내 카드 관리 대시보드",
                  level: 3,
                  children: [
                    { id: "dashboard-card", label: "대시보드 카드", level: 4 },
                    {
                      id: "dashboard-header",
                      label: "대시보드 헤더",
                      level: 4,
                      children: [
                        { id: "dashboard-title", label: "대시보드 타이틀", level: 5 },
                        { id: "dashboard-badge", label: "버전 배지", level: 5 }
                      ]
                    },
                    {
                      id: "dashboard-metrics",
                      label: "요약 지표 그리드",
                      level: 4,
                      children: [
                        { id: "metric-total-limit", label: "지표) 총 이용 한도", level: 5 },
                        { id: "metric-total-billing", label: "지표) 총 결제 예정 금액", level: 5 },
                        { id: "metric-active-cards", label: "지표) 정상 이용 카드", level: 5 },
                        { id: "metric-paused-cards", label: "지표) 일시정지 카드", level: 5 }
                      ]
                    }
                  ]
                },
                {
                  id: "card-list",
                  label: "컴포넌트2) 보유카드 리스트",
                  level: 3,
                  children: [
                    { id: "card-list-card", label: "리스트 카드", level: 4 },
                    {
                      id: "card-list-header",
                      label: "리스트 헤더",
                      level: 4,
                      children: [
                        { id: "card-list-title", label: "리스트 타이틀", level: 5 },
                        { id: "card-list-count", label: "카드 개수 표시", level: 5 }
                      ]
                    },
                    {
                      id: "card-items",
                      label: "카드 아이템 그룹",
                      level: 4,
                      children: [
                        {
                          id: "card-1",
                          label: "컴포넌트 2-1) 카드1",
                          level: 5,
                          children: [
                            {
                              id: "card-1-header",
                              label: "카드1 헤더",
                              level: 6,
                              children: [
                                { id: "card-1-info", label: "카드1 정보", level: 7 },
                                { id: "card-1-status", label: "카드1 상태", level: 7 }
                              ]
                            },
                            {
                              id: "card-1-metrics",
                              label: "카드1 지표",
                              level: 6,
                              children: [
                                { id: "card-1-limit", label: "카드1 이용 한도", level: 7 },
                                { id: "card-1-billing", label: "카드1 결제 예정", level: 7 }
                              ]
                            }
                          ]
                        },
                        {
                          id: "card-2",
                          label: "컴포넌트 2-2) 카드2",
                          level: 5,
                          children: [
                            {
                              id: "card-2-header",
                              label: "카드2 헤더",
                              level: 6,
                              children: [
                                { id: "card-2-info", label: "카드2 정보", level: 7 },
                                { id: "card-2-status", label: "카드2 상태", level: 7 }
                              ]
                            },
                            {
                              id: "card-2-metrics",
                              label: "카드2 지표",
                              level: 6,
                              children: [
                                { id: "card-2-limit", label: "카드2 이용 한도", level: 7 },
                                { id: "card-2-billing", label: "카드2 결제 예정", level: 7 }
                              ]
                            }
                          ]
                        },
                        {
                          id: "card-3",
                          label: "컴포넌트 2-3) 카드3",
                          level: 5,
                          children: [
                            {
                              id: "card-3-header",
                              label: "카드3 헤더",
                              level: 6,
                              children: [
                                { id: "card-3-info", label: "카드3 정보", level: 7 },
                                { id: "card-3-status", label: "카드3 상태", level: 7 }
                              ]
                            },
                            {
                              id: "card-3-metrics",
                              label: "카드3 지표",
                              level: 6,
                              children: [
                                { id: "card-3-limit", label: "카드3 이용 한도", level: 7 },
                                { id: "card-3-billing", label: "카드3 결제 예정", level: 7 }
                              ]
                            }
                          ]
                        }
                      ]
                    }
                  ]
                },
                {
                  id: "card-count",
                  label: "컴포넌트 3) 카드 개수 표시",
                  level: 3,
                  children: [
                    { id: "card-count-card", label: "개수 표시 카드", level: 4 },
                    { id: "card-count-info", label: "개수 텍스트", level: 4 },
                    { id: "card-count-value", label: "개수 값", level: 4 }
                  ]
                }
              ]
            }
          ]
        }
      ]
    }
  ],
  details: {
    root: {
      title: "카드 메인페이지",
      doc:
        "단일 페이지 구성으로, 상단 요약 배너와 보유 카드 리스트, 카드 개수 표시만 포함한다. " +
        "모든 컴포넌트는 하나의 페이지에서 순차적으로 렌더링된다.",
      previewSummary: [
        "상단 요약 배너: 내 카드 관리 대시보드",
        "보유 카드 리스트: 카드 3장",
        "카드 개수 표시: 총 3장"
      ],
      flowSteps: [
        { title: "요약 배너", desc: "총 이용 한도/결제 예정 금액 표시" },
        { title: "보유 카드 리스트", desc: "카드 3장 카드 요약 표시" },
        { title: "카드 개수 표시", desc: "보유 카드 개수 텍스트 표시" }
      ],
      diagram:
        'flowchart TB\n' +
        '  A["내 카드 관리 대시보드"] --> B["보유카드 리스트"]\n' +
        '  B --> C["카드1"]\n' +
        '  B --> D["카드2"]\n' +
        '  B --> E["카드3"]\n' +
        '  B --> F["카드 개수 표시"]',
      codeFiles: [
        {
          name: "src/app/page.tsx",
          content:
            "return (\n" +
            "  <div className=\"flex w-full flex-col gap-5\">\n" +
            "    <section className=\"card-shadow bg-gradient-to-r from-shinhancard-blue to-blue-500 p-5 text-white\">\n" +
            "      <h1>내 카드 관리 대시보드</h1>\n" +
            "    </section>\n" +
            "    <CardList />\n" +
            "  </div>\n" +
            ");"
        }
      ],
      status: "complete"
    },
    "preview-frame": {
      title: "프리뷰 프레임",
      doc: "아이폰 스타일 프레임과 스크린 영역을 감싸는 컨테이너.",
      previewSummary: ["프리뷰 프레임", "스크린 영역", "노치"],
      flowSteps: [{ title: "프레임 렌더", desc: "기기 프레임 표시" }],
      diagram: 'flowchart LR\n  A["프리뷰 프레임"] --> B["스크린 영역"]',
      codeFiles: [],
      status: "complete"
    },
    "preview-device": {
      title: "프레임 컨테이너",
      doc: "iPhone 프레임 외곽 컨테이너를 그린다.",
      previewSummary: ["iPhone 프레임", "그림자"],
      flowSteps: [{ title: "외곽 프레임", desc: "라운드 프레임 표시" }],
      diagram: 'flowchart TB\n  A["프레임 컨테이너"]',
      codeFiles: [],
      status: "complete"
    },
    "preview-screen": {
      title: "스크린 영역",
      doc: "프레임 내부의 화면 영역.",
      previewSummary: ["스크린 배경", "콘텐츠 영역"],
      flowSteps: [{ title: "스크린 렌더", desc: "콘텐츠 표시 영역 제공" }],
      diagram: 'flowchart TB\n  A["스크린 영역"]',
      codeFiles: [],
      status: "complete"
    },
    "preview-notch": {
      title: "노치",
      doc: "상단 노치 장식 요소.",
      previewSummary: ["노치", "상단 장식"],
      flowSteps: [{ title: "노치 표시", desc: "상단 중앙 노치 렌더" }],
      diagram: 'flowchart TB\n  A["노치"]',
      codeFiles: [],
      status: "complete"
    },
    "preview-content": {
      title: "스크린 콘텐츠",
      doc: "스크린 내부에 카드 정보 컴포넌트들을 렌더링하는 영역.",
      previewSummary: ["대시보드 카드", "카드 리스트", "카드 개수 표시"],
      flowSteps: [{ title: "콘텐츠 렌더", desc: "스크롤 가능한 콘텐츠 출력" }],
      diagram: 'flowchart TB\n  A["스크린 콘텐츠"] --> B["컴포넌트들"]',
      codeFiles: [],
      status: "complete"
    },
    dashboard: {
      title: "내 카드 관리 대시보드",
      doc:
        "상단 요약 배너로, 총 이용 한도와 결제 예정 금액을 계산해 보여준다.",
      previewSummary: [
        "상단 요약 배너: 내 카드 관리 대시보드",
        "보유 카드 리스트: 카드 3장",
        "카드 개수 표시: 총 3장"
      ],
      flowSteps: [
        { title: "총 이용 한도", desc: "cards 합계 계산" },
        { title: "결제 예정 금액", desc: "billingAmount 합계 계산" }
      ],
      diagram:
        'flowchart TB\n' +
        '  A["cards"] --> B["totalLimit"]\n' +
        '  A --> C["totalBilling"]\n' +
        '  B --> D["요약 배너"]\n' +
        '  C --> D["요약 배너"]',
      codeFiles: [
        {
          name: "src/app/page.tsx",
          content:
            "const totalLimit = cards.reduce((sum, c) => sum + c.limit, 0);\n" +
            "const totalBilling = cards.reduce((sum, c) => sum + c.billingAmount, 0);\n\n" +
            "<section className=\"card-shadow bg-gradient-to-r from-shinhancard-blue to-blue-500 p-5 text-white\">\n" +
            "  <h1>내 카드 관리 대시보드</h1>\n" +
            "  <p>총 이용 한도: {formatCurrencyKRW(totalLimit)}</p>\n" +
            "  <p>총 결제 예정 금액: {formatCurrencyKRW(totalBilling)}</p>\n" +
            "</section>"
        }
      ],
      status: "complete"
    },
    "dashboard-card": {
      title: "대시보드 카드",
      doc: "대시보드 요약 정보를 담는 카드 컨테이너.",
      previewSummary: ["요약 카드", "헤더 + 지표 그리드"],
      flowSteps: [{ title: "카드 렌더", desc: "대시보드 요약 표시" }],
      diagram: 'flowchart TB\n  A["대시보드 카드"]',
      codeFiles: [],
      status: "complete"
    },
    "dashboard-header": {
      title: "대시보드 헤더",
      doc: "대시보드 제목/설명과 버전 배지를 표시한다.",
      previewSummary: ["제목", "설명", "버전 배지"],
      flowSteps: [{ title: "헤더 표시", desc: "타이틀/버전 렌더" }],
      diagram: 'flowchart LR\n  A["헤더"] --> B["버전 배지"]',
      codeFiles: [],
      status: "complete"
    },
    "dashboard-metrics": {
      title: "요약 지표 그리드",
      doc: "총 이용 한도/결제 예정/정상·일시정지 카드 수를 그리드로 배치한다.",
      previewSummary: ["4개 지표 카드", "2x2 그리드"],
      flowSteps: [{ title: "지표 렌더", desc: "각 지표 카드 표시" }],
      diagram: 'flowchart TB\n  A["요약 지표 그리드"] --> B["지표 카드들"]',
      codeFiles: [],
      status: "complete"
    },
    "metric-total-limit": {
      title: "총 이용 한도",
      doc: "전체 카드의 이용 한도 합계를 표시한다.",
      previewSummary: ["총 이용 한도"],
      flowSteps: [{ title: "한도 합산", desc: "카드 한도 합계 표시" }],
      diagram: 'flowchart TB\n  A["총 이용 한도"]',
      codeFiles: [],
      status: "complete"
    },
    "metric-total-billing": {
      title: "총 결제 예정 금액",
      doc: "전체 카드의 결제 예정 금액 합계를 표시한다.",
      previewSummary: ["총 결제 예정 금액"],
      flowSteps: [{ title: "결제 합산", desc: "결제 예정 합계 표시" }],
      diagram: 'flowchart TB\n  A["총 결제 예정 금액"]',
      codeFiles: [],
      status: "complete"
    },
    "metric-active-cards": {
      title: "정상 이용 카드",
      doc: "정상 이용 중인 카드 수를 표시한다.",
      previewSummary: ["정상 이용 카드 수"],
      flowSteps: [{ title: "정상 카드 카운트", desc: "정상 카드 수 표시" }],
      diagram: 'flowchart TB\n  A["정상 이용 카드"]',
      codeFiles: [],
      status: "complete"
    },
    "metric-paused-cards": {
      title: "일시정지 카드",
      doc: "일시정지 상태 카드 수를 표시한다.",
      previewSummary: ["일시정지 카드 수"],
      flowSteps: [{ title: "일시정지 카드 카운트", desc: "일시정지 수 표시" }],
      diagram: 'flowchart TB\n  A["일시정지 카드"]',
      codeFiles: [],
      status: "complete"
    },
    "card-list": {
      title: "보유카드 리스트",
      doc:
        "cards 배열을 순회해 카드 요약 카드 3장을 렌더링한다.",
      previewSummary: [
        "상단 요약 배너: 내 카드 관리 대시보드",
        "보유 카드 리스트: 카드 3장",
        "카드 개수 표시: 총 3장"
      ],
      flowSteps: [
        { title: "카드 목록 렌더", desc: "cards.map으로 카드 카드 생성" }
      ],
      diagram:
        'flowchart LR\n' +
        '  A["cards[]"] --> B["카드 요약 카드"]',
      codeFiles: [
        {
          name: "src/components/CardList.tsx",
          content:
            "return (\n" +
            "  <section aria-label=\"보유 카드 목록\" className=\"space-y-3\">\n" +
            "    <div className=\"flex items-baseline justify-between\">\n" +
            "      <h2>보유 카드</h2>\n" +
            "      <p>총 {cards.length}장의 카드가 등록되어 있습니다.</p>\n" +
            "    </div>\n" +
            "    <div className=\"grid gap-4 md:grid-cols-3\">\n" +
            "      {cards.map((card) => (\n" +
            "        <CardSummaryCard key={card.id} card={card} />\n" +
            "      ))}\n" +
            "    </div>\n" +
            "  </section>\n" +
            ");"
        }
      ],
      status: "complete"
    },
    "card-list-card": {
      title: "리스트 카드",
      doc: "보유 카드 리스트를 감싸는 카드 컨테이너.",
      previewSummary: ["리스트 컨테이너"],
      flowSteps: [{ title: "리스트 렌더", desc: "리스트 카드 영역 표시" }],
      diagram: 'flowchart TB\n  A["리스트 카드"]',
      codeFiles: [],
      status: "complete"
    },
    "card-list-header": {
      title: "리스트 헤더",
      doc: "보유 카드 리스트 제목과 카드 개수를 표시한다.",
      previewSummary: ["리스트 제목", "총 3장"],
      flowSteps: [{ title: "헤더 표시", desc: "제목/개수 출력" }],
      diagram: 'flowchart LR\n  A["리스트 헤더"]',
      codeFiles: [],
      status: "complete"
    },
    "card-1": {
      title: "카드1",
      doc:
        "첫 번째 카드 요약 카드. 카드명, 한도, 결제 예정 금액을 표시한다.",
      previewSummary: [
        "상단 요약 배너: 내 카드 관리 대시보드",
        "보유 카드 리스트: 카드 3장",
        "카드 개수 표시: 총 3장"
      ],
      flowSteps: [
        { title: "카드 표시", desc: "카드명/끝자리/한도 출력" }
      ],
      diagram:
        'flowchart TB\n' +
        '  A["카드1"] --> B["카드 요약 카드"]',
      codeFiles: [
        {
          name: "src/constants/mockData.ts",
          content:
            "export const cards: Card[] = [\n" +
            "  {\n" +
            "    id: \"1\",\n" +
            "    name: \"신한 Deep Dream 카드\",\n" +
            "    limit: 3000000,\n" +
            "    billingAmount: 1250000,\n" +
            "    status: \"active\"\n" +
            "  }\n" +
            "];"
        }
      ],
      status: "complete"
    },
    "card-2": {
      title: "카드2",
      doc:
        "두 번째 카드 요약 카드. 카드명, 한도, 결제 예정 금액을 표시한다.",
      previewSummary: [
        "상단 요약 배너: 내 카드 관리 대시보드",
        "보유 카드 리스트: 카드 3장",
        "카드 개수 표시: 총 3장"
      ],
      flowSteps: [
        { title: "카드 표시", desc: "카드명/끝자리/한도 출력" }
      ],
      diagram:
        'flowchart TB\n' +
        '  A["카드2"] --> B["카드 요약 카드"]',
      codeFiles: [
        {
          name: "src/constants/mockData.ts",
          content:
            "{\n" +
            "  id: \"2\",\n" +
            "  name: \"신한 The Best-F 카드\",\n" +
            "  limit: 5000000,\n" +
            "  billingAmount: 2750000,\n" +
            "  status: \"active\"\n" +
            "}"
        }
      ],
      status: "complete"
    },
    "card-3": {
      title: "카드3",
      doc:
        "세 번째 카드 요약 카드. 카드명, 한도, 결제 예정 금액을 표시한다.",
      previewSummary: [
        "상단 요약 배너: 내 카드 관리 대시보드",
        "보유 카드 리스트: 카드 3장",
        "카드 개수 표시: 총 3장"
      ],
      flowSteps: [
        { title: "카드 표시", desc: "카드명/끝자리/한도 출력" }
      ],
      diagram:
        'flowchart TB\n' +
        '  A["카드3"] --> B["카드 요약 카드"]',
      codeFiles: [
        {
          name: "src/constants/mockData.ts",
          content:
            "{\n" +
            "  id: \"3\",\n" +
            "  name: \"신한 체크카드 S-Line\",\n" +
            "  limit: 1000000,\n" +
            "  billingAmount: 350000,\n" +
            "  status: \"paused\"\n" +
            "}"
        }
      ],
      status: "complete"
    },
    "card-count": {
      title: "카드 개수 표시",
      doc:
        "보유 카드 개수를 텍스트로 표시한다.",
      previewSummary: [
        "상단 요약 배너: 내 카드 관리 대시보드",
        "보유 카드 리스트: 카드 3장",
        "카드 개수 표시: 총 3장"
      ],
      flowSteps: [
        { title: "카드 개수 계산", desc: "cards.length 표시" }
      ],
      diagram:
        'flowchart LR\n' +
        '  A["cards.length"] --> B["개수 텍스트"]',
      codeFiles: [
        {
          name: "src/components/CardList.tsx",
          content:
            "<p className=\"text-xs text-slate-500\">\n" +
            "  총 {cards.length}장의 카드가 등록되어 있습니다.\n" +
            "</p>"
        }
      ],
      status: "complete"
    },
    "card-count-card": {
      title: "개수 표시 카드",
      doc: "카드 개수를 강조 표시하는 카드 컨테이너.",
      previewSummary: ["카드 개수 강조"],
      flowSteps: [{ title: "개수 표시", desc: "3장 표시" }],
      diagram: 'flowchart TB\n  A["개수 표시 카드"]',
      codeFiles: [],
      status: "complete"
    }
  }
};
