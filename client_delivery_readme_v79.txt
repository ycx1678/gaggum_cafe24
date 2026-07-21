가꿈 옵션 시뮬레이터 운영 파일
v79

먼저 볼 파일:

1. 02_simple_upload_guide.md
   - 가장 짧은 운영 설명서입니다.
   - 처음 운영하는 담당자는 이 문서만 먼저 보면 됩니다.

2. 01_csv_generator.html
   - simulator.csv를 만드는 도구입니다.
   - 서버에 설치하는 파일이 아닙니다.
   - 담당자 PC에서 더블클릭해서 사용하면 됩니다.

3. 04_sample_simulator_csv_1034.csv
   - 래더 학원 책상 + ALO체어 세트 상품의 샘플 CSV입니다.
   - 새 상품 등록 시 참고용으로 사용합니다.

기본 운영 흐름:

1. 상품번호를 확인합니다.
2. 카페24 파일업로더에서 아래 폴더를 만듭니다.

   /web/upload/simulator/상품번호/

3. PNG 이미지를 해당 폴더 안에 업로드합니다.
4. 01_csv_generator.html로 simulator.csv를 만듭니다.
5. simulator.csv를 같은 상품번호 폴더에 업로드합니다.
6. 상품 상세페이지에서 옵션을 바꿔 이미지가 바뀌는지 확인합니다.

중요:

- 파일명은 영문 소문자, 숫자, 하이픈을 권장합니다.
- simulator.csv 파일명은 바꾸지 않습니다.
- CSV는 상품번호 폴더 바로 아래에 둡니다.
- 이미지가 바뀌지 않는 옵션은 CSV에 넣지 않아도 됩니다.

예:

/web/upload/simulator/1034/simulator.csv
/web/upload/simulator/1034/top/maple.png
/web/upload/simulator/1034/frame/white.png
/web/upload/simulator/1034/seat/black.png
