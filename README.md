# HanZi LMS — ASP.NET Core + Angular

Hệ thống dạy và học tiếng Trung theo giáo trình. Kiến trúc:

```
Angular 19 (SPA)  →  ASP.NET Core Web API (JWT)  →  PostgreSQL
     client/              server/                     Docker volume
```

## Chạy local (Windows dev)

```bash
# 1. DB (Docker Desktop phải đang bật)
docker start hanzi-pg

# 2. API — http://localhost:5000
cd server/HanZi.Server
dotnet run --urls "http://localhost:5000"

# 3. Web — http://localhost:4200  (proxy /api → 5000 tự động)
cd client
npm start
```

Tài khoản admin mặc định: `admin@hanzi.vn / 123456` (tự seed lần đầu).

## Chạy bằng Docker (PC Ubuntu / VPS) — 1 lệnh

```bash
docker compose up -d --build
# Web: http://localhost:8080  (nginx + API + DB trong cùng stack)
```

- Migrations tự áp dụng khi server khởi động
- Dữ liệu nằm ở volume `pgdata` — xoá container không mất
- Đổi mật khẩu DB/JWT bằng env: `POSTGRES_PASSWORD`, `JWT_SECRET`

## Deploy lên server thật

1. Cài Ubuntu + Docker + [GitHub Actions self-hosted runner](https://docs.github.com/en/actions/hosting-your-own-runners)
2. Trỏ domain `hanzio.live` → IP server (A record) — hoặc qua Cloudflare
3. `git push` → Actions tự build + restart + health check

## Kiến trúc backend (điểm nhấn)

- **Base entity đầy đủ**: `BaseEntity → AuditableEntity → FullAuditedEntity` (CreatedAt/By, UpdatedAt/By, IsDeleted/DeletedAt/DeletedBy) — mọi bảng kế thừa
- **Xoá mềm**: Global Query Filter (tự lọc `IsDeleted` mọi bảng) + SaveChanges interceptor chặn DELETE cứng
- **Chống N+1**: projection ra DTO + Specification pattern (Include tường minh, AsSplitQuery), không lazy loading
- **Design patterns**: Generic Repository + Unit of Work, Specification, Result, Options, Middleware, Interceptor
- **Auth tự viết**: JWT access 15 phút + refresh 30 ngày (revoke được), BCrypt, `[Authorize(Roles=...)]`
- **Bảo mật API**: ẩn đáp án bài tập với học viên; phân quyền server-side mọi endpoint

## Cấu trúc

```
├── server/HanZi.Server/
│   ├── Domain/            Entities (1 file/entity) + Enums + BaseEntity
│   ├── Application/       Features (Auth, Curriculums, Lessons, Classes,
│   │                      Assignments, Grading, Progress, Notifications, Users)
│   ├── Infrastructure/    DbContext, Configurations, Interceptors, Repos, JWT
│   ├── Controllers/       API mỏng
│   └── Migrations/        EF Core — tự chạy khi start
├── client/                Angular 19 + Tailwind
├── docker-compose.yml     postgres + server + client(nginx)
└── .github/workflows/     auto deploy (self-hosted runner)
```
