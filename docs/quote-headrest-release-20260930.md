# 헤드레스트 추가 구성상품 견적 수정 및 라이브 배포

2026-09-30, Cafe24 라이브 `/sde_design/skin16`, `https://gaggum.co.kr`에 반영했다.

## 원인과 수정

알룸노체어 Ver.3(상품 693)의 추가 구성상품 691 `헤드레스트 추가`는 단독 상품 상세가 HTTP 404다. 부모 상품의 공개 `add_option_data`에는 `option_value_mapper`가 없고, `option_stock_data`가 실제 품목 `P0000BAP000A`와 선택값 `헤드레스트 추가`를 제공한다. v188은 mapper만 조회해 주문 품목 코드를 복원하지 못했다. 원래 장바구니에서 이름 기반 추가상품 분류도 false여서 부모 연결이 빠졌다.

v189는 mapper가 없는 조합형 추가상품에 한해 부모 상품의 재고 옵션 데이터를 읽는다. 실제 상품 코드, 정확한 선택값, 진열 및 판매 허용 상태를 확인하고, 일치하는 품목과 부모가 각각 하나일 때만 품목 코드와 추가상품/부모 연결을 저장한다. 수량, 단가와 이미지는 보존한다. 기존 mapper 경로와 백엔드의 필수 품목 코드 검증은 유지한다.

## 검증

- 수정 전 v188: 실제 공개 메타데이터를 사용하는 견적 요청 경계 재현에서 691의 `variantCode`, `parentSortOrder`가 누락되고 `isAdditional=false`여서 실패했다.
- 수정 후 v189: 데스크톱 및 모바일에서 정상 조합, 불일치 선택값, 숨김 품목, 판매중지 품목 등 총 8건 통과.
- 라이브 공개 JS를 다시 내려받아 동일 8건 통과. 실제 견적 생성과 알림 발송은 테스트에서 차단했다.
- JS 문법 및 diff 검사 통과. 백오피스 운영 버전 기준 type-check/lint 통과. 별도로 실행한 design:check는 기존 `src/app/layout.tsx`의 em-dash 검사로 실패했으며, 이번 작업에는 백오피스/UI 소스 변경이 없다.

## 배포와 백업

FTP 배포 secrets가 없어서 저장된 운영자 계정으로 Cafe24 관리자 파일업로더를 사용했다. GitHub Actions와 VPS 배포는 실행하지 않았다. 배포 전 관리자 다운로드로 원본을 보관하고, 원본에서 정확히 한 번 나타나는 문자열만 교체했다. 배포 직전에 원본이 그대로인지 다시 확인했다.

백업, 배포본, 업로드 후 원격 다운로드는 작업 환경의 `/home/yhchoi/.local/share/gaggum-cafe24-deploy/20260930-headrest/`에 보관했다. 저장소의 전체 HTML을 업로드하지 않았다.

| 원격 파일 | 배포 후 SHA-256 |
| --- | --- |
| `nd/js/quote_parent_v189.js` | `b46c39627381dc3671b9cac964a775ecd4ca08fb3aa35188f556437ac8984a3e` |
| `layout/basic/layout.html` | `f1eae7e413dbcf4df496fca6060149bcee94b0341eb8d7f10e81c8ed6b792597` |
| `layout/basic/main.html` | `f068f3fe368aefc2c5fa68bea67d8912e63fd1e17f4959f60667ae8cf27a7325` |

신규 JS를 먼저 업로드하고 공개 HTTP 200 및 바이트 일치를 확인한 뒤 layout의 v188 참조를 v189로 교체했다. main의 cache-busting 문자열도 `20260930v186`으로 변경했다. 세 파일 모두 관리자에서 다시 내려받아 배포본과 바이트 일치를 확인했다. 실제 상품 693 및 장바구니 페이지의 직접 script 참조가 v189로 바뀌었으며, 이 자산은 optimizer 번들 대신 직접 로드된다.

롤백은 `backup/layout/basic/layout.html`과 `backup/layout/basic/main.html`을 같은 경로로 복원하고 재다운로드 비교 및 공개 참조 검증을 수행한다. 이전 JS v188은 그대로 보존했다.

기존에 실패한 요청은 장바구니를 새로고침하고 다시 접수하면 된다. 이미 저장된 견적의 품목이나 운영 DB는 이번 배포로 수정하지 않았다.
