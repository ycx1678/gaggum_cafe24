# 썸네일 이미지 옵션 시뮬레이터 구현 계획

## 기준

- PPT 2~7p의 요구사항은 3D 엔진 렌더링이 아니라, 옵션별 PNG 조각 이미지를 겹쳐 최종 썸네일처럼 보이게 하는 구조가 적합하다.
- Flatpoint 레퍼런스: https://www.flatpoint.co.kr/product/atik-ceramic-soft-table/6319/
- UVI 레퍼런스: https://uvi.gg/product/configurator/
- 레퍼런스 공통점은 상세/구성 화면에서 좌측 프리뷰와 우측 옵션 선택 UI를 제공하고, 선택값에 따라 조합 이미지를 교체하는 방식이다.

## 삽입 위치

- 버튼/모달 마크업: `/product/detail.html`의 상세 메인이미지 영역 `.prd_img_wrap` 안에 `/nd/detail_option_simulator.html` import.
- 썸네일 조합 프리뷰: JS가 상세 이미지 뷰어 `.prd_img_wrap .viewer` 내부에 `.ndSimulatorPreview`를 자동 삽입.
- 스타일: `/nd/css/detail_option_simulator.css`
- 상품별 옵션-이미지 매핑: `/nd/js/detail_option_simulator_data.js`
- 동작 로직: `/nd/js/detail_option_simulator.js`

## 화면 설계

- 데스크톱
  - 상세 메인이미지 영역 좌상단에 작은 CTA 버튼 노출.
  - 옵션 선택 또는 CTA 클릭 시 상세 메인이미지 위치에서 조합 프리뷰를 확인.
  - CTA 클릭 시 보조 확인용 모달 노출.
  - 모달 좌측은 큰 조합 프리뷰, 우측은 옵션 그룹별 버튼/컬러칩.
  - 실제 상품 옵션을 변경하면 왼쪽 상세 썸네일 영역이 PNG 조합 프리뷰로 바뀐다.

- 모바일
  - 기존 모바일 상세 구조처럼 상단은 썸네일, 하단은 옵션 선택.
  - X 버튼을 누르면 조합 레이어가 닫히고 기본 상세 썸네일로 복귀.
  - 옵션을 다시 선택하면 조합 레이어가 다시 열린다.

## PNG 이미지 준비 방식

- 권장 경로: `/nd/images/simulator/{product_no}/`
- 래더-알로 샘플 경로: `/nd/images/simulator/ladder-allo/`
- 현재 래더-알로 파일은 `top / seat / frame` 3개 영문 폴더로 반영되어 있으며, 64개 PNG 모두 `1920x1920` 캔버스로 통일되어 있다.
- FileZilla/Cafe24 업로드 안정성을 위해 스킨에 들어가는 이미지 경로와 파일명은 영문 소문자/하이픈으로 정리한다.
- 권장 파일명:
  - `base.png`: 고정 배경 또는 그림자
  - `top-oak.png`, `top-walnut.png`: 상판 컬러 레이어
  - `frame-black.png`, `frame-white.png`: 프레임 레이어
  - `chair-blue.png`, `chair-cream.png`: 의자 레이어
- 모든 PNG는 같은 캔버스 크기와 같은 기준점으로 export해야 한다.
- 투명 배경 PNG로 받아야 레이어 교체가 자연스럽다.
- 원본은 고해상도로 받아도 되지만, 화면에서는 `.ndSimulatorPreview__stage` 안에서 `object-fit: contain`으로 축소되어 레이어 밖으로 커지지 않게 처리한다.
- 래더-알로 레이어 순서는 `프레임(order 0) → 상판(order 1) → 좌판(order 2)`이며, 프레임은 항상 가장 하단 레이어로 둔다.

## 데이터 입력

`/nd/js/detail_option_simulator_data.js`의 `window.ND_OPTION_SIMULATOR.products`에 상품번호별 설정을 추가한다.

```js
"123": {
    showOnLoad: true,
    baseImage: "/nd/images/simulator/123/base.png",
    groups: [
        {
            key: "topColor",
            label: "상판 컬러",
            aliases: ["상판색상", "상판 색상"],
            optionIndex: 1,
            layer: "top",
            options: [
                { value: "oak", label: "오크", matchLabels: ["오크"], image: "/nd/images/simulator/123/top-oak.png", swatch: "#c8a36f" },
                { value: "walnut", label: "월넛", matchLabels: ["월넛"], image: "/nd/images/simulator/123/top-walnut.png", swatch: "#6a4329" }
            ]
        }
    ]
}
```

## 테스트

- 실제 상품 설정 전에는 상세페이지 URL에 `nd_simulator_demo=1` 파라미터를 붙여 데모 모드를 확인한다.
- 실제 PNG를 받은 뒤에는 상품번호 설정을 추가하고, 기존 Cafe24 옵션 버튼 선택과 조합 프리뷰가 동시에 바뀌는지 확인한다.
