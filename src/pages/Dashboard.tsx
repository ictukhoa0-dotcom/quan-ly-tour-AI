import {
  ArrowUpRight,
  CalendarDays,
  ChevronRight,
  CircleDollarSign,
  Compass,
  Plus,
  Sparkles,
  Ticket,
  TrendingUp,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";
import type { DashboardData, Row, User } from "../types";

const money = (value: number) => new Intl.NumberFormat("vi-VN").format(value) + " ₫";
const displayDate = (value: string | number | null) => {
  if (!value) return "—";
  return new Date(`${value}T00:00:00`).toLocaleDateString("vi-VN", { day: "2-digit", month: "short" });
};

type Props = {
  data: DashboardData | null;
  loading: boolean;
  role: User["role"];
  onNavigate: (key: string) => void;
  onNewBooking: () => void;
};

export default function Dashboard({ data, loading, role, onNavigate, onNewBooking }: Props) {
  const isAdmin = role === "admin";
  const metrics = data?.metrics;

  const todayStr = new Date().toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="page-content">
      {/* Modern Hero Welcome Banner */}
      <section className="relative overflow-hidden rounded-2xl text-white bg-gradient-to-r from-slate-900 via-blue-950 to-blue-800 shadow-xl border border-blue-900/40 p-6 sm:p-8 mb-6">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold uppercase tracking-wider mb-3 backdrop-blur-sm border border-blue-400/20">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>{todayStr} • BẢNG ĐIỀU HÀNH VIETTOUR AI</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-tight mb-2">
            Chào mừng trở lại! <br className="hidden sm:inline" />
            Hôm nay hệ thống sẵn sàng phục vụ hành khách.
          </h2>
          <p className="text-sm text-blue-100/90 leading-relaxed max-w-xl mb-6">
            Theo dõi dòng tiền, lịch trình khởi hành, khách hàng và điều phối tour du lịch dễ dàng trên một giao diện thống nhất.
          </p>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onNewBooking}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-blue-900 bg-white hover:bg-slate-50 transition-all shadow-md hover:shadow-lg cursor-pointer hover:-translate-y-0.5"
            >
              <Plus className="w-4 h-4 text-blue-700" />
              <span>Tạo đơn đặt tour mới</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate("tours")}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm text-white bg-white/10 hover:bg-white/20 border border-white/20 transition-all cursor-pointer hover:-translate-y-0.5 backdrop-blur-sm"
            >
              <Compass className="w-4 h-4 text-blue-300" />
              <span>Quản lý danh sách tour</span>
            </button>

            {isAdmin && (
              <button
                type="button"
                onClick={() => onNavigate("ai")}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-amber-950 bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-300 hover:to-orange-300 transition-all shadow-md hover:shadow-lg cursor-pointer hover:-translate-y-0.5 ml-auto sm:ml-0"
              >
                <Sparkles className="w-4 h-4" />
                <span>Trợ lý AI Studio</span>
              </button>
            )}
          </div>
        </div>

        {/* Ambient Decorative Light Effect */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-blue-500/20 via-transparent to-transparent pointer-events-none" />
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      </section>

      {/* Section Header */}
      <div className="section-heading">
        <div>
          <span className="eyebrow">CHỈ SỐ THỰC TẾ</span>
          <h2>Tổng quan vận hành kinh doanh</h2>
        </div>
        <div className="date-chip">
          <CalendarDays size={15} className="text-blue-600" />
          <span>Dữ liệu đồng bộ trực tiếp</span>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <section className="metric-grid" aria-label="Chỉ số hoạt động">
        {isAdmin && (
          <Metric
            title="Đơn đang hoạt động"
            value={metrics?.active_bookings ?? 0}
            icon={<Ticket />}
            tone="blue"
            change="Đã xác nhận & Chờ"
            trend="up"
            loading={loading}
          />
        )}
        {isAdmin && (
          <Metric
            title="Tổng doanh thu đã thu"
            value={money(metrics?.revenue ?? 0)}
            icon={<CircleDollarSign />}
            tone="mint"
            change="Khoản thực thu từ đơn"
            trend="up"
            loading={loading}
          />
        )}
        <Metric
          title="Tổng số sản phẩm tour"
          value={metrics?.tour_count ?? 0}
          icon={<Compass />}
          tone="lavender"
          change="Đang mở & Khai thác"
          trend="neutral"
          loading={loading}
        />
        {isAdmin && (
          <Metric
            title="Tổng số khách hàng"
            value={metrics?.customer_count ?? 0}
            icon={<Users />}
            tone="peach"
            change="Hồ sơ thành viên"
            trend="up"
            loading={loading}
          />
        )}
      </section>

      {/* Lower Dashboard Panels */}
      <section className="dashboard-lower">
        {/* Upcoming Departures Panel */}
        <div className="panel departures-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">LỊCH TRÌNH KHỞI HÀNH</span>
              <h3>Các chuyến tour gần nhất</h3>
            </div>
            <button
              type="button"
              className="link-button"
              onClick={() => onNavigate("departures")}
            >
              <span>Xem tất cả</span>
              <ChevronRight size={15} />
            </button>
          </div>

          <div className="departure-list">
            {(data?.upcoming_departures ?? []).map((row) => {
              const cap = Number(row.capacity) || 1;
              const rem = Number(row.remaining_seats) || 0;
              const booked = Math.max(0, cap - rem);
              const bookedPercent = Math.round((booked / cap) * 100);

              return (
                <div className="departure-row" key={row.id}>
                  <div className="departure-date">
                    <strong>{displayDate(row.departure_date)}</strong>
                    <small>
                      {new Date(`${row.departure_date}T00:00:00`).toLocaleDateString("vi-VN", {
                        weekday: "short",
                      })}
                    </small>
                  </div>

                  <div className="departure-info">
                    <strong>{row.tour_name}</strong>
                    <small>
                      Còn trống <span className={rem <= 3 ? "text-red-600 font-bold" : "text-blue-700 font-bold"}>{rem}</span> / {cap} chỗ
                    </small>
                  </div>

                  <div className="seat-meter">
                    <span title={`Đã đặt ${bookedPercent}% chỗ`}>
                      <i
                        style={{
                          width: `${Math.max(bookedPercent, 5)}%`,
                          background: rem <= 3 ? "#ef4444" : rem <= 6 ? "#f59e0b" : "#10b981",
                        }}
                      />
                    </span>
                    <small>{bookedPercent}%</small>
                  </div>
                </div>
              );
            })}

            {!loading && !data?.upcoming_departures.length && (
              <div className="empty-inline">Hiện chưa có chuyến đi nào sắp khởi hành.</div>
            )}
            {loading && (
              <div className="skeleton-list">
                <i />
                <i />
                <i />
              </div>
            )}
          </div>
        </div>

        {/* Recent Bookings Panel */}
        {isAdmin && (
          <div className="panel activity-panel">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">VẬN HÀNH ĐƠN HÀNG</span>
                <h3>Đơn đặt tour mới ghi nhận</h3>
              </div>
              <button
                type="button"
                className="link-button"
                onClick={() => onNavigate("bookings")}
              >
                <span>Tất cả đơn</span>
                <ChevronRight size={15} />
              </button>
            </div>

            <div className="activity-list">
              {(data?.recent_bookings ?? []).slice(0, 5).map((row: Row, index) => (
                <div className="activity-row" key={row.id}>
                  <span className={`avatar avatar-${index % 4}`}>
                    {String(row.customer_name ?? "K").charAt(0).toUpperCase()}
                  </span>
                  <div className="activity-info">
                    <strong>{row.customer_name}</strong>
                    <small>{row.tour_name}</small>
                  </div>
                  <span
                    className={`status-pill ${
                      row.status === "Đã hủy"
                        ? "status-red"
                        : row.status === "Chờ xác nhận"
                        ? "status-amber"
                        : "status-green"
                    }`}
                  >
                    {row.status}
                  </span>
                </div>
              ))}

              {!loading && !data?.recent_bookings.length && (
                <div className="empty-inline">Chưa có đơn đặt tour nào gần đây.</div>
              )}
              {loading && (
                <div className="skeleton-list">
                  <i />
                  <i />
                  <i />
                </div>
              )}
            </div>

            <button
              type="button"
              className="view-reports"
              onClick={() => onNavigate("payments")}
            >
              <span>Xem báo cáo thanh toán & doanh thu</span>
              <ArrowUpRight size={15} />
            </button>
          </div>
        )}
      </section>

      {/* Footnote */}
      <div className="dashboard-footnote">
        <span>✦</span>
        <span>Hệ thống cơ sở dữ liệu được đồng bộ hóa tức thời với toàn bộ cổng thông tin khách hàng</span>
        <span className="footnote-right">
          <TrendingUp size={15} /> Vận hành hiệu quả & tin cậy
        </span>
      </div>
    </div>
  );
}

function Metric({
  title,
  value,
  icon,
  tone,
  change,
  trend,
  loading,
}: {
  title: string;
  value: string | number;
  icon: ReactNode;
  tone: string;
  change: string;
  trend: string;
  loading: boolean;
}) {
  return (
    <article className="metric-card">
      <div className={`metric-icon ${tone}`}>{icon}</div>
      <span className="metric-title">{title}</span>
      <strong className={`metric-value ${loading ? "loading-value" : ""}`}>
        {loading ? "—" : value}
      </strong>
      <div className="metric-meta">
        <span className={trend === "up" ? "trend-up text-emerald-600 dark:text-emerald-400 font-bold" : "trend-neutral"}>
          {trend === "up" && <ArrowUpRight size={13} className="inline mr-0.5" />}
          {change}
        </span>
      </div>
    </article>
  );
}
