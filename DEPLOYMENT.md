# 가꿈 Cafe24 skin16 배포

이 문서는 `gaggum.co.kr`의 Cafe24 skin16만 다룬다. 백오피스·보증서 앱은 별도 저장소 `FlashStudio-KR/gaggum-cert`와 IWINV VPS `49.247.206.137:/srv/gaggum-cert`에서 Docker로 배포한다. 스킨 변경 때문에 VPS를 재배포하지 않는다.

## 1. 배포 대상

| 항목 | 값 |
| --- | --- |
| 소스 정본 | `ycx1678/gaggum_cafe24` |
| 라이브 원격 루트 | Cafe24 FTP `/sde_design/skin16` |
| 공개 도메인 | `https://gaggum.co.kr` |
| 기본 배포 경로 | GitHub-hosted Actions runner → Cafe24 passive FTP |
| 백엔드와의 관계 | 완전히 별도 배포 |

`code.flashstudio.kr`, IWINV 백오피스 IP, `gaggum-cert/deploy/deploy.sh`는 skin16 배포 대상이 아니다. 이 저장소에는 실제 자격정보를 저장하지 않는다.

## 2. 변경 준비

1. 최신 `main`의 깨끗한 클론에서 독립 브랜치를 만든다.
2. 이번 요청에 포함된 파일만 수정한다. 다른 세션의 변경을 합치거나 전체 스킨을 일괄 업로드하지 않는다.
3. JS/CSS는 기존 버전을 덮어쓰기보다 새 버전 파일을 추가한다.
4. 해당 HTML 또는 partial의 참조를 새 파일명으로 바꾼다. import chain을 따라 실제 참조 파일을 확인한다.
5. `git diff --check`, JS `node --check`, 참조 횟수, 신규 파일 SHA-256을 확인한다.
6. 변경을 커밋하고 정확한 소스 커밋 SHA를 배포 워크플로에 고정한다.

공용 CSS를 배포할 때는 `AGENTS.md`의 cache-busting 규칙에 따라 `layout/basic/main.html`의 버전과 업로드 번들 버전을 함께 올린다.

## 3. 자동 배포

2026-08-04에 검증된 자동화 경로는 private emergency runner `ycx1678/gaggum-cafe24-emergency-20260804`다. 평소에는 archive 상태이며 FTP secrets가 없어야 한다.

배포할 때만 다음 순서를 따른다.

1. runner 저장소를 임시 unarchive한다.
2. Actions secrets `CAFE24_FTP_HOST`, `CAFE24_FTP_USERNAME`, `CAFE24_FTP_PASSWORD`를 설정한다.
3. 워크플로가 이 저장소의 정확한 소스 커밋 SHA를 checkout하도록 고정한다.
4. 아래의 백업·업로드·재다운로드 검증 절차가 워크플로에 포함됐는지 확인한다.
5. `workflow_dispatch`로 한 번 실행하고 완료될 때까지 상태를 확인한다.
6. 성공 또는 실패 확인 후 FTP secrets를 삭제하고 runner 저장소를 다시 archive한다.

소스 저장소가 public인 동안은 별도 source token이 필요 없다. private으로 전환되면 최소 권한의 read token을 별도 secret으로 사용한다.

## 4. 워크플로 안전 조건

워크플로는 다음 순서를 지켜야 한다.

1. 소스 파일 존재 여부, SHA-256, JS 문법과 새 참조 횟수를 검사한다.
2. 라이브의 이전 버전 자산과 변경할 참조 파일을 runner 임시 디렉터리에 다운로드한다.
3. 각 참조 파일에서 구버전은 정확히 한 번, 신버전은 0번인지 확인한다. 이미 신버전이 정확히 한 번 있으면 idempotent 성공으로 처리할 수 있다. 그 외 상태에서는 배포를 중단한다.
4. 신규 versioned 자산을 먼저 업로드하고 다시 내려받아 원본과 `cmp`한다.
5. 현재 라이브에서 내려받은 참조 파일에 문자열 하나만 치환해 업로드한다. 저장소의 오래된 전체 HTML을 그대로 덮어쓰지 않는다.
6. 참조 파일도 다시 내려받아 배포본과 `cmp`한다.
7. 참조 업로드 중 실패하면 모든 참조 파일을 백업본으로 복구한다. 신규 versioned 자산은 참조되지 않으므로 남아 있어도 라이브 동작에 영향이 없다.
8. 배포 전 백업을 Actions artifact로 최소 7일 보존한다.

같은 파일명을 덮어쓴 배포는 Cafe24 optimizer가 이전 번들을 유지할 수 있다. 이 경우 `layout/basic/layout.html`의 현재 바이트를 내려받아 동일 바이트로 다시 업로드해 timestamp를 갱신하고, 재다운로드 비교로 내용이 바뀌지 않았음을 확인한다. 가능하면 새 versioned 파일명과 참조 교체를 우선한다.

## 5. 라이브 검증

배포 완료는 FTP 업로드 성공만으로 판정하지 않는다.

1. 신규 자산 URL `https://gaggum.co.kr/<asset-path>`가 HTTP 200인지 확인한다.
2. 공개 자산을 내려받아 배포 소스와 SHA-256이 같은지 확인한다.
3. 영향을 받은 실제 페이지를 cache-busting query와 함께 요청한다.
4. Cafe24는 사용자 JS/CSS를 `/ind-script/optimizer_user.php`로 묶을 수 있으므로 페이지가 참조하는 최신 optimizer bundle을 내려받아 변경된 selector, class, 문구 또는 함수가 실제로 포함됐는지 확인한다.
5. 로그인, 장바구니 상품, 특정 옵션처럼 조건이 필요한 UI는 실제 브라우저에서 데스크톱과 모바일을 확인한다.

## 6. 수동 FileZilla 대안

GitHub-hosted runner를 사용할 수 없을 때만 수동 배포한다.

1. FileZilla에서 변경할 라이브 파일을 먼저 로컬 백업한다.
2. 신규 versioned 자산을 원격 동일 경로에 업로드한다.
3. 현재 라이브에서 내려받은 HTML/partial에 필요한 참조만 수정해 업로드한다.
4. 업로드한 모든 파일을 다시 내려받아 원본과 비교한다.
5. 5절의 공개몰 검증을 동일하게 수행한다.

로컬 또는 서버에서 FTP 로그인이 성공해도 파일 전송용 passive high port가 막혀 전송이 실패할 수 있다. `230 logged in`만으로 배포 가능하다고 판단하지 않는다.

## 7. 롤백

1. 백업한 참조 파일을 원래 경로에 다시 업로드한다.
2. 재다운로드 후 백업본과 비교한다.
3. 공개 페이지의 optimizer bundle이 이전 코드로 돌아왔는지 확인한다.
4. 신규 versioned 자산은 삭제하지 않아도 된다. 참조가 제거되면 사용되지 않으며, 삭제보다 보존이 복구에 안전하다.
