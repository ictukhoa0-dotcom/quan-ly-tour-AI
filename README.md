# VietTour AI

Ứng dụng web quản lý vận hành tour du lịch Việt Nam, gồm dashboard tiếng Việt, quản lý dữ liệu, đặt chỗ có kiểm soát sức chứa, thanh toán và các tiện ích AI có bước duyệt của con người.

## Kiến trúc

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS 4, Lucide React; giao diện responsive, dạng ứng dụng điều hành.
- **Backend:** Python 3.10+, FastAPI, SQLAlchemy 2; SQLite cho local và PostgreSQL cho production.
- **Đăng nhập:** tài khoản nội bộ, mật khẩu băm BCrypt, JWT 8 giờ trong cookie `HttpOnly`; API kiểm tra vai trò từ cơ sở dữ liệu.
- **Dữ liệu:** `DATABASE_URL` chọn SQLite hoặc PostgreSQL; Alembic quản lý migration.
- **AI:** khuyến nghị tour được lọc trực tiếp từ tour, lịch khởi hành và số chỗ trong cơ sở dữ liệu. Tạo nội dung/tóm tắt dùng bản dự phòng xác định khi chưa cấu hình nhà cung cấp AI.

## Tính năng

- Dashboard: doanh thu đã thu, số đơn đang hoạt động, tour, khách hàng, lịch gần nhất và đơn mới.
- CRUD tour, điểm đến, lịch trình từng ngày, lịch khởi hành/sức chứa, khách hàng, hướng dẫn viên, phân công và phản hồi.
- Tạo/hủy đơn đặt tour. Chỗ được giữ trong cùng giao dịch với đơn và được trả lại khi hủy.
- Thanh toán nhiều đợt, giới hạn tổng tiền thu không vượt giá trị đơn.
- Phân quyền theo vai trò ở API và điều hướng giao diện.
- AI Studio dạng chat: tối đa 3 gợi ý dựa trên tour đang mở, còn chỗ, ngân sách, thời lượng và sở thích; hiệu ứng gõ bản nháp nội dung/lịch trình; tổng hợp phản hồi; hiển thị trạng thái API key mà không tiết lộ bí mật.
- Trò chuyện AI truyền nội dung theo SSE; công cụ chỉ đọc để tìm tour, điểm đến và số chỗ trực tiếp từ cơ sở dữ liệu.
- Xuất Excel có định dạng cho tour, đơn hàng và doanh thu; tải/mở phiếu xác nhận PDF cho từng đơn.
- Phân trang và lọc phía backend cho khách hàng/đơn hàng; lọc đơn theo ngày khởi hành, trạng thái. Nút giao diện sáng/tối lưu lựa chọn trên trình duyệt.
- Tìm kiếm danh sách, trạng thái tải với skeleton, thông báo thành công/lỗi và hộp xác nhận trước khi xóa/hủy; vô hiệu hóa nút trong lúc gửi.

## Chạy cục bộ trên Windows

Mở PowerShell tại thư mục dự án:

```powershell
npm install
Copy-Item .env.example backend\.env
# Sửa backend\.env: đặt JWT_SECRET thành chuỗi ngẫu nhiên riêng (ít nhất 32 ký tự)
# và INITIAL_ADMIN_PASSWORD thành mật khẩu quản trị riêng (tối thiểu 12 ký tự).
Set-Location backend
py -3 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m alembic upgrade head
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Giữ cửa sổ backend hoạt động. Mở cửa sổ PowerShell thứ hai tại thư mục dự án:

```powershell
npm run dev
```

Mở địa chỉ Vite hiển thị (mặc định `http://localhost:5173`). Tài liệu API tương tác ở `http://127.0.0.1:8000/docs`. Backend dùng `backend\.env` vì được chạy với thư mục làm việc `backend`.

**Lưu ý cấu hình môi trường:** với PowerShell, nếu đã tạo bản sao `.env` ở thư mục `backend`, hãy chỉnh `backend\.env` trước khi chạy máy chủ. Có thể tạo khóa JWT ngẫu nhiên bằng:

