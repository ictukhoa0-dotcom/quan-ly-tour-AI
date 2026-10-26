import {
  CalendarDays, ClipboardList, Compass, Globe2, LayoutDashboard, Map, Menu, MessageSquareText,
  Route, Sparkles, Ticket, Wallet, Users, X, type LucideIcon,
} from "lucide-react";
import { navItems } from "../data";
import type { User } from "../types";

const icons: Record<string, LucideIcon> = {
  layout: LayoutDashboard, map: Map, calendar: CalendarDays, ticket: Ticket, users: Users,
  wallet: Wallet, compass: Compass, globe: Globe2, route: Route, clipboard: ClipboardList,
  message: MessageSquareText, sparkles: Sparkles,
};

type Props = {
  active: string;
  user: User;
  open: boolean;
  onNavigate: (key: string) => void;
  onClose: () => void;
  onToggle: () => void;
};

export default function Sidebar({ active, user, open, onNavigate, onClose, onToggle }: Props) {
  return (
    <>
      <button className="mobile-menu" type="button" aria-label="Mở điều hướng" onClick={onToggle}><Menu size={21} /></button>
      {open && <button className="sidebar-scrim" aria-label="Đóng điều hướng" onClick={onClose} />}
      <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark"><span>V</span><i /></div>
          <div><strong>viettour<span>ai</span></strong><small>QUẢN TRỊ VẬN HÀNH</small></div>
          <button className="sidebar-close" onClick={onClose} aria-label="Đóng menu"><X size={18} /></button>
        </div>
        <div className="workspace-label">KHÔNG GIAN LÀM VIỆC</div>
        <div className="workspace-switch"><span className="workspace-icon">✦</span><span><strong>VietTour Travel</strong><small>Gói chuyên nghiệp</small></span><span className="switch-caret">⌄</span></div>
        <nav className="nav-list" aria-label="Điều hướng chính">
          {navItems.filter((item) => !item.roles || item.roles.includes(user.role)).map((item) => {
            const Icon = icons[item.icon];
            return (
              <button key={item.key} className={`nav-item ${active === item.key ? "nav-active" : ""}`} onClick={() => { onNavigate(item.key); onClose(); }}>
                <Icon size={18} strokeWidth={1.8} /><span>{item.label}</span>
                {item.key === "bookings" && <span className="nav-dot" />}
              </button>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="help-card"><div className="help-spark"><Sparkles size={16} /></div><strong>Cần trợ giúp?</strong><p>Đội ngũ VietTour luôn sẵn sàng hỗ trợ bạn.</p><button onClick={() => onNavigate("ai")}>Khám phá trợ lý AI <span>↗</span></button></div>
          <div className="sidebar-foot"><span className="status-dot" /> Hệ thống hoạt động ổn định <span>v1.0</span></div>
        </div>
      </aside>
    </>
  );
}
