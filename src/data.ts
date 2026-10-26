import type { Field, ResourceName, User } from "./types";

export const navItems: { key: string; label: string; icon: string; roles?: User["role"][] }[] = [
  { key: "dashboard", label: "Tổng quan", icon: "layout" },
  { key: "tours", label: "Tour du lịch", icon: "map" },
  { key: "departures", label: "Lịch khởi hành", icon: "calendar" },
  { key: "bookings", label: "Đặt tour", icon: "ticket" },
  { key: "customers", label: "Khách hàng", icon: "users" },
  { key: "payments", label: "Thanh toán", icon: "wallet", roles: ["admin", "accountant"] },
  { key: "guides", label: "Hướng dẫn viên", icon: "compass", roles: ["admin", "consultant"] },
  { key: "destinations", label: "Điểm đến", icon: "globe", roles: ["admin", "consultant"] },
  { key: "itineraries", label: "Lịch trình", icon: "route", roles: ["admin", "consultant"] },
  { key: "assignments", label: "Phân công", icon: "clipboard", roles: ["admin", "consultant"] },
  { key: "feedback", label: "Phản hồi", icon: "message", roles: ["admin", "consultant"] },
  { key: "ai", label: "Trợ lý AI", icon: "sparkles" },
];

const select = (values: [string | number, string][]) => values.map(([value, label]) => ({ value, label }));

export const resourceFields: Record<ResourceName, Field[]> = {
  tours: [
    { key: "name", label: "Tên tour", required: true },
    { key: "destination_id", label: "Điểm đến", kind: "select", required: true },
    { key: "duration_days", label: "Thời lượng (ngày)", kind: "number", min: 1, required: true },
    { key: "price", label: "Giá (₫)", kind: "number", min: 0, required: true },
    { key: "category", label: "Danh mục", required: true },
    { key: "status", label: "Trạng thái", kind: "select", options: select([["Đang mở", "Đang mở"], ["Tạm dừng", "Tạm dừng"]]) },
    { key: "description", label: "Mô tả", kind: "textarea" },
  ],
  destinations: [
    { key: "name", label: "Tên điểm đến", required: true },
    { key: "region", label: "Khu vực", kind: "select", required: true, options: select([["Miền Bắc", "Miền Bắc"], ["Miền Trung", "Miền Trung"], ["Miền Nam", "Miền Nam"]]) },
    { key: "description", label: "Mô tả", kind: "textarea" },
  ],
  itineraries: [
    { key: "tour_id", label: "Tour", kind: "select", required: true },
    { key: "day_number", label: "Ngày thứ", kind: "number", min: 1, required: true },
    { key: "title", label: "Tiêu đề", required: true },
    { key: "details", label: "Chi tiết", kind: "textarea" },
  ],
  departures: [
    { key: "tour_id", label: "Tour", kind: "select", required: true },
    { key: "departure_date", label: "Ngày khởi hành", kind: "date", required: true },
    { key: "capacity", label: "Sức chứa", kind: "number", min: 1, required: true },
    { key: "status", label: "Trạng thái", kind: "select", options: select([["Đang mở", "Đang mở"], ["Đã đóng", "Đã đóng"]]) },
  ],
  customers: [
    { key: "name", label: "Họ và tên", required: true },
    { key: "phone", label: "Số điện thoại", required: true },
    { key: "email", label: "Email", kind: "email" },
    { key: "address", label: "Địa chỉ" },
  ],
  bookings: [
    { key: "customer_id", label: "Khách hàng", kind: "select", required: true },
    { key: "departure_id", label: "Lịch khởi hành", kind: "select", required: true },
    { key: "seats", label: "Số chỗ", kind: "number", min: 1, required: true },
  ],
  payments: [
    { key: "booking_id", label: "Đơn đặt tour", kind: "select", required: true },
    { key: "amount", label: "Số tiền (₫)", kind: "number", min: 1, required: true },
    { key: "method", label: "Phương thức", kind: "select", required: true, options: select([["Chuyển khoản", "Chuyển khoản"], ["Tiền mặt", "Tiền mặt"], ["Thẻ", "Thẻ"]]) },
    { key: "note", label: "Ghi chú" },
  ],
  guides: [
    { key: "name", label: "Họ và tên", required: true },
    { key: "phone", label: "Số điện thoại", required: true },
    { key: "languages", label: "Ngôn ngữ" },
    { key: "status", label: "Trạng thái", kind: "select", options: select([["Sẵn sàng", "Sẵn sàng"], ["Đang dẫn tour", "Đang dẫn tour"], ["Nghỉ phép", "Nghỉ phép"]]) },
  ],
  assignments: [
    { key: "guide_id", label: "Hướng dẫn viên", kind: "select", required: true },
    { key: "departure_id", label: "Lịch khởi hành", kind: "select", required: true },
    { key: "note", label: "Ghi chú" },
  ],
  feedback: [
    { key: "customer_name", label: "Tên khách hàng", required: true },
    { key: "tour_id", label: "Tour", kind: "select", required: true },
    { key: "rating", label: "Đánh giá (1–5)", kind: "number", min: 1, required: true },
    { key: "comment", label: "Nội dung", kind: "textarea", required: true },
    { key: "created_at", label: "Ngày ghi nhận", kind: "date", required: true },
  ],
};

export const resourceTitles: Record<ResourceName, string> = {
  tours: "Danh sách tour", destinations: "Điểm đến", itineraries: "Lịch trình tour",
  departures: "Lịch khởi hành", customers: "Khách hàng", bookings: "Đơn đặt tour",
  payments: "Sổ thanh toán", guides: "Hướng dẫn viên", assignments: "Phân công hướng dẫn",
  feedback: "Phản hồi khách hàng",
};

export const canWrite = (resource: ResourceName, role: User["role"]) => {
  if (role === "admin") return true;
  if (role === "consultant") return resource !== "payments";
  return ["bookings", "customers", "payments"].includes(resource);
};
