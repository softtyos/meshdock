# Meshdock Official Landing Page & Commercial Showcase

Trang giới thiệu chính thức và bảng giá thương mại của **Meshdock** (dành cho domain `meshdock.softty.net`).

Được tách biệt hoàn toàn khỏi mã nguồn quản trị máy chủ (`apps/dokploy`), hoạt động độc lập nhưng nằm chung trong monorepo để tiện đồng bộ và quản lý.

## 🚀 Chạy ở môi trường Development

Từ thư mục gốc dự án:

```bash
pnpm --filter=@meshdock/landing run dev
```

Mở trình duyệt tại [http://localhost:3005](http://localhost:3005) để xem trang Landing Page.

## 📦 Build cho Production

```bash
pnpm --filter=@meshdock/landing run build
pnpm --filter=@meshdock/landing run start
```

## 🐳 Triển khai Docker cho domain `meshdock.softty.net`

```bash
docker build -t softtynet/meshdock-landing:latest -f apps/landing/Dockerfile .
docker run -d -p 3005:3005 --name meshdock-landing softtynet/meshdock-landing:latest
```
