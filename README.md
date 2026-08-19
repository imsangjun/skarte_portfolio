# skARTe Film — 포트폴리오 사이트

인천 기반 영상 제작사 **skARTe Film(skartefilms)** 의 포트폴리오/아카이브 사이트입니다.
정적 사이트(빌드 불필요) + Supabase(works 데이터 클라우드 저장)로 구성됩니다.

---

## 이번 업데이트 내용

- 화면에 표시되는 브랜드명 **skARTe → skARTe Film** 전체 변경
  (도메인 `skarte.kr`, 내부 저장소 키, 스키마 `@id`, 서브브랜드 토큰 `skartefilms` 는 그대로 유지)
- 연락처 갱신: 전화 **010 5949 0686**, 인스타그램 **@skartefilm**(실제 링크), 유튜브 소셜 링크 삭제
  (쇼릴/배경 유튜브 영상 embed 는 유지됨)
- **About 페이지** 본문 전체 작성 (회사 소개 + 로고 철학 + Contact)
- **Supabase 연동** 추가 — 관리자가 영상/설명을 저장하면 재배포 없이 모든 방문자에게 즉시 반영

---

## 1. GitHub 업로드

이 폴더에서:

```bash
git init
git add .
git commit -m "Rebrand to skARTe Film + Supabase 연동 + About 페이지 작성"
git branch -M main
git remote add origin https://github.com/<본인계정>/<레포이름>.git
git push -u origin main
```

> ⚠️ 반드시 **이 프로젝트 폴더 안에서** `git add .` 를 실행하세요.
> (홈 디렉터리에서 실행하면 시스템 파일이 통째로 스테이징됩니다.)

---

## 2. Vercel 배포

1. vercel.com → **Add New → Project** → 위 GitHub 레포 Import
2. 설정 (정적 사이트라 별도 빌드 없음):
   - **Framework Preset:** Other
   - **Build Command:** 비워둠 (없음)
   - **Output Directory:** ./ (루트)
3. **Deploy** 클릭 → 이후 git push 마다 자동 재배포

vercel.json 에 clean URL, www→apex 리다이렉트, /works/ad 등 단축경로가 이미 설정되어 있습니다.

---

## 3. Supabase 설정 (영상·설명 관리 DB)

영상 링크와 카테고리/설명을 관리자 페이지에서 저장하면 클라우드(Supabase)에 저장되어
**모든 방문자에게 즉시 반영**됩니다.

### (1) 프로젝트 생성
- supabase.com → New project → Region **Seoul (ap-northeast-2)** 권장

### (2) 테이블 + 사진 저장소 생성
- 대시보드 → **SQL Editor** → `supabase/schema.sql` 내용 전체 붙여넣고 **RUN**
- site_data 테이블 + 보안정책(RLS) 생성 (누구나 읽기, 로그인 사용자만 쓰기)
- 사진 업로드용 **photos** Storage 버킷 + 정책도 같은 파일에서 함께 생성됩니다
  (권한 오류가 나면 대시보드 → **Storage → New bucket** 에서 이름 `photos`,
  **Public bucket** 체크로 만든 뒤 Policies 탭에 같은 정책을 추가하세요)

### (3) 키 입력
- 대시보드 → **Project Settings → API** 에서 Project URL 과 anon public 키 복사
- 루트의 **supabase.js** 를 열어 상단 두 값을 교체:
  ```js
  window.SKARTE_SUPABASE = {
    url:  "https://여기-본인-ref.supabase.co",
    anon: "여기-anon-public-key",
    worksKey: "works"
  };
  ```
- 저장 후 git push → 배포

### (4) 관리자 계정 만들기
- 대시보드 → **Authentication → Users → Add user**
- 이메일/비밀번호 1개 생성 (예: skartefilm@naver.com / 원하는 비밀번호)
- 이 계정으로 /admin 우측 상단에서 **로그인** 후 **☁ 클라우드 저장** 을 눌러야 공개 반영

> anon 키는 공개되어도 안전합니다(읽기 전용). 쓰기는 로그인한 관리자만 가능합니다.

---

## 관리자 페이지 사용법 (/admin)

- **로그인** — Supabase 관리자 계정 로그인 (저장하려면 필수)
- **☁ 클라우드 저장** — 변경 내용을 공개 사이트에 즉시 반영 (재배포 불필요)
- 미리보기 저장 — 이 브라우저에서만 임시 확인
- works.json 다운로드 — 백업용 JSON 내려받기
- JSON 가져오기 — 백업 JSON 불러오기
- 기본값 — 샘플 데이터로 되돌리기

영상 ID는 유튜브 링크를 통째로 붙여넣어도 11자리 ID만 자동 추출됩니다.

---

## 사진 작업 올리기 (/admin → Photography 탭)

영상 카테고리 탭 옆의 **Photography · 사진** 탭에서 관리합니다.
(탭이 없으면 탭 줄 끝의 **+ 사진 갤러리 추가** 를 한 번 누르세요.)

1. **드래그 앤 드롭** — 점선 상자에 사진 파일을 끌어다 놓거나 클릭해서 선택.
   여러 장을 한 번에 올릴 수 있습니다.
2. 브라우저에서 **자동으로 크기를 줄여** 업로드합니다.
   원본 → 긴 변 2400px(본 사진) + 900px(목록 썸네일), JPEG 변환.
   → 원본 20MB 사진도 1MB 안팎으로 줄어 무료 용량 1GB 로 수백 장 저장 가능.
3. 사진마다 **제목 / 설명·참여 파트 / 촬영일** 을 입력하고 ↑ ↓ 로 순서를 바꿉니다.
4. **☁ 클라우드 저장** 을 눌러야 공개 사이트 `/works/photo` 에 반영됩니다.
   (파일 업로드는 즉시 되지만, *목록·제목* 은 저장을 눌러야 공개됩니다.)

- 외부에 이미 올려둔 사진은 **URL로 추가** 로 주소만 붙여넣어도 됩니다.
- **삭제** 를 누르면 Storage 의 이미지 파일도 함께 지워집니다 (되돌릴 수 없음).
- 공개 페이지에서는 사진을 클릭하면 크게 보기(라이트박스)가 열리고,
  ← → 키·스와이프로 넘길 수 있습니다.

---

## 폴더 구조

```
/                 홈 (쇼릴 히어로 + 카테고리 스택)
/about            회사 소개
/contact          연락처
/works/<카테고리>  카테고리별 작업 목록
/works/photo      사진 갤러리 (라이트박스)
/admin            영상/사진/카테고리 관리 (비공개, noindex)
/supabase.js      Supabase 설정 (URL/KEY 입력) + Storage 업로드 헬퍼
/supabase/schema.sql          DB 스키마 + photos 버킷/정책
/works.json       클라우드 미설정 시 사용하는 정적 폴백 데이터
```

사진 데이터는 두 곳에 나뉘어 저장됩니다.
- **이미지 파일** → Supabase Storage `photos` 버킷 (공개 URL)
- **목록·제목·순서** → site_data 의 works JSON 안, `type:"photo"` 카테고리의 `photos` 배열

데이터 우선순위: **Supabase → (브라우저 미리보기) → works.json → 기본값**
