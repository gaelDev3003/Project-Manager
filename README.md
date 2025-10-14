## 개요

**Project Manager**는 아이디어를 입력하면 **PRD(요구사항 문서)** 초안을 생성하고, **피드백을 반영해 버전 관리**까지 수행하는 **AI 기반 PRD 워크플로우 도구**입니다.  
3-패널 UI(좌: 버전 리스트, 중: 생성/피드백 대화, 우: 인사이트)로 PRD 생성→피드백→버전 비교 흐름을 빠르게 반복할 수 있습니다.

---

## 핵심 기능 요약

- **PRD 생성**  
   → 프로젝트 아이디어 입력 시 LLM을 통해 PRD(JSON/Markdown)를 생성합니다.
- **피드백 반영 & 버전 관리**  
   → 피드백을 적용하면 **새 PRD 버전**이 추가되고, 이전 버전은 그대로 보존됩니다.
- **버전 리스트 & 전문 토글(좌측 패널)**  
   → 한 번 클릭하면 버전 선택, **다시 클릭하면 전문을 토글**하여 전체 내용을 확인할 수 있습니다.  
   → "View Full PRD" 버튼으로 **사이드 패널**에서 전체 PRD를 상세히 볼 수 있습니다.
- **인사이트 패널(우측)**  
   → 각 버전의 `features[]` 등 핵심 메타를 **DB에서 영구 저장/조회**합니다.  
   → "View all"을 누르면 화면 가운데 **모달(창)** 이 열리며, **ESC** 키로 닫을 수 있습니다.
- **URL 동기화**  
   → `?version=<id>`로 현재 선택 버전이 동기화되어 **새로고침/공유 시 복원**됩니다.

---

## 기술 스택 및 환경

| 범주         | 사용 기술                                                                  | 설명                                    |
| ------------ | -------------------------------------------------------------------------- | --------------------------------------- |
| **Frontend** | **Next.js 14(App Router)**, **React 18**, **Tailwind CSS**, **TypeScript** | 3-패널 UI, 버전 리스트/토글, 모달 등    |
| **Backend**  | **Next.js API Routes**                                                     | PRD 생성/피드백 적용 API                |
| **Database** | **Supabase (PostgreSQL + RLS)**                                            | `projects`, `prds`, `prd_features` 저장 |
| **LLM API**  | **OpenAI (예: gpt-4o-mini / gpt-4o)**                                      | PRD/요약/메타 생성                      |
| **Auth**     | **Supabase Auth** *(선택)*                                                 | 사용자별 데이터 접근 제어               |

---

## 로컬 개발 환경 및 실행 가이드

### 1) 프로젝트 클론 & 설치

```bash
git clone https://github.com/gaelDev3003/Project-Manager.git
cd Project-Manager
npm install
```

### 2) 환경 변수 설정

`.env.example`를 참고해 `.env`(또는 `.env.local`) 파일을 만들고 값을 채워주세요.

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY= # server-only. NEVER expose to client or commit to git.

MODEL_PROVIDER=openai # or gemini
OPENAI_API_KEY=
# GEMINI_API_KEY=  # Unused in current implementation

OPENAI_PRD_MODEL=gpt-4o
OPENAI_PRD_TEMPERATURE=0.2

# Optional
REQ_TIMEOUT_MS=10000
```

### 3) DB 준비

- Supabase 프로젝트 생성 후 테이블 준비:
  - `projects`, `prds`, `prd_features`
- RLS 정책을 활성화하고, 사용자별 레코드 접근이 제한되도록 설정하세요.

### 4) 개발 서버 실행

```bash
npm run dev
```

기본 주소: `http://localhost:3000`

---

## 현재 상태(데모 범위)

- 대시보드: 프로젝트 목록 보기와 새 프로젝트 만들기만 제공합니다.
- PRD 만들기와 피드백 반영이 됩니다. 피드백을 적용하면 새 버전이 만들어집니다.
- 왼쪽 패널에서 버전을 한 번 클릭하면 선택, 한 번 더 클릭하면 문서 전문을 펼쳐 볼 수 있습니다. "View Full PRD" 버튼으로 사이드 패널에서 전체 PRD를 상세히 볼 수 있습니다.
- 오른쪽 패널의 인사이트에서 기능 목록을 볼 수 있습니다. **View all** 버튼을 누르면 전체가 모달로 열리며, **ESC** 키로 닫을 수 있습니다.
- 주소에 `?version=<id>`가 유지되어 새로고침해도 같은 버전을 그대로 볼 수 있습니다.

---

## 향후 계획

- **버전 비교 화면**: 두 버전의 차이를 한눈에 볼 수 있게 합니다.
- **문서 품질 점검**: 빠진 항목이나 겹치는/모호한 표현을 찾아서 알려줍니다.
- **작업 목록 추출**: PRD에서 해야 할 일을 자동으로 추출합니다.

---

## 라이선스

이 저장소는 **MIT License**를 사용합니다. 자세한 내용은 `LICENSE` 파일을 확인하세요.
