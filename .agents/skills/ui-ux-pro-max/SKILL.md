---
name: ui-ux-pro-max
description: Bộ tiêu chuẩn thiết kế UI/UX Pro Max dành cho Enterprise Dashboard, PaaS/SaaS Console và Cloud Management Interfaces. Hướng dẫn phân cấp thị giác tinh tế, micro-interactions, dark mode chuẩn chỉnh, Tailwind CSS + shadcn/ui components, typography, layout responsive, zero-clutter principles, và audit UX toàn diện.
when_to_use: "Sử dụng khi thiết kế, xây dựng, tối ưu hóa giao diện (UI), trải nghiệm người dùng (UX), nâng cấp component bảng điều khiển (Dashboard), điều chỉnh màu sắc/typography, hoặc kiểm tra rà soát thẩm mỹ và tính khả dụng của sản phẩm Web."
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
version: 1.0.0
effort: medium
---

# Enterprise UI/UX Design System Pro Max (`ui-ux-pro-max`)

> Quy chuẩn thiết kế và tối ưu trải nghiệm người dùng cao cấp (Tier-1 Enterprise Grade) dành cho các sản phẩm Cloud Dashboard, PaaS Console, System Topology, và Quản trị hạ tầng quy mô lớn.

---

## 1. Triết Lý Thiết Kế "Pro Max" (Design Philosophy)

1. **Zero-Clutter & High Information Density (Mật độ thông tin cao nhưng thoáng đãng):**
   - Loại bỏ hoàn toàn các khung viền dày thô, màu sắc lòe loẹt hoặc văn bản dư thừa.
   - Ưu tiên hiển thị dữ liệu trực quan (charts, metrics, visual status dots) hơn là các đoạn chữ dài dòng.
   - Nguyên tắc *"Content First"*: Dữ liệu quan trọng nhất phải đập vào mắt người dùng trong 3 giây đầu tiên (Server Status, CPU/RAM, Container Count, Network Health).

2. **Visual Hierarchy 4 Cấp (Phân cấp thị giác chuẩn xác):**
   - **Cấp 1 - Hero Vitals**: 4-5 metric cards quan trọng nhất ở hàng trên cùng (Tổng Node, Active Containers, Cluster Health, RAM/CPU Pool).
   - **Cấp 2 - Topology & Map**: Sơ đồ mạng, kiến trúc kết nối trực quan (Traffic Ingress ➔ Swarm Clusters ➔ Services ➔ Databases).
   - **Cấp 3 - Interactive Data Matrix**: Danh sách máy chủ/ứng dụng dạng card hoặc table có search, tag filter, và quick actions.
   - **Cấp 4 - Drawer / Sheet Details**: Toàn bộ cấu hình chuyên sâu, log dòng lệnh, terminal stream nằm trong Slide-over Drawer hoặc Modal để không làm loãng màn hình chính.

3. **Dark Mode Chuẩn Chỉnh (Subtle Elegance):**
   - **Tone nền chủ đạo**: `bg-zinc-950` hoặc `bg-slate-950` (không dùng màu đen thuần `#000000` gây gắt mắt).
   - **Card & Surface**: `bg-zinc-900/60` hoặc `bg-card/70` kết hợp `backdrop-blur-md`.
   - **Border viền siêu mỏng**: Luôn dùng `border border-border/40` hoặc `border-white/[0.08]` để tạo độ sâu mà không gây rối mắt.
   - **Semantic Accents (Màu sắc có chủ đích rõ ràng)**:
     - 🟢 **Emerald (`text-emerald-400 bg-emerald-500/10 border-emerald-500/20`)**: Trạng thái Healthy, Online, Leader, Ready, Active.
     - 🔵 **Blue / Cyan (`text-cyan-400 bg-cyan-500/10 border-cyan-500/20`)**: Tiến trình đang chạy, Ingress, Traffic, Syncing.
     - 🟡 **Amber (`text-amber-400 bg-amber-500/10 border-amber-500/20`)**: Cảnh báo, Quá tải CPU/RAM (>80%), Cần cập nhật.
     - 🔴 **Rose (`text-rose-400 bg-rose-500/10 border-rose-500/20`)**: Offline, Lỗi Container, Service Unhealthy, Crash.

---

## 2. Tiêu Chuẩn Component & Micro-Interactions (shadcn/ui + Tailwind)

### 2.1 Buttons & Action Controls
- **Primary Button**: Tối đa 1 nút nổi bật nhất trên một vùng nhìn (ví dụ: `Tạo Server`, `Triển khai`). Dùng `bg-primary hover:bg-primary/90 shadow-sm`.
- **Secondary / Outline Button**: Cho các tác vụ thông thường (`Kiểm tra cập nhật`, `Làm mới`, `Xuất cấu hình`).
- **Destructive Button (Hành động nguy hiểm)**: Luôn dùng màu `text-rose-400 hover:bg-rose-500/10` và **bắt buộc** có Confirmation Modal 2 bước (yêu cầu gõ lại tên tài nguyên hoặc xác nhận rõ ràng).
- **Loading State**: Khi đang gọi API/mutation:
  ```tsx
  <Button disabled={isPending} className="relative min-w-[120px]">
    {isPending ? (
      <>
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        <span>Đang xử lý...</span>
      </>
    ) : (
      <>
        <Sparkles className="h-4 w-4 mr-2" />
        <span>Áp dụng ngay</span>
      </>
    )}
  </Button>
  ```
  *Quy tắc vàng*: Không làm nhảy kích thước (layout shift) của nút khi đổi từ text sang spinner.

