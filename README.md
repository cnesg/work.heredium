# HEREDIUM OPS

헤레디움 실무자용 콘솔. 메인 화면은 음악(LP)/미술(포스터) 스택형 선택 화면,
`/trends`는 향후 ARTPULSE 트렌드 대시보드를 이식할 자리입니다.

## Supabase 연동 (필수 설정)
1. supabase.com → New project 생성 (무료 플랜으로 충분)
2. 프로젝트 생성 후 좌측 메뉴 **SQL Editor** → `supabase-schema.sql` 내용을 그대로 붙여넣고 Run
3. 좌측 메뉴 **Project Settings → API** 에서 `Project URL`과 `anon public` 키 복사
4. 로컬 테스트용: 이 폴더에 `.env.local` 파일을 만들고 `.env.local.example` 내용을 참고해 값 채우기
5. Vercel 배포용: Vercel 프로젝트 → Settings → Environment Variables 에서
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` 두 개를 동일하게 등록 후 재배포

연동되면 `/assets`, `/sns` 탭의 모든 입력(체크리스트, 드라이브 링크, SNS 채널·기획안·배포 링크)이
Supabase에 저장되어 팀원 누구나 접속하면 같은 내용을 보고 편집할 수 있습니다.

> 지금 설정된 RLS 정책은 "누구나 읽고 쓰기 가능"입니다. 내부 팀만 아는 URL로 쓰는 동안은 괜찮지만,
> 사이트가 외부에 공개되면 정책을 반드시 강화해야 합니다.

## 트렌드 대시보드 + 요약 API 연동
`/trends`(미술/음악)와 카드뉴스 생성기의 "요약" 기능을 쓰려면 아래 키가 필요합니다.

1. **YOUTUBE_API_KEY** (트렌드 목록용, 무료)
   - console.cloud.google.com → 프로젝트 생성 → "YouTube Data API v3" 사용 설정 → 사용자 인증 정보에서 API 키 발급
   - 하루 무료 할당량으로 충분함 (검색 1회당 약 100 단위 소비, 일일 10,000 단위 제공)
2. **요약 API 키 — 아래 중 하나만 설정하면 됨** (`lib/summarize.js`가 자동으로 우선순위대로 사용)
   - `ANTHROPIC_API_KEY` (Claude) — console.anthropic.com에서 발급, 별도 결제 필요. **claude.ai 구독과는 무관한 별개 상품**이라, claude.ai 구독이 끊겨도/없어도 이 키만 있으면 계속 작동합니다.
   - `GOOGLE_API_KEY` (Gemini) — aistudio.google.com에서 발급. **무료 티어가 있어서** 가장 부담 없이 시작하기 좋음. Gemini 앱 구독과도 무관한 별개 상품.
   - `OPENAI_API_KEY` (GPT) — platform.openai.com에서 발급, 별도 결제 필요. ChatGPT Plus 구독과 무관.
   - 세 개 다 안 넣으면 "요약"은 실패하고, 원문 텍스트가 그대로 카드뉴스 생성기에 채워집니다 (수동으로 다듬으면 됨) — 서비스가 완전히 막히진 않습니다.

이렇게 분리해둔 이유: 나중에 어떤 구독을 쓰든(또는 구독이 끊기든) **환경변수 하나만 바꾸면** 코드 수정 없이 요약 기능이 계속 돌아갑니다.

## 뉴스 기반 카드뉴스 (`/content/news`)
cn의 "헤레디움_기사모음" Google 시트(Naver 검색 크롤링, 매일 아침 업데이트)를 그대로 읽어옵니다.
- 시트가 "링크가 있는 모든 사용자"로 공유되어 있어야 CSV export로 읽을 수 있어요
- 시트 ID가 바뀌면 환경변수 `NEWS_SHEET_ID`로 덮어쓸 수 있음 (기본값은 지금 쓰는 시트로 하드코딩됨)
- `분석제외여부` 컬럼이 채워져 있고 N/false류가 아니면 그 행은 목록에서 제외됩니다 — 실제 시트의 값 표기가 다르면 `app/api/news/route.js`의 `isExcluded()` 로직을 맞춰 조정해주세요

## 국내/해외 아트 트렌드 (`/content/trend-domestic`, `/content/trend-global`)
"헤레디움 아카이빙" 시트를 씁니다. `hankyung` 탭(한국경제 arte 뉴스) = 국내, `global` 탭(해외 저명 아트매거진 뉴스) = 해외로 이미 연결해뒀습니다. gid도 기본값으로 코드에 넣어놔서 별도 설정 없이 바로 작동합니다.
- 시트가 바뀌거나 gid가 바뀌면 `ART_TREND_GID_DOMESTIC` / `ART_TREND_GID_GLOBAL` 환경변수로 덮어쓸 수 있음
- 이 시트는 `기사요약` 컬럼에 이미 요약이 들어있어서, 카드뉴스 생성기로 넘길 때 별도 요약 API 호출 없이 바로 씁니다

## 도슨트 기반 카드뉴스 (`/content/cardnews`)
전시별 도슨트는 이제 하드코딩이 아니라 **Supabase에 저장**되고, 전시 상세페이지 → "도슨트 관리"(`/art/[id]/docent`)에서 관리합니다.
- 구글 문서 링크 붙여넣고 "가져오기" (문서가 "링크가 있는 모든 사용자(보기)"로 공유되어 있어야 함), 또는 .txt 업로드, 또는 직접 붙여넣기
- "작가/작품별로 나누기" 누르면 번호 매겨진 항목 기준으로 자동 분할 (예: "1. 조셉 코수스", "3-4. 바스키아") — 이름은 나중에 수정 가능, 불필요한 항목은 삭제 가능
- "저장" 하면 그 전시의 카드뉴스 생성기 드롭다운에 바로 반영됨
- 카드뉴스 생성기(`/content/cardnews`)에서는 전시 선택 → 작가/작품 선택 순으로 고르면 도슨트 전문이 자동으로 채워지고 헤드라인까지 생성됨
- 전시가 바뀌면 새 전시의 도슨트 관리 페이지에서 새로 등록하면 됩니다 — 코드 수정 불필요

## 구조
- `app/page.js` — 메인 화면 (전시/음악회 스택 선택)
- `app/trends/page.js` — 트렌드 대시보드 (자리만 잡아둔 상태)
- `components/HerediumHero.jsx` — 스택 카드 UI 컴포넌트 (샘플 데이터 포함)

## 배포 (GitHub 웹 UI → Vercel)
1. github.com에서 새 저장소 생성 (예: `heredium-ops`)
2. 이 폴더의 파일들을 저장소에 그대로 업로드 (드래그 앤 드롭 가능)
3. vercel.com → New Project → 방금 만든 GitHub 저장소 선택 → Deploy
4. Framework Preset은 Next.js로 자동 인식됨

## 다음 단계
- `components/HerediumHero.jsx`의 `concerts`, `exhibitions` 배열을 Supabase 테이블로 완전 이전 (지금은 lib/data.js 하드코딩 + Supabase의 "meta" 오버레이 병합)
- 트렌드 대시보드: X/릴스/틱톡 등 다른 플랫폼도 추가 (지금은 YouTube만, trend-viewer 참고해서 확장 가능)
- 국내/해외 아트 트렌드 시트 연동 (뉴스 카드뉴스와 같은 패턴으로 구현 가능)
- 카드뉴스 배경 이미지 AI 자동 생성 — 이미지 생성 API(Gemini/Stability 등) 키 발급 후 연결하면 붙일 수 있음
- 나중에 맥미니 이전 시: Supabase → 로컬 Postgres로 데이터 소스만 교체 (heredium_data 테이블 구조 그대로 유지 가능, Storage는 로컬 파일시스템 또는 MinIO로 대체)

- ## gid수정못함

한경 : gid=1232610534

다음 : gid=770325408

문화일보 : gid=1130980641
