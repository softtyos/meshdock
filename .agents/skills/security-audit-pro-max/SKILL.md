---
name: security-audit-pro-max
description: Bộ quy chuẩn kiểm tra, rà soát lỗ hổng bảo mật và siết chặt an toàn thông tin toàn diện cho hệ thống PaaS, Docker Swarm, Cloud Web Server, tRPC APIs và cơ sở dữ liệu (DevSecOps, OWASP Top 10, Defense-in-Depth).
when_to_use: "Sử dụng khi kiểm toán an toàn thông tin hệ thống, rà soát lỗ hổng mã nguồn (vulnerability assessment), kiểm tra quyền hạn API (access control/IDOR), siết chặt cấu hình máy chủ Linux/Docker Swarm, hoặc chuẩn bị phát hành phiên bản lên môi trường Production."
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
version: 1.0.0
effort: medium
---

# Enterprise Security Audit & System Hardening Pro Max (`security-audit-pro-max`)

> Bộ quy chuẩn phòng thủ chiều sâu (Defense-in-Depth), kiểm toán lỗ hổng mã nguồn (SAST/DAST) và siết chặt an toàn thông tin toàn diện cho nền tảng PaaS (Meshdock / Dokploy), cụm Docker Swarm, Traefik Reverse Proxy và máy chủ Linux.

---

## 1. Rà Soát Lỗ Hổng Ứng Dụng (OWASP Top 10 Web Application Security)

### 1.1 Chống Command Injection (RCE Prevention)
Trong các hệ thống quản trị máy chủ, việc gọi lệnh shell (`execAsync`, `spawnAsync`, `ssh.exec`) là vùng rủi ro số 1:
- **Quy tắc tuyệt đối**: **KHÔNG BAO GIỜ** ghép chuỗi trực tiếp dữ liệu từ người dùng (User Input) vào câu lệnh shell.
- **Giải pháp chuẩn**:
  - Dùng mảng tham số (`spawn(cmd, [arg1, arg2])`) thay vì lệnh chuỗi (`sh -c ...`).
  - Khi bắt buộc phải chạy chuỗi lệnh, phải bọc các tham số bằng `shell-quote` (`quote([userInput])`) hoặc kiểm tra chặt chẽ bằng regex:
    ```ts
    // Regex cho tên container / service an toàn
    const SAFE_NAME_REGEX = /^[a-zA-Z0-9_-]+$/;
    if (!SAFE_NAME_REGEX.test(serviceName)) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Tên dịch vụ chứa ký tự không hợp lệ" });
    }
    ```

### 1.2 Chống Path Traversal & Zip Slip (File System Security)
Khi đọc/ghi file cấu hình Traefik, file backup hoặc giải nén archive:
- **Quy tắc**: Luôn chuẩn hóa đường dẫn và kiểm tra xem đường dẫn đích có nằm trong thư mục gốc cho phép hay không:
  ```ts
  const resolvedPath = path.resolve(BASE_DIRECTORY, requestedPath);
  if (!resolvedPath.startsWith(BASE_DIRECTORY)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Truy cập đường dẫn ngoài phạm vi cho phép" });
  }
  ```
- **Zip Slip**: Khi giải nén file ZIP từ client, luôn kiểm tra tên file bên trong không chứa `../` hoặc symlink trỏ ra `/etc`, `/root`.

### 1.3 Kiểm Soát Quyền Truy Cập & Phân Quyền Đa Khách Thuê (Broken Access Control & IDOR)
- **Quy tắc tRPC Router**:
  - `adminProcedure`: Chỉ dành cho quản trị viên hệ thống (thao tác máy chủ, cài đặt web server, cập nhật phần mềm).
  - `protectedProcedure`: Yêu cầu người dùng đã đăng nhập, nhưng **bắt buộc** phải kiểm tra `organizationId` và quyền sở hữu tài nguyên:
    ```ts
    const server = await findServerById(input.serverId);
    if (server.organizationId !== ctx.session?.activeOrganizationId) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Không có quyền truy cập máy chủ này" });
    }
    ```
  - **Chống IDOR**: Không tin cậy `serverId` hoặc `projectId` gửi lên từ client mà luôn đối chiếu với danh sách các ID người dùng được cấp quyền (`getAccessibleServerIds(ctx.session)`).