```powershell
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Thay `JWT_SECRET` mặc định bằng giá trị này cho mọi môi trường dùng chung hoặc triển khai thật.

## Tài khoản nội bộ

Khi cơ sở dữ liệu chưa có tài khoản, lần khởi động đầu tiên cần `INITIAL_ADMIN_USERNAME` và `INITIAL_ADMIN_PASSWORD` để tạo quản trị viên. Đổi giá trị mẫu trong `backend\.env` trước lần chạy đầu; mật khẩu phải dài ít nhất 12 ký tự và tối đa 72 byte. Sau khi tạo tài khoản, có thể bỏ hai biến khởi tạo khỏi môi trường; nếu vẫn giữ, chúng không ghi đè tài khoản hiện có.

Quản trị viên đăng nhập, mở **Tài khoản** ở thanh điều hướng, rồi tạo người dùng cho nhân viên với một trong các vai trò `admin`, `consultant`, `accountant`. Mật khẩu được băm BCrypt; giao diện/API không trả hash. Quản trị viên có thể đổi vai trò, đặt lại mật khẩu hoặc khóa tài khoản. Không thể khóa/hạ quyền tài khoản đang sử dụng hoặc vô hiệu hóa quản trị viên cuối cùng.

JWT chỉ được gửi trong cookie `HttpOnly`, `SameSite=Lax` ở development và `SameSite=None; Secure` ở production. Frontend không lưu token trong `localStorage`. Mỗi API request đã xác thực kiểm tra tài khoản/vai trò hiện hành trong SQLite, do đó thay đổi quyền hoặc khóa tài khoản có hiệu lực ngay. Request ghi từ trình duyệt có `Origin` phải khớp với origin frontend được tin cậy.

## Cấu hình

Sao chép `.env.example` thành `backend\.env`:

| Biến | Mô tả |
|---|---|
| `APP_ENV` | `development` dùng cookie không Secure cho máy local; `production` yêu cầu HTTPS và bật cookie Secure |
| `DATABASE_URL` | Mặc định `sqlite:///./viettour.db`; đường dẫn tương đối theo thư mục backend |
| `JWT_SECRET` | Bắt buộc mọi môi trường; chuỗi ngẫu nhiên riêng tối thiểu 32 ký tự. Backend dừng khởi động khi khóa vắng mặt, quá ngắn hoặc là placeholder |
| `INITIAL_ADMIN_USERNAME` | Tên đăng nhập dùng để khởi tạo quản trị viên đầu tiên khi cơ sở dữ liệu chưa có tài khoản |
| `INITIAL_ADMIN_PASSWORD` | Mật khẩu ban đầu, cần thiết chỉ khi khởi tạo; tối thiểu 12 ký tự, không lưu trong frontend/repository |
| `AI_API_KEY` | Tùy chọn; chỉ lưu ở backend, tuyệt đối không đưa vào biến `VITE_*` |
| `AI_MODEL` | Mô hình tương thích Chat Completions |
| `AI_BASE_URL` | Endpoint nhà cung cấp tương thích OpenAI |
| `FRONTEND_ORIGIN` | Origin frontend được phép gọi API qua CORS |
| `VITE_API_URL` | Tùy chọn ở thời điểm build frontend; URL API có hậu tố `/api` |
| `POSTGRES_PASSWORD` | Mật khẩu PostgreSQL riêng, dùng khi chạy Docker Compose; nên dùng ký tự URL-safe |

Không cần khóa AI để chạy ứng dụng. Tính năng trò chuyện AI theo thời gian thực cần `AI_API_KEY`; các chức năng AI dự phòng vẫn hoạt động khi chưa cấu hình. Nếu nhà cung cấp AI được bật nhưng lỗi, backend trả lỗi rõ ràng; không che lỗi bằng câu trả lời dự phòng. Công cụ AI chỉ đọc dữ liệu tour/điểm đến/lịch, không thay đổi dữ liệu hay tự quyết định giá.

