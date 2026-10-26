# VietTour AI

Ứng dụng web quản lý vận hành tour du lịch Việt Nam, gồm dashboard tiếng Việt, quản lý dữ liệu, đặt chỗ có kiểm soát sức chứa, thanh toán và các tiện ích AI có bước duyệt của con người.

## Kiến trúc

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS 4, Lucide React; giao diện responsive, dạng ứng dụng điều hành.
- **Backend:** Python 3.10+, FastAPI, SQLAlchemy 2 và SQLite.
- **Đăng nhập:** tài khoản demo theo vai trò; JWT hết hạn sau 8 giờ. API kiểm tra quyền ở máy chủ.
- **Dữ liệu:** SQLite, tự tạo bảng và nạp dữ liệu mẫu khi backend khởi động lần đầu.
- **AI:** khuyến nghị tour được lọc trực tiếp từ tour, lịch khởi hành và số chỗ trong cơ sở dữ liệu. Tạo nội dung/tóm tắt dùng bản dự phòng xác định khi chưa cấu hình nhà cung cấp AI.

## Tính năng

- Dashboard: doanh thu đã thu, số đơn đang hoạt động, tour, khách hàng, lịch gần nhất và đơn mới.
- CRUD tour, điểm đến, lịch trình từng ngày, lịch khởi hành/sức chứa, khách hàng, hướng dẫn viên, phân công và phản hồi.
- Tạo/hủy đơn đặt tour. Chỗ được giữ trong cùng giao dịch với đơn và được trả lại khi hủy.
- Thanh toán nhiều đợt, giới hạn tổng tiền thu không vượt giá trị đơn.
- Phân quyền theo vai trò ở API và điều hướng giao diện.
- AI Studio dạng chat: tối đa 3 gợi ý dựa trên tour đang mở, còn chỗ, ngân sách, thời lượng và sở thích; hiệu ứng gõ bản nháp nội dung/lịch trình; tổng hợp phản hồi; hiển thị trạng thái API key mà không tiết lộ bí mật.
- Tìm kiếm danh sách, trạng thái tải với skeleton, thông báo thành công/lỗi và hộp xác nhận trước khi xóa/hủy; vô hiệu hóa nút trong lúc gửi.

## Chạy cục bộ trên Windows

Mở PowerShell tại thư mục dự án:

```powershell
npm install
Copy-Item .env.example backend\.env
# Sửa backend\.env: đặt JWT_SECRET thành chuỗi ngẫu nhiên riêng (ít nhất 32 ký tự)
# và DEMO_PASSWORD thành mật khẩu development riêng (ít nhất 12 ký tự).
# APP_ENV=development chỉ dùng cho demo cục bộ; production không bật tài khoản demo.
Set-Location backend
py -3 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
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

## Tài khoản demo

Mật khẩu dùng thử được cấu hình riêng qua `DEMO_PASSWORD` trong `backend\.env`; không dùng mật khẩu công khai/chung.

| Tên đăng nhập | Vai trò | Quyền chính |
|---|---|---|
| `admin` | Quản trị viên | Toàn quyền quản lý và truy cập |
| `tuvan` | Tư vấn viên | Tour, điểm đến, lịch trình, lịch khởi hành, khách hàng, đơn, hướng dẫn viên, phân công, phản hồi |
| `ketoan` | Kế toán | Đơn, khách hàng, thanh toán; xem tour và lịch khởi hành để đối soát |

Các tên người dùng trên chỉ có hiệu lực khi `APP_ENV=development`. Backend từ chối toàn bộ đăng nhập demo ở `APP_ENV=production`. Trước triển khai thương mại, tích hợp nhà cung cấp danh tính/người dùng thực, mật khẩu đã băm và quy trình cấp/thu hồi tài khoản.

## Cấu hình

Sao chép `.env.example` thành `backend\.env`:

| Biến | Mô tả |
|---|---|
| `APP_ENV` | `development` bật tài khoản demo; mặc định `production` và luôn tắt đăng nhập demo |
| `DATABASE_URL` | Mặc định `sqlite:///./viettour.db`; đường dẫn tương đối theo thư mục backend |
| `JWT_SECRET` | Bắt buộc mọi môi trường; chuỗi ngẫu nhiên riêng tối thiểu 32 ký tự. Backend dừng khởi động khi khóa vắng mặt, quá ngắn hoặc là placeholder |
| `DEMO_PASSWORD` | Bắt buộc tối thiểu 12 ký tự chỉ trong development; cấu hình riêng, không lưu ở frontend/repository |
| `AI_API_KEY` | Tùy chọn; chỉ lưu ở backend, tuyệt đối không đưa vào biến `VITE_*` |
| `AI_MODEL` | Mô hình tương thích Chat Completions |
| `AI_BASE_URL` | Endpoint nhà cung cấp tương thích OpenAI |
| `FRONTEND_ORIGIN` | Origin frontend được phép gọi API qua CORS |
| `VITE_API_URL` | Tùy chọn ở thời điểm build frontend; URL API có hậu tố `/api` |

