import { ArrowDownRight, ArrowUpRight, CalendarDays, ChevronRight, CircleDollarSign, Compass, Plus, Users } from "lucide-react";
import type { ReactNode } from "react";
import type { DashboardData, Row, User } from "../types";

const money = (value: number) => new Intl.NumberFormat("vi-VN").format(value) + " ₫";
const displayDate = (value: string | number | null) => {
  if (!value) return "—";
  return new Date(`${value}T00:00:00`).toLocaleDateString("vi-VN", { day: "2-digit", month: "short" });
};

type Props = { data: DashboardData | null; loading: boolean; role: User["role"]; onNavigate: (key: string) => void; onNewBooking: () => void };

export default function Dashboard({ data, loading, role, onNavigate, onNewBooking }: Props) {
  const isAdmin = role === "admin";
  const metrics = data?.metrics;
  return (
    <div className="page-content">
      <section className="welcome-card">
        <div className="welcome-copy"><span className="eyebrow eyebrow-light">{new Date().toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "long" }).toLocaleUpperCase("vi")} · ĐIỀU HÀNH TOUR</span><h2>Mỗi hành trình bắt đầu<br />từ một trải nghiệm tốt.</h2><p>Theo dõi hoạt động kinh doanh và chăm sóc khách hàng trên một nơi duy nhất.</p><button className="welcome-cta" onClick={onNewBooking}><Plus size={17} /> Tạo đơn đặt tour</button></div>
        <div className="welcome-art" aria-hidden="true"><div className="sun" /><div className="hill hill-back" /><div className="hill hill-front" /><div className="art-leaf">✦</div><span>VIỆT NAM • HÀNH TRÌNH CỦA BẠN</span></div>
      </section>
      <div className="section-heading"><div><span className="eyebrow">TỔNG QUAN KINH DOANH</span><h2>Tình hình vận hành</h2></div><button className="date-chip"><CalendarDays size={15} /> Dữ liệu trực tiếp</button></div>
      <section className="metric-grid" aria-label="Chỉ số hoạt động">
        {isAdmin && <Metric title="Đơn đang hoạt động" value={metrics?.active_bookings ?? 0} icon={<CalendarDays />} tone="mint" change="Đã xác nhận và chờ" trend="neutral" loading={loading} />}
        {isAdmin && <Metric title="Tổng tiền đã thu" value={money(metrics?.revenue ?? 0)} icon={<CircleDollarSign />} tone="peach" change="Theo các khoản thanh toán" trend="neutral" loading={loading} />}
        <Metric title="Tổng số tour" value={metrics?.tour_count ?? 0} icon={<Compass />} tone="lavender" change="Trong danh mục" trend="neutral" loading={loading} />
        {isAdmin && <Metric title="Khách hàng" value={metrics?.customer_count ?? 0} icon={<Users />} tone="blue" change="Hồ sơ hiện có" trend="neutral" loading={loading} />}
      </section>
      <section className="dashboard-lower">
        <div className="panel departures-panel">
          <div className="panel-heading"><div><span className="eyebrow">SẮP KHỞI HÀNH</span><h3>Lịch trình gần nhất</h3></div><button className="link-button" onClick={() => onNavigate("departures")}>Xem tất cả <ChevronRight size={16} /></button></div>
          <div className="departure-list">
            {(data?.upcoming_departures ?? []).map((row) => {
              const ratio = Number(row.capacity) ? Number(row.remaining_seats) / Number(row.capacity) : 0;
              return <div className="departure-row" key={row.id}><div className="departure-date"><strong>{displayDate(row.departure_date)}</strong><small>{new Date(`${row.departure_date}T00:00:00`).toLocaleDateString("vi-VN", { weekday: "short" })}</small></div><div className="departure-info"><strong>{row.tour_name}</strong><small>{row.remaining_seats} / {row.capacity} chỗ còn trống</small></div><div className="seat-meter"><span><i style={{ width: `${Math.max(ratio * 100, 7)}%` }} /></span><small>{Math.round(ratio * 100)}%</small></div></div>;
            })}
            {!loading && !data?.upcoming_departures.length && <div className="empty-inline">Chưa có lịch khởi hành sắp tới.</div>}
            {loading && <div className="skeleton-list"><i /><i /><i /></div>}
          </div>
        </div>
        {isAdmin && <div className="panel activity-panel">
          <div className="panel-heading"><div><span className="eyebrow">VỪA CẬP NHẬT</span><h3>Đơn đặt tour mới</h3></div><button className="link-button" onClick={() => onNavigate("bookings")}>Tất cả <ChevronRight size={16} /></button></div>
          <div className="activity-list">{(data?.recent_bookings ?? []).slice(0, 4).map((row: Row, index) => <div className="activity-row" key={row.id}><span className={`avatar avatar-${index % 4}`}>{String(row.customer_name ?? "K").charAt(0)}</span><div className="activity-info"><strong>{row.customer_name}</strong><small>{row.tour_name}</small></div><span className={`status-pill ${row.status === "Đã hủy" ? "status-red" : row.status === "Chờ xác nhận" ? "status-amber" : "status-green"}`}>{row.status}</span></div>)}
            {!loading && !data?.recent_bookings.length && <div className="empty-inline">Chưa có đơn đặt tour.</div>}
            {loading && <div className="skeleton-list"><i /><i /><i /></div>}
          </div>
          <button className="view-reports" onClick={() => onNavigate("payments")}>Xem báo cáo doanh thu <ArrowUpRight size={15} /></button>
        </div>}
      </section>
      <div className="dashboard-footnote"><span>✦</span> Dữ liệu được cập nhật trực tiếp từ hoạt động vận hành của bạn <span className="footnote-right"><ArrowDownRight size={15} /> Tăng trưởng ổn định</span></div>
    </div>
  );
}

function Metric({ title, value, icon, tone, change, trend, loading }: { title: string; value: string | number; icon: ReactNode; tone: string; change: string; trend: string; loading: boolean }) {
  return <article className="metric-card"><div className={`metric-icon ${tone}`}>{icon}</div><span className="metric-title">{title}</span><strong className={`metric-value ${loading ? "loading-value" : ""}`}>{loading ? "—" : value}</strong><div className="metric-meta"><span className={trend === "up" ? "trend-up" : "trend-neutral"}>{trend === "up" && <ArrowUpRight size={14} />}{change}</span><span>Theo dữ liệu hiện có</span></div></article>;
}
