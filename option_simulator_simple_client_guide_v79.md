# 옵션 시뮬레이터 초간단 운영 설명서

> 구버전 문서입니다. 현재 운영 기준은 `option_simulator_backoffice_operation_guide_v80.md`의 백오피스 등록 방식입니다.

## 이것만 기억하면 됩니다

상품마다 아래 폴더 하나를 만들고, 그 안에 이미지와 `simulator.csv`를 같이 올립니다.

```txt
/web/upload/simulator/상품번호/
```

예를 들어 상품번호가 `1034`이면:

```txt
/web/upload/simulator/1034/
```

## 1. 상품번호 확인

상품 상세페이지 주소에서 `product_no` 숫자를 확인합니다.

예:

```txt
product_no=1034
```

이 상품번호는 `1034`입니다.

## 2. 이미지 준비

이미지는 PNG로 준비합니다.

파일명은 영문으로 해주세요.

좋은 예:

```txt
top/maple.png
frame/white.png
seat/black.png
```

피해야 할 예:

```txt
상판 메이플.png
frame white.png
seat(1).png
```

## 3. CSV 생성기 열기

전달받은 파일을 더블클릭합니다.

```txt
option_simulator_csv_generator.html
```

## 4. 상품번호 입력

생성기에서 상품번호를 입력합니다.

예:

```txt
1034
```

## 5. 옵션명 입력

이미지가 바뀌는 옵션명만 입력합니다.

예:

```txt
책상 사이즈
상판 컬러
프레임 컬러
의자 컬러
```

배송 방식, 수량처럼 이미지가 안 바뀌는 옵션은 입력하지 않아도 됩니다.

## 6. 이미지 경로 입력

CSV 생성기의 `image` 칸에는 상품번호 폴더 안의 경로만 적습니다.

예:

```txt
top/maple.png
frame/white.png
seat/black.png
```

## 7. CSV 다운로드

생성기에서 아래 버튼을 누릅니다.

```txt
simulator.csv 다운로드
```

파일명은 반드시 그대로 둡니다.

```txt
simulator.csv
```

## 8. 카페24에 업로드

카페24 관리자에서 파일업로더를 엽니다.

```txt
디자인 > 웹 FTP > 파일업로더 접속
```

아래 폴더를 만듭니다.

```txt
/web/upload/simulator/상품번호/
```

예:

```txt
/web/upload/simulator/1034/
```

그 안에 이미지와 CSV를 올립니다.

예:

```txt
/web/upload/simulator/1034/simulator.csv
/web/upload/simulator/1034/top/maple.png
/web/upload/simulator/1034/frame/white.png
/web/upload/simulator/1034/seat/black.png
```

## 9. 확인

상품 상세페이지에서 확인합니다.

PC:

```txt
상세페이지 아래로 스크롤 > 옵션 시뮬레이터 보기 클릭 > 옵션 변경 확인
```

모바일:

```txt
상세페이지 아래로 스크롤 > 하단 옵션 시뮬레이터 보기 클릭 > 옵션 변경 확인
```

## 자주 나는 실수

| 문제 | 확인할 것 |
| --- | --- |
| 시뮬레이터가 안 보임 | `simulator.csv`가 상품번호 폴더 바로 아래 있는지 확인 |
| 이미지만 안 보임 | CSV의 이미지 경로와 실제 파일명이 같은지 확인 |
| 옵션 바꿔도 이미지가 안 바뀜 | CSV 옵션명과 사이트 옵션명이 같은지 확인 |
| 특정 색상만 안 바뀜 | CSV 옵션값과 사이트 옵션값이 같은지 확인 |

## 최종 예시

상품번호 `1034`의 최종 구조:

```txt
/web/upload/simulator/1034/
  simulator.csv
  top/
    maple.png
    white.png
  frame/
    white.png
    black.png
  seat/
    black.png
    beige.png
```
