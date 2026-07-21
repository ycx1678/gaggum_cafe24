# 백오피스/보증서 작업 준비 메모

작성일: 2026-05-17

## 현재 라이브 링크

- 백오피스 로그인: `https://gaggum-warranty.kimzang12.workers.dev/certificate-admin/login`
- 백오피스 홈: `https://gaggum-warranty.kimzang12.workers.dev/certificate-admin`
- 보증서 목록: `https://gaggum-warranty.kimzang12.workers.dev/certificate-admin/warranties`
- 주문 목록: `https://gaggum-warranty.kimzang12.workers.dev/certificate-admin/orders`
- 주문 상세 예시: `https://gaggum-warranty.kimzang12.workers.dev/certificate-admin/orders/389`
- 알림톡/발송 이력: `https://gaggum-warranty.kimzang12.workers.dev/certificate-admin/notifications`
- 시뮬레이터 옵션: `https://gaggum-warranty.kimzang12.workers.dev/certificate-admin/simulator-options`
- 고객용 보증서 현재 canonical: `https://gaggum-warranty.kimzang12.workers.dev/certificate/{token}`
- 고객용 보증서 예시: `https://gaggum-warranty.kimzang12.workers.dev/certificate/XHWkZ8zzMUI5PQp01zxFlxmR`

## 목표 도메인/링크

- 백오피스 목표 도메인: `https://admin.gaggum.kr`
- 고객용 보증서 목표 도메인: `https://warranty.gaggum.kr`
- 슬랙 논의 기준 고객 링크: `https://warranty.gaggum.kr/{token}`
- 현재 `/{token}` 짧은 링크는 404이므로, `/certificate/{token}`과 `/{token}` 둘 다 살려야 한다.

## 현재 확인된 문제

- 보증서 목록 UI가 보증번호를 `/warranty/{warranty_no}`로 링크하고 있다.
  - 현재 고객용 실제 라우트는 `/certificate/{token}`이다.
  - `warranty_no`는 고객용 접근 토큰이 아니므로 이 링크는 깨진 링크다.
- `GET /api/admin/warranties` 응답에는 `token_id`, `tokenUrl`, `order_id`, `external_order_no`, 알림톡 발송 상태가 없다.
  - 그래서 보증서 목록에서 고객용 링크 복사/열기와 발송 여부 확인이 어렵다.
- 주문 상세 `GET /api/admin/orders/{id}`에는 `tokenUrl`이 있다.
  - 예시 주문 389의 `tokenUrl`: `https://gaggum-warranty.kimzang12.workers.dev/certificate/XHWkZ8zzMUI5PQp01zxFlxmR`
- 현재 주문/알림톡 흐름은 상품 item 단위로 token/dispatch가 생성되어 있다.
  - 슬랙 요청 기준은 주문번호 1개당 고객 URL/알림톡/보증서 1개다.
  - 상품명 표기는 대표 상품명 + `외 N건` 형태로 바꿔야 한다.
- 알림톡 발송 이력은 `/certificate-admin/notifications`에 있고 `pending_spec`, `sent`, `failed` 등 상태가 있다.
  - 이 상태가 보증서 목록/주문 상세에도 보여야 한다.

## 작업 순서

1. 링크 헬퍼 정리
   - `getWarrantyUrl(token)` 같은 공통 함수로 고객용 URL 생성 기준을 통일한다.
   - 운영 기준은 `https://warranty.gaggum.kr/{token}`.
   - 기존 `/certificate/{token}`도 계속 접근 가능하게 유지한다.

2. 고객용 짧은 링크 alias 추가
   - `/{token}` 접근 시 기존 `/certificate/{token}` 화면을 렌더하거나 redirect한다.
   - `certificate-admin`, `api`, `_next`, 정적 파일 경로와 충돌하지 않게 matcher를 제한한다.

3. 보증서 API 확장
   - `GET /api/admin/warranties`에 아래 필드를 추가한다.
   - `order_id`, `external_order_no`, `token_id`, `tokenUrl`, `dispatch_status`, `dispatch_result`, `dispatch_requested_at`, `dispatch_responded_at`, `items_count`, `items_summary`.

4. 보증서 목록 UI 수정
   - 깨진 `/warranty/{warranty_no}` 링크 제거.
   - 고객용 링크 열기/복사 버튼 추가.
   - 주문번호, 대표 상품명 + `외 N건`, 알림톡 상태를 한눈에 보이게 배치.
   - 행 클릭 시 주문 상세 또는 보증서 상세 패널로 연결.

5. 주문 상세 UI 수정
   - 주문 단위 고객 URL을 상단에 노출한다.
   - 알림톡 발송 상태/최근 결과/재발송 액션을 같이 보여준다.
   - 여러 상품이어도 고객에게는 하나의 링크로 보이게 정리한다.

6. 고객용 보증서 페이지 수정
   - 상품명은 대표 상품명 + `외 N건`으로 표기한다.
   - 모바일/데스크톱 모두 `보증서 저장`, `만족도 조사` 버튼이 항상 자연스럽게 보이도록 CTA 영역을 정리한다.

7. Cloudflare/DNS 반영
   - Worker custom domain에 `admin.gaggum.kr`, `warranty.gaggum.kr` 연결.
   - 환경변수에 `ADMIN_BASE_URL`, `WARRANTY_BASE_URL` 또는 동등한 public base URL 기준을 둔다.

## 확인할 테스트

- `https://warranty.gaggum.kr/{token}` 접속 시 고객용 보증서가 떠야 한다.
- 기존 `https://gaggum-warranty.kimzang12.workers.dev/certificate/{token}`도 깨지지 않아야 한다.
- 보증서 목록의 고객용 링크가 실제 고객 페이지로 열린다.
- 보증서 목록에서 알림톡 발송 상태가 주문/고객별로 확인된다.
- 주문번호 하나에 상품이 여러 개여도 고객 링크와 보증서는 1개만 생성된다.
- 고객용 보증서 페이지 CTA가 Safari/Chrome, 모바일/데스크톱에서 잘리지 않는다.
