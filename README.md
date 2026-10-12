# Học HSK

Web học tiếng Trung cá nhân: xem từ HSK 1-6, flashcard Leitner, học theo chủ đề, học theo ngữ cảnh (điền từ), sao lưu tiến độ. Giao diện tiếng Việt, sáng/tối. Không cần tài khoản; tiến độ lưu trong trình duyệt.

Thuần HTML/CSS/JS, không cần build. Mở `index.html` hoặc đưa lên GitHub Pages.

## Nguồn dữ liệu
- Danh sách từ HSK 3.0: [ivankra/hsk30](https://github.com/ivankra/hsk30) (giấy phép MIT, xem `data/raw/LICENSE`).
- Nghĩa tiếng Việt, âm Hán-Việt, câu ví dụ và chủ đề do AI tạo, chỉ mang tính tham khảo; có thể có sai sót.

## Cấu trúc
- `index.html`, `css/`, `js/`: giao diện và logic.
- `data/hsk1-6.js`: danh sách từ; `data/content/hsk*.js`: nội dung AI theo cấp; `data/topics.js`: 22 chủ đề.
- `data/content/src/`: các lô nguồn (JSON) dùng để tạo `data/content/hsk*.js`.
