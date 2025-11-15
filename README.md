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

---

## taskMaker 통합

**taskMaker**는 PRD에서 작업 목록(tasks.json)을 자동으로 생성하는 라이브러리입니다.

### Path Aliases

프로젝트는 TypeScript path aliases를 사용하여 taskMaker 라이브러리를 참조합니다:

- `@taskmaker/core/*` → `taskMaker/src/core/*`
- `@taskmaker/ai/*` → `taskMaker/src/services/ai/*`
- `@taskmaker/lib/*` → `taskMaker/src/lib/*`

### API 사용법

**POST `/api/tasks/generate`**

PRD 텍스트에서 작업 목록을 생성합니다 (preview-only, 데이터베이스 저장 없음).

**Request Schema (Zod):**
```typescript
{
  prdText: string;  // Required, min 10 characters
  prdName?: string; // Optional
}
```

**Request:**
```json
{
  "prdText": "# 프로젝트 제목\n\n## 개요\n프로젝트 설명...",
  "prdName": "project-name"
}
```

**Response:**
```json
{
  "prdName": "project-name",
  "tasks": {
    "version": "1.0",
    "tasks": [
      {
        "id": "T-001",
        "title": "작업 제목",
        "description": "작업 설명",
        "steps": ["단계 1", "단계 2"],
        "tags": ["role:frontend", "domain:auth"],
        "deps": [],
        "metadata": {
          "priority": "P1",
          "risk": "low",
          "effort_hours": 4,
          "role": "frontend",
          "status": "planned",
          "created": "2024-01-01T00:00:00Z",
          "updated": "2024-01-01T00:00:00Z"
        }
      }
    ]
  }
}
```

**예제:**
```typescript
const response = await fetch('/api/tasks/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prdText: '# My Project\n\n## Overview\n...',
    prdName: 'my-project'
  })
});

const { tasks } = await response.json();
```

### Tasks 탭 기능

프로젝트 상세 페이지에서 **PRD | Tasks** 탭을 통해 PRD 기반 작업 생성을 사용할 수 있습니다.

**사용 방법:**
1. 프로젝트 상세 페이지로 이동
2. **Tasks** 탭 클릭
3. PRD 버전이 선택되어 있으면:
   - 작업이 없으면: **"작업 생성"** 버튼 클릭 → LLM이 PRD에서 작업 목록 생성
   - 작업이 있으면: 작업 목록 표시 + **"재생성"** 버튼으로 새로 생성 가능
4. 생성된 작업을 확인하고 **"저장"** 버튼으로 데이터베이스에 저장

**작업 목록 보기:**
- 왼쪽 패널: 작업 목록 (제목, 우선순위, 단계 수)
- 중앙 패널: 선택된 작업의 상세 정보 (제목, 설명, 단계, 태그, 메타데이터)

**API 엔드포인트:**

**POST `/api/tasks/save`**
- 작업 목록을 데이터베이스에 저장
- Request: `{ projectId: string, prdVersionId: string, tasks: TasksJson }`
- Response: `{ id: string }`

**POST `/api/tasks/by-version`**
- 특정 PRD 버전의 저장된 작업 목록 조회
- Request: `{ projectId: string, prdVersionId: string }`
- Response: `{ tasks: TasksJson | null }`

### Mock 모드 vs Live 모드

**Mock 모드 (기본값):**
- `MODEL_PROVIDER=mock` 또는 환경 변수 미설정
- 실제 AI API 호출 없이 샘플 작업 목록 반환
- 개발 및 테스트에 유용
- API 키 불필요

**Live 모드:**
- `MODEL_PROVIDER=openai` 또는 `MODEL_PROVIDER=anthropic`
- 실제 AI API를 사용하여 작업 목록 생성
- 해당 API 키 필요 (`OPENAI_API_KEY` 또는 `ANTHROPIC_API_KEY`)

**전환 규칙:**
- Mock → Live: `MODEL_PROVIDER` 환경 변수를 `openai` 또는 `anthropic`으로 설정하고 해당 API 키 추가
- Live → Mock: `MODEL_PROVIDER=mock`으로 설정하거나 환경 변수 제거

### 환경 변수

taskMaker 관련 환경 변수는 `.env.example` 파일을 참고하세요.

### 보안 주의사항

- **`SUPABASE_SERVICE_ROLE_KEY`는 서버 전용입니다.** 클라이언트 코드에 노출되거나 Git에 커밋하지 마세요.
- API 키는 `.env` 파일에 저장하고 `.gitignore`에 포함되어 있는지 확인하세요.
- taskMaker adapter (`src/adapters/taskmaker-adapter.ts`)는 서버 전용이며, 클라이언트 번들에 포함되지 않습니다.
- 모든 환경 변수는 서버 측에서만 읽히며, 클라이언트 코드로 전달되지 않습니다.

### 데이터베이스 스키마

**`project_tasks` 테이블** (업데이트됨):
- `id` (UUID, PK)
- `project_id` (UUID, FK to projects)
- `prd_version_id` (UUID, nullable, FK to project_prd_versions) - PRD 버전별 작업 저장
- `tasks_json` (JSONB) - taskMaker의 `TasksJson` 구조를 직접 저장 (기존 `tasks_data`에서 변경)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)
- **인덱스:** `idx_project_tasks_project_prdver` on `(project_id, prd_version_id)`
- **RLS 정책:** 사용자는 자신이 소유한 프로젝트의 작업만 접근 가능 (SELECT/INSERT/UPDATE/DELETE)

**참고:** 현재 API는 preview-only 모드입니다. 향후 버전에서 `project_tasks` 테이블에 작업 목록을 저장하는 기능이 추가될 수 있습니다.

### E2E 테스트

**실행 방법:**
```bash
# Mock 모드 테스트 (항상 실행)
npx playwright test tests/e2e/task-generate.spec.ts --reporter=list

# Live 모드 테스트 (API 키가 설정된 경우에만 실행)
# OPENAI_API_KEY 또는 ANTHROPIC_API_KEY가 설정되어 있으면 자동 실행
```

**테스트 커버리지:**
- Mock 모드: 항상 실행, API 키 불필요
- Live 모드: API 키가 있을 때만 실행 (자동 스킵)
- 입력 검증: 400 에러 케이스 테스트

---

## 향후 계획

- **버전 비교 화면**: 두 버전의 차이를 한눈에 볼 수 있게 합니다.
- **문서 품질 점검**: 빠진 항목이나 겹치는/모호한 표현을 찾아서 알려줍니다.
- **작업 목록 추출**: PRD에서 해야 할 일을 자동으로 추출합니다. ✅ **taskMaker로 구현됨**

---

## 라이선스

이 저장소는 **MIT License**를 사용합니다. 자세한 내용은 `LICENSE` 파일을 확인하세요.