### 1.4 Quản Trị Session & Cookie An Toàn
- **Cookie Security**: Toàn bộ cookie xác thực (`better-auth.session_token`) bắt buộc có các cờ:
  - `HttpOnly`: Chống rò rỉ session token qua XSS.
  - `Secure`: Chỉ gửi qua HTTPS (bật trên production).
  - `SameSite=Lax` hoặc `Strict`: Chống tấn công CSRF.
- **Thu hồi phiên (Revocation)**: Khi đổi mật khẩu, đăng xuất hoặc reset 2FA, bắt buộc hủy bỏ toàn bộ session tokens hiện có trong cơ sở dữ liệu.
- **Chống Brute-force**: Áp dụng Rate-limiting trên các endpoint đăng nhập, 2FA, OTP và tạo API keys.

### 1.5 Chống SQL Injection (SQLi)
- Toàn bộ truy vấn vào PostgreSQL phải sử dụng Parameterized Queries của **Drizzle ORM**.
- Nghiêm cấm dùng string interpolation trong `sql` template tag:
  ```ts
  // ❌ NGUY HIỂM:
  sql.raw(`SELECT * FROM users WHERE email = '${email}'`);
  // ✅ AN TOÀN:
  sql`SELECT * FROM users WHERE email = ${email}`;
  ```

---

## 2. Siết Chặt An Toàn Hạ Tầng Docker & Docker Swarm

### 2.1 Bảo Vệ Docker Socket (`/var/run/docker.sock`)
Docker socket tương đương với quyền root tuyệt đối trên máy chủ host:
- Không bao giờ mở cổng Docker daemon dạng TCP không mã hóa (`-H tcp://0.0.0.0:2375`).
- Nếu quản trị Docker từ xa qua mạng, bắt buộc dùng **mTLS (Mutual TLS)** với certificate riêng hoặc truyền lệnh qua **SSH Tunnel** an toàn.

### 2.2 Phân Tách Mạng Ảo (Network Segmentation)
- Cụm Swarm phải có các mạng Overlay độc lập:
  - `dokploy-network`: Dành cho Traefik và các ứng dụng nội bộ của hệ thống.
  - Mỗi Project / Organization khách hàng phải có **Overlay Network riêng biệt** (`overlay-network-app-xyz`).
  - Container Database (PostgreSQL, MariaDB, Redis) **không được map port trực tiếp ra IP Public của máy chủ host** (`0.0.0.0:5432`), chỉ cho phép các container cùng mạng nội bộ kết nối.

### 2.3 Giới Hạn Tài Nguyên Chống Tấn Công DoS (Resource Quotas)
- Luôn cấu hình hạn mức CPU và RAM (`deploy.resources.limits`) cho mọi container của người dùng để tránh một container bị treo/tràn bộ nhớ (OOM) làm sập toàn bộ máy chủ và các dịch vụ khác trên node.

---

## 3. Siết Chặt Hệ Điều Hành & Cổng Mạng Máy Chủ (Host OS Hardening)

### 3.1 Khóa Chặt Dịch Vụ SSH
1. **Tắt đăng nhập bằng mật khẩu**: Chuyển toàn bộ sang SSH Key (khuyến nghị `ed25519` hoặc `RSA 4096-bit`):
   ```bash
   PasswordAuthentication no
   PubkeyAuthentication yes
   ```
2. **Giới hạn số lần thử đăng nhập**: `MaxAuthTries 3` để ngăn chặn brute-force tự động.
3. **Tắt Root Login trực tiếp nếu có User sudo**: `PermitRootLogin prohibit-password` hoặc `no`.