Không cần khóa AI để chạy ứng dụng. Nếu nhà cung cấp AI được bật nhưng lỗi, backend trả lỗi rõ ràng; không che lỗi bằng câu trả lời dự phòng. AI không được quyết định giá/đợt khởi hành: khuyến nghị luôn lấy dữ liệu tour thực tế từ SQLite.

**Xác thực production:** backend này chỉ cung cấp tài khoản demo cho development, không có hệ thống người dùng production. Trước khi public ứng dụng, tích hợp nhà cung cấp danh tính thật và kiểm thử lại việc cấp vai trò. Không chỉ đặt `APP_ENV=production` rồi kỳ vọng tài khoản demo tiếp tục đăng nhập.

## Ràng buộc dữ liệu

- Tour phải tham chiếu điểm đến; lịch trình phải tham chiếu tour và không trùng ngày trong cùng tour.
- Lịch khởi hành phải tham chiếu tour; sức chứa lớn hơn 0 và số chỗ giữ nằm trong khoảng từ 0 đến sức chứa.
- Đơn phải tham chiếu khách hàng/lịch khởi hành; số chỗ lớn hơn 0. Hủy đơn giải phóng số chỗ.
- Ghi nhận giữ chỗ bằng cập nhật có điều kiện `reserved_seats + số_chỗ <= capacity` trong cùng giao dịch tạo đơn; không thể ghi tăng `reserved_seats` trực tiếp qua API CRUD.
- Khoản thanh toán phải dương, tham chiếu đơn; tổng đã thu không vượt tổng giá trị đơn. API cập nhật số đã thu có điều kiện và lưu khoản thu trong cùng giao dịch.
- Không xóa bản ghi còn được dữ liệu liên quan sử dụng; API trả lỗi xung đột thay vì làm mất dữ liệu.
- SQLite bật `PRAGMA foreign_keys=ON`. Với sản phẩm nhiều người dùng đồng thời/quy mô lớn, chuyển sang PostgreSQL và bổ sung migration trước khi triển khai.

## Kiểm thử và build

```powershell
Set-Location backend
python -m pytest -q
Set-Location ..
npm run build
```

Kiểm thử backend tập trung vào giữ chỗ/vượt sức chứa, số chỗ còn lại và giải phóng chỗ sau hủy, giới hạn thanh toán và fallback AI không có khóa.

## Triển khai

1. Build frontend bằng `npm run build`; triển khai thư mục `dist` lên static hosting. Đặt `VITE_API_URL` thành URL backend trước khi build.
2. Triển khai FastAPI riêng, cài `backend\requirements.txt`, đặt biến môi trường bảo mật (`DATABASE_URL`, `JWT_SECRET`, `FRONTEND_ORIGIN`, và tùy chọn `AI_API_KEY`/`AI_MODEL`/`AI_BASE_URL`).
3. Dùng HTTPS, giới hạn mạng truy cập API, lưu SQLite trên ổ đĩa bền vững và có kế hoạch backup. Không đưa `.env`, khóa AI, JWT secret hay cơ sở dữ liệu chứa thông tin khách hàng vào image/frontend.
4. Tài khoản đăng nhập hiện chỉ phục vụ demo. Trước khi mở cho khách hàng thật, thay bằng xác thực và quản trị người dùng đúng chuẩn; bổ sung rate limiting, logging/giám sát, chính sách riêng tư và migration schema.

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