## Migration cơ sở dữ liệu

Lệnh migration được chạy từ thư mục `backend`:

```powershell
python -m alembic upgrade head
python -m alembic revision --autogenerate -m "Describe schema change"
```

Migration ban đầu được tạo từ `Base.metadata` trên một cơ sở dữ liệu SQLite mới, không dùng dữ liệu trong `viettour.db`. Với cơ sở dữ liệu cũ chưa có `alembic_version`, hãy sao lưu và xác minh schema trước khi dùng `python -m alembic stamp head`; không chạy migration khởi tạo lên các bảng hiện hữu.

## Docker Compose

Đặt các biến bí mật `POSTGRES_PASSWORD`, `JWT_SECRET`, `INITIAL_ADMIN_USERNAME` và `INITIAL_ADMIN_PASSWORD` trong môi trường triển khai (không commit file `.env`), rồi chạy ở thư mục dự án:

```powershell
docker compose up --build
```

Compose khởi chạy PostgreSQL, chạy migration trước backend, rồi phục vụ frontend qua Nginx trên cổng 80. Nginx proxy `/api/` tới FastAPI và tắt buffering để SSE được truyền trực tiếp. Trước production, cấu hình TLS ở reverse proxy/load balancer và đặt `FRONTEND_ORIGIN` theo origin HTTPS thực tế.

**Rate limiting:** giới hạn đăng nhập 5 lần/phút và AI 20 lần/phút theo địa chỉ IP, hiện lưu trong bộ nhớ của mỗi tiến trình backend. Với triển khai nhiều worker/replica hoặc sau reverse proxy, cấu hình giới hạn tương ứng ở API gateway/WAF để có giới hạn dùng chung; không tin `X-Forwarded-For` nếu proxy chưa được cấu hình tin cậy.

## Ràng buộc dữ liệu

- Tour phải tham chiếu điểm đến; lịch trình phải tham chiếu tour và không trùng ngày trong cùng tour.
- Lịch khởi hành phải tham chiếu tour; sức chứa lớn hơn 0 và số chỗ giữ nằm trong khoảng từ 0 đến sức chứa.
- Đơn phải tham chiếu khách hàng/lịch khởi hành; số chỗ lớn hơn 0. Hủy đơn giải phóng số chỗ.
- Ghi nhận giữ chỗ bằng cập nhật có điều kiện `reserved_seats + số_chỗ <= capacity` trong cùng giao dịch tạo đơn; không thể ghi tăng `reserved_seats` trực tiếp qua API CRUD.
- Khoản thanh toán phải dương, tham chiếu đơn; tổng đã thu không vượt tổng giá trị đơn. API cập nhật số đã thu có điều kiện và lưu khoản thu trong cùng giao dịch.
- Không xóa bản ghi còn được dữ liệu liên quan sử dụng; API trả lỗi xung đột thay vì làm mất dữ liệu.
- SQLite bật `PRAGMA foreign_keys=ON`; PostgreSQL được hỗ trợ qua `DATABASE_URL` và `psycopg2-binary`. Trước khi nâng cấp schema, tạo backup có thể khôi phục.

## Kiểm thử và build

```powershell
Set-Location backend
python -m pytest -q
Set-Location ..
npm run build
```

Kiểm thử backend bao gồm giữ chỗ/vượt sức chứa, thanh toán, fallback AI, BCrypt, cookie HttpOnly, tài khoản bị khóa, cập nhật vai trò tức thời, ngăn tự khóa/khóa quản trị viên cuối cùng và rate limiting.

## Triển khai

