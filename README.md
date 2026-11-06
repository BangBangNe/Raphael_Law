# Raphael × Law

Trang giới thiệu yumeship **Raphael Dominick** (OC) × **Trafalgar Law** (One Piece), có hai phiên bản: Ver. Nam và Ver. Nữ, mỗi bản một cốt truyện.

## Xem trang

Mở `index.html` bằng trình duyệt, hoặc bật GitHub Pages (Settings → Pages → Deploy from branch `main`, thư mục `/`).

Thêm `?skip` vào cuối URL để bỏ qua màn loading khi đang sửa.

## Cấu trúc

```
index.html        nội dung trang
css/style.css     màu, font, bố cục (đổi màu chủ đạo ở :root)
js/main.js        hiệu ứng, nút đổi phiên bản, đồng hồ, tấm gương, gallery
assets/img/       tranh (.webp)
```

## Sửa nội dung

- Phần chỉ thuộc một phiên bản có `data-ver-only="m"` (Ver. Nam) hoặc `data-ver-only="f"` (Ver. Nữ).
- Tranh: `data-art="assets/img/ten-file"` (không cần đuôi), `data-pos` để chỉnh vị trí cắt ảnh.
- Gallery: copy một khối `<figure>`, đổi `data-art` và `data-tag` (`m`, `f`, `s` = phác thảo).
- Các chỗ có dấu ✎ là phần chưa có nội dung, đang chờ điền (chủ yếu là cốt truyện Ver. Nữ).

Art © owner · Trafalgar Law © Oda Eiichiro
