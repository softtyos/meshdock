# Hướng Dẫn Chuyển Đổi (Migration Guide): Dokploy ➔ MeshDock v1.0.0

Tài liệu này cung cấp hướng dẫn chi tiết và **Prompt chuyên dụng cho AI Agent** để thực hiện chuyển đổi một máy chủ đang chạy Dokploy sang MeshDock mà **không làm gián đoạn các ứng dụng đang chạy (Zero-Downtime Migration)** và **bảo toàn 100% dữ liệu**.

---

## 🤖 AI Agent Migration Skill & Prompt

*Bạn có thể copy toàn bộ nội dung khối bên dưới và gửi cho bất kỳ AI Coding Assistant nào (Antigravity, Claude Code, Cursor, ChatGPT...) khi kết nối vào VPS:*

```markdown
<TASK>
Bạn là một chuyên gia DevOps & Docker Swarm. Hãy thực hiện chuyển đổi hệ thống từ Dokploy hiện tại sang MeshDock v1.0.0 trên máy chủ này theo các tiêu chuẩn an toàn cao nhất, bảo toàn 100% dữ liệu và không làm gián đoạn các container ứng dụng đang chạy.
</TASK>

<RULES>
1. KHÔNG xóa thư mục /etc/dokploy hay can thiệp vào các container ứng dụng của người dùng.
2. LUÔN LUÔN tạo backup trước khi thay đổi bất kỳ image hoặc service nào.
3. Sử dụng cơ chế in-place Docker Service Update để cập nhật trực tiếp control plane.
4. Kiểm tra sức khỏe (Healthcheck) và logs của MeshDock sau khi khởi động.
5. Nếu phát hiện lỗi nghiêm trọng, thực hiện Rollback về Dokploy ban đầu ngay lập tức.
</RULES>

<EXECUTION_STEPS>

### Bước 1: Khảo sát hiện trạng & Sao lưu an toàn
1. Kiểm tra trạng thái Swarm và các service đang chạy:
   docker service ls
   docker node ls
2. Tìm tên container Postgres nội bộ và thực hiện sao lưu CSDL:
   PG_CONTAINER=$(docker ps -q --filter "name=dokploy-postgres" | head -n 1)
   docker exec -t $PG_CONTAINER pg_dump -U dokploy dokploy > /etc/dokploy/backup_pre_meshdock.sql
3. Sao lưu thư mục cấu hình và chứng chỉ SSL Traefik:
   tar -czvf /root/dokploy_backup_$(date +%F_%T).tar.gz /etc/dokploy

### Bước 2: Tải image mới từ Docker Hub
1. Kéo image MeshDock Controller:
   docker pull softtynet/meshdock:latest
2. Kéo image MeshDock Agent (Global Node Agent):
   docker pull softtynet/meshdock-agent:latest

### Bước 3: Nâng cấp Control Plane lên MeshDock
1. Cập nhật Docker service "dokploy" sang image MeshDock:
   docker service update \
     --image softtynet/meshdock:latest \
     --update-order stop-first \
     dokploy
2. Theo dõi tiến trình khởi động và kiểm tra logs container:
   docker service ps dokploy
   # MeshDock sẽ tự động chạy dist/migration.mjs để migrate schema CSDL Drizzle an toàn.

### Bước 4: Nâng cấp Agent & Monitoring (nếu có)
1. Kiểm tra xem service dokploy-monitoring có tồn tại không:
   if docker service inspect dokploy-monitoring > /dev/null 2>&1; then
       docker service update \
         --image softtynet/meshdock-agent:latest \
         --update-order stop-first \
         dokploy-monitoring
   fi

### Bước 5: Kiểm tra xác minh sau nâng cấp
1. Kiểm tra HTTP Health endpoint trên máy chủ:
   curl -fs http://localhost:3000/api/trpc/settings.health
2. Kiểm tra giao diện web MeshDock qua domain/IP máy chủ.
3. Xác minh:
   - Các ứng dụng người dùng (Web Apps, Database, Compose) vẫn giữ nguyên trạng thái running.
   - Đăng nhập tài khoản quản trị viên bình thường.
   - Kiểm tra các tính năng mới: Server Vitals, Security Inspector, Fleet Swarm Management.

### Bước 6: Kế hoạch khẩn cấp Rollback (nếu gặp sự cố)
Nếu MeshDock không thể khởi động thành công:
1. Quay về image Dokploy ban đầu:
   docker service update --image dokploy/dokploy:latest --update-order stop-first dokploy
2. Nếu CSDL bị lỗi, khôi phục từ file backup đã tạo ở Bước 1:
   docker exec -i $PG_CONTAINER psql -U dokploy dokploy < /etc/dokploy/backup_pre_meshdock.sql
</EXECUTION_STEPS>
```

---

## 📋 Hướng Dẫn Thực Hiện Thủ Công (Dành Cho Kỹ Sư DevOps)

Nếu bạn muốn tự chạy lệnh trực tiếp trên terminal của VPS thay vì dùng AI Agent, các bước thực hiện như sau:

### 1. Tạo bản Backup phòng ngừa
```bash
# 1.1. Backup database Dokploy
POSTGRES_CONTAINER=$(docker ps -q --filter "name=dokploy-postgres" | head -n 1)
docker exec -t $POSTGRES_CONTAINER pg_dump -U dokploy dokploy > /root/dokploy_db_backup.sql

# 1.2. Backup thư mục cấu hình /etc/dokploy
tar -czvf /root/dokploy_config_backup.tar.gz /etc/dokploy
```

### 2. Kéo image mới
```bash
docker pull softtynet/meshdock:latest
docker pull softtynet/meshdock-agent:latest
```

### 3. Cập nhật dịch vụ Swarm
```bash
docker service update \
  --image softtynet/meshdock:latest \
  --update-order stop-first \
  dokploy
```

*(Lưu ý: MeshDock tương thích hoàn toàn 100% với mount path, biến môi trường và CSDL của Dokploy cũ. Khi khởi động, MeshDock tự động chạy migration để bổ sung các bảng và cột mới mà không xóa bất kỳ dữ liệu cũ nào).*

### 4. Cập nhật Agent Giám sát Swarm (Nâng cấp lên MeshDock Agent)
```bash
if docker service inspect dokploy-monitoring > /dev/null 2>&1; then
    docker service update \
      --image softtynet/meshdock-agent:latest \
      --update-order stop-first \
      dokploy-monitoring
fi
```

### 5. Kiểm tra trạng thái
```bash
# Kiểm tra container đang chạy
docker service ls

# Kiểm tra log khởi động của MeshDock
docker service logs --tail 50 dokploy
```

Sau khi hoàn tất, mở trình duyệt vào địa chỉ IP/domain của server, giao diện MeshDock v1.0.0 sẽ xuất hiện với toàn bộ ứng dụng và dữ liệu được bảo toàn nguyên vẹn.