1. Có thể dùng Docker Compose để chạy frontend, backend và PostgreSQL; hoặc build frontend bằng `npm run build` và triển khai `dist` riêng.
2. Với backend triển khai riêng, áp dụng `python -m alembic upgrade head`, đặt `DATABASE_URL`, `JWT_SECRET`, `INITIAL_ADMIN_USERNAME`, `INITIAL_ADMIN_PASSWORD`, `FRONTEND_ORIGIN`, và tùy chọn `AI_API_KEY`/`AI_MODEL`/`AI_BASE_URL`.
3. Dùng HTTPS, giới hạn mạng truy cập API và có kế hoạch backup PostgreSQL/SQLite. Không đưa `.env`, khóa AI, JWT secret hay cơ sở dữ liệu chứa thông tin khách hàng vào image/frontend.
4. Bật HTTPS cho cả frontend/backend để cookie phiên production hoạt động; đặt `FRONTEND_ORIGIN` chính xác và thay mật khẩu quản trị mẫu trước lần khởi động đầu tiên.

## Sao lưu và khôi phục SQLite

Dừng backend trước khi khôi phục. Có thể tạo bản sao nhất quán khi database đang hoạt động bằng SQLite backup API. Từ thư mục `backend`:

```powershell
python -c "import sqlite3; source=sqlite3.connect('viettour.db'); target=sqlite3.connect('viettour-backup.db'); source.backup(target); target.close(); source.close()"
```

Lưu bản backup ở vị trí riêng được mã hóa và kiểm soát truy cập. Để khôi phục, dừng backend, giữ bản database hiện tại để đối chiếu, sau đó chép file backup đã kiểm tra thành `viettour.db`:

```powershell
Copy-Item .\viettour-backup.db .\viettour.db
```

Khởi động lại backend và kiểm tra `/api/health`, dashboard, đơn hàng và số chỗ trước khi mở lại cho người dùng. Thử khôi phục định kỳ; một file backup chưa được kiểm tra khôi phục không phải là kế hoạch backup hoàn chỉnh.

## AI trong SDLC — báo cáo và demo

AI được áp dụng như một công cụ hỗ trợ có ranh giới trong quy trình phát triển và vận hành:

1. **Phân tích:** phân tách yêu cầu thành miền tour, khách hàng, lịch khởi hành, đơn, thanh toán và quyền theo vai trò.
2. **Thiết kế/triển khai:** AI có thể soạn nội dung tour và gợi ý tóm tắt phản hồi; API giới hạn đầu vào/đầu ra, không đưa khóa bí mật ra frontend, yêu cầu con người kiểm tra nội dung trước khi sử dụng.
3. **Tính đúng đắn:** AI không tự bịa ngày/giá trong khuyến nghị. Backend truy vấn cơ sở dữ liệu và chỉ trả tour có lịch khởi hành tương lai, đang mở, đủ chỗ và trong ngân sách.
4. **Kiểm thử:** chạy `python -m pytest -q` để kiểm tra các quy tắc sức chứa, hoàn chỗ, thanh toán và fallback không cần API key; chạy `npm run build` để kiểm tra TypeScript/frontend.
5. **Demo báo cáo:** đăng nhập `admin`, tạo một đơn bằng 2 chỗ, xem số chỗ giảm tại “Lịch khởi hành”, hủy đơn để xác nhận chỗ được trả lại; ghi một khoản thanh toán trong phạm vi còn nợ; mở “Trợ lý AI” để thử gợi ý và tạo bản nháp. Nội dung sinh ra là đề xuất, cần người vận hành xác minh dữ kiện và tính phù hợp.

## Cấu trúc thư mục

```text
src/
  components/       Điều hướng, bảng dữ liệu và biểu mẫu
  pages/            Dashboard và AI Studio
  api.ts            Client gọi REST API
  data.ts           Điều hướng, quyền giao diện và trường biểu mẫu
backend/
  app/
    config.py       Cấu hình môi trường
    db.py           SQLAlchemy engine/session
    models.py       Schema ORM và ràng buộc SQLite
    schemas.py      Kiểm tra payload
    main.py         API, seed, nghiệp vụ và điểm cuối AI
  tests/            Kiểm thử nghiệp vụ trọng tâm
```