### 2.2 Status Indicators & Live Badges
- Chỉ báo trạng thái thời gian thực phải có nhịp thở (pulse):
  ```tsx
  <div className="flex items-center gap-2">
    <span className="relative flex h-2 w-2">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
    </span>
    <span className="text-xs font-medium text-emerald-400">Swarm Leader</span>
  </div>
  ```

### 2.3 Data Tables & Empty States
- **Sticky Header**: Luôn ghim dòng tiêu đề bảng khi cuộn trang dài.
- **Monospace cho dữ liệu kỹ thuật**: IP address, Port, Docker SHA Digest, Commit hash, Git branch luôn bọc trong thẻ `<code>` hoặc class `font-mono text-xs`.
- **Empty State Chuẩn Chỉnh**: Không bao giờ để một table trống trơn:
  ```tsx
  <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-border/50 rounded-xl">
    <div className="p-3 bg-muted/50 rounded-full mb-3 text-muted-foreground">
      <ServerOff className="h-6 w-6" />
    </div>
    <h3 className="font-semibold text-foreground">Không tìm thấy máy chủ nào</h3>
    <p className="text-sm text-muted-foreground max-w-sm mt-1 mb-4">
      Chưa có nút Swarm Worker nào được kết nối với cụm. Hãy sao chép lệnh join token để gia nhập cụm ngay.
    </p>
    <Button variant="outline" size="sm" onClick={handleCopyJoinToken}>
      <Copy className="h-4 w-4 mr-2" />
      Sao chép Swarm Join Token
    </Button>
  </div>
  ```

### 2.4 Notifications & Feedback Loops (Sonner Toast)
- Thông báo thành công: Ngắn gọn, có icon, mô tả kết quả rõ ràng.
- Thông báo lỗi: Nêu rõ nguyên nhân + gợi ý cách khắc phục (ví dụ: *"Cổng 2377 bị chặn bởi Firewall. Vui lòng mở cổng trên Security Group"* thay vì *"Lỗi không xác định"*).

---

## 3. Bản Đồ Hệ Thống & Topology UX (Topology Visualization)

Khi render sơ đồ mạng / Topology:
1. **Flow rõ ràng theo chiều dọc (Top-to-Bottom Pipeline)**:
   - **Tầng 1**: Ingress & Routers (Traefik, Domain mapping, SSL Certificates).
   - **Tầng 2**: Swarm Cluster Managers & Nodes (Leader, Workers, Rack Host).
   - **Tầng 3**: Application Workloads (Web Apps, APIs, Workers).
   - **Tầng 4**: Databases & Persistent Volumes (PostgreSQL, Redis, S3).
2. **Interactive Node Highlighting**: Khi click vào 1 Domain, highlight ngay service và database tương ứng phục vụ domain đó.
3. **Minimap & Controls**: Có zoom in/out, fit-to-screen, và thanh filter theo tầng (All, Ingress, Clusters, Apps, Databases).

---

## 4. Typography & Ngôn Ngữ Chuẩn Hóa (Content & Tone)

- **Ngôn ngữ nhất quán**: Toàn bộ giao diện nếu là tiếng Việt thì phải viết chuẩn chính tả, ngữ nghĩa kỹ thuật chính xác:
  - *"Cụm máy chủ Swarm"* (không dịch ngô nghê *"Bầy đàn máy chủ"*).
  - *"Triển khai dịch vụ"* (thay vì dịch sơ sài).
  - *"Nâng cấp phiên bản"* (thay vì *"Bấm vào đây để tải"*).
- **Tránh văn phong giật gân, AI puffery**:
  - Không dùng các từ sáo rỗng: *"Hệ thống siêu đỉnh cao"*, *"Trí tuệ nhân tạo đột phá"*.
  - Dùng từ ngữ hành động trực diện: *"Kiểm tra tài nguyên"*, *"Đồng bộ cấu hình"*, *"Khởi động lại Traefik"*.

---

## 5. Bảng Checklist 10 Điểm Rà Soát UI/UX Trước Khi Phát Hành

| STT | Hạng mục kiểm tra | Tiêu chí đạt chuẩn (Pass Criteria) |
| :---: | :--- | :--- |
| 1 | **Phân cấp thị giác** | Hero metrics ➔ Action buttons ➔ Data tables rõ ràng, không có 2 nút Primary cạnh nhau. |
| 2 | **Dark/Light Mode** | Không có chữ xám mờ khó đọc trên nền tối (đảm bảo độ tương phản WCAG AA ≥ 4.5:1). |
| 3 | **Trạng thái tải (Loading)** | Tất cả nút bấm và bảng dữ liệu khi fetch API đều có Skeleton loader hoặc Spinner, không đơ màn hình. |
| 4 | **Trạng thái rỗng (Empty)** | Bảng dữ liệu hoặc danh sách khi không có item phải có icon minh họa + hướng dẫn giải quyết. |
| 5 | **Không nhảy layout (CLS)** | Kích thước component ổn định, không bị co giật khi dữ liệu async tải về. |
| 6 | **Xác nhận hành động xóa** | Xóa máy chủ, hủy container, reset database luôn có dialog xác thực 2 bước. |
| 7 | **Định dạng dữ liệu kỹ thuật** | IP, Hash, Port, Git branch luôn dùng font monospace (`font-mono text-xs`). |
| 8 | **Thông báo Toast** | Bắn toast Sonner rõ ràng cho mọi mutation (tạo, sửa, xóa, cập nhật, lỗi). |
| 9 | **Responsive Layout** | Co giãn mượt mà trên Mobile/Tablet: Sidebar thu gọn thành icon hoặc drawer trượt. |
| 10 | **Đồng bộ hóa State** | Khi hoàn tất tác vụ (ví dụ Update version), giao diện tự xóa cache và cập nhật trạng thái mới nhất ngay lập tức. |
