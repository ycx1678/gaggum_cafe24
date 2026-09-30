# 추가 구성상품 견적 요청 회귀 검증

`fixtures/alumno-693-additional.html`은 2026-09-30 라이브 상품 693에서 읽은 공개 옵션 메타데이터와 선택창이다. 추가 구성상품 691 `헤드레스트 추가`는 단독 상세 페이지가 404이며, 부모 상품의 `add_option_data.option_stock_data`에서 실제 품목 `P0000BAP000A`를 제공한다.

Playwright가 설치된 환경에서 다음 검증을 실행한다. 다른 저장소의 설치본을 사용하면 `PLAYWRIGHT_MODULE`에 `@playwright/test` 절대 경로를 지정할 수 있다. `CHROMIUM_EXECUTABLE`은 이미 설치된 Chromium 실행 파일을 지정할 때만 사용한다.

```bash
node tests/quote-parent-additional.cjs
```

테스트는 실제 견적 요청 경계의 JSON을 검사한다. 외부 네트워크와 실제 견적 생성은 차단하며, 데스크톱과 모바일에서 품목 코드, 추가상품 구분, 부모 연결, 원래 수량과 단가 보존을 확인한다. 불일치 선택값과 진열·판매가 중지된 품목은 미확인 상태로 유지해야 한다.

`QUOTE_PARENT_SCRIPT=.../quote_parent_v188.js`로 실행하면 품목 코드와 부모 연결 누락을 재현한다.
