# DroneOptAI Frontend

Ứng dụng điều hành drone xây dựng bằng React, TypeScript và Vite.

## UI stack

- Tailwind CSS v4 được tích hợp trực tiếp qua Vite và ánh xạ vào các design token hiện có trong `src/index.css`.
- Các UI primitive theo kiến trúc shadcn/ui nằm trong `src/components/ui` và dùng Radix UI cho hành vi truy cập bàn phím/focus.
- Framer Motion xử lý chuyển trang, menu điều hướng, modal tìm kiếm và chuyển động của màn hình xác thực.
- `src/index.css` là entry stylesheet duy nhất: reset, design token và các style đặc thù của sản phẩm đều được quản lý trong các layer của Tailwind; thư mục stylesheet legacy đã được loại bỏ.

## Chạy dự án

```bash
npm install
npm run dev
```

## Kiểm tra

```bash
npm run lint
npm run build
```

## Cấu trúc chính

```text
src/
  app/          providers và root app
  components/   UI primitives và component dùng chung
  features/     auth, operator và users
  layouts/      layout cấp route
  lib/          utility dùng chung (`cn`)
  routes/       route table và lazy-loaded pages
  services/     API client dùng chung
```

Alias `@/*` trỏ tới `src/*`. Cấu hình shadcn nằm trong `components.json`.