### 3.2 Tích Hợp Fail2ban Chặn IP Tấn Công Tự Động
- Cấu hình các Jails trong Fail2ban:
  - `sshd`: Tự động chặn IP sau 5 lần thử SSH thất bại trong 10 phút.
  - `traefik-auth`: Chặn các IP cố tình brute-force màn hình đăng nhập dashboard.
  - Hỗ trợ xem danh sách Banned IPs và Unban IP trực tiếp từ trang Settings.

### 3.3 Kiểm Toán Cổng Mạng (Port Audit)
Chỉ mở các cổng tối thiểu trên Firewall (UFW / Security Group):
- **Cổng công khai (Public)**:
  - `80/tcp` (HTTP -> Redirect sang HTTPS).
  - `443/tcp` (HTTPS / Traefik SSL).
  - `22/tcp` (SSH quản trị - nên đổi cổng hoặc giới hạn IP nếu có thể).
- **Cổng nội bộ Docker Swarm (Chỉ mở giữa các Nodes trong cụm)**:
  - `2377/tcp`: Cluster management communications.
  - `7946/tcp` & `7946/udp`: Node communication (gossip).
  - `4789/udp`: Overlay network traffic (VXLAN).
  *Cảnh báo*: Các cổng Swarm trên không được mở ra toàn bộ Internet mà chỉ cho phép IP của các nodes trong cụm.

---

## 4. Quản Lý Secrets & Che Giấu Thông Tin Nhạy Cảm

- **Masking nhạy cảm**: Mật khẩu, SSH private keys, Better-Auth secret, Postgres password **không bao giờ** được ghi vào console log hay audit logs.
- Sử dụng hàm mask:
  ```ts
  export const maskSecret = (secret: string): string => {
    if (!secret || secret.length <= 8) return "********";
    return `${secret.slice(0, 4)}...${secret.slice(-4)}`;
  };
  ```
- **Chặn Cache Browser**: Mọi API trả về thông tin bảo mật hoặc dữ liệu phiên làm việc phải đính kèm header:
  `Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate`.

---

## 5. Quy Trình Rà Soát Bảo Mật Định Kỳ (Security Audit Checklist)

Khi thực hiện kiểm toán an toàn hệ thống, hãy thực hiện tuần tự 8 bước sau:

| Bước | Hạng mục rà soát | Công cụ / Lệnh kiểm tra | Kết quả kỳ vọng |
| :---: | :--- | :--- | :--- |
| 1 | **Quét lỗ hổng dependencies** | `pnpm audit` | Không có lỗ hổng mức High / Critical chưa được vá. |
| 2 | **Rà soát lệnh shell nguy hiểm** | `git grep "execAsync("` | Toàn bộ tham số đều được sanitize hoặc validate bằng regex. |
| 3 | **Kiểm tra phân quyền router tRPC** | Audit `server/api/routers/*.ts` | Không có endpoint nhạy cảm nào dùng sai `publicProcedure`. |
| 4 | **Rà soát Path Traversal** | Kiểm tra các hàm đọc file Traefik, Docker volumes | Có `path.resolve` và chặn `../` triệt để. |
| 5 | **Kiểm tra cổng đang lắng nghe** | `ss -tuln` hoặc `netstat -tuln` trên server | Không có database hoặc internal port nào mở public `0.0.0.0`. |
| 6 | **Kiểm tra cấu hình Fail2ban** | `fail2ban-client status` | Jail sshd đang hoạt động và giám sát tốt. |
| 7 | **Kiểm tra chứng chỉ SSL & HSTS** | `curl -I https://paas.softty.net` | Có header `Strict-Transport-Security` và TLS 1.2+. |
| 8 | **Kiểm tra rò rỉ secrets trong Git** | `git log -S "password" -n 5` | Không có credentials nào bị commit vào lịch sử git. |
