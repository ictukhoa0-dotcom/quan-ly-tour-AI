import {
  CalendarDays, ClipboardList, Compass, Globe, Globe2, LayoutDashboard, Map, Menu, MessageSquareText,
  Route, Sparkles, Ticket, Wallet, Users, Shield, X, ExternalLink, type LucideIcon,
} from "lucide-react";
import { navItems } from "../data";
import type { User } from "../types";

const icons: Record<string, LucideIcon> = {
  layout: LayoutDashboard, map: Map, calendar: CalendarDays, ticket: Ticket, users: Users,
  wallet: Wallet, compass: Compass, globe: Globe2, route: Route, clipboard: ClipboardList,
  message: MessageSquareText, sparkles: Sparkles, shield: Shield,
};

// Logical grouping of items to make administrative management effortless
const navSections = [
  {
    title: "Tổng quan",
    keys: ["dashboard"],
  },
  {
    title: "Tour & Điểm đến",
    keys: ["tours", "destinations", "itineraries"],
  },
  {
    title: "Vận hành & Đặt vé",
    keys: ["departures", "bookings", "payments"],
  },
  {
    title: "Khách hàng & Nhân sự",
    keys: ["customers", "guides", "assignments", "feedback"],
  },
  {
    title: "Hệ thống & AI",
    keys: ["ai", "users"],
  },
];

type Props = {
  active: string;
  user: User;
  open: boolean;
  onNavigate: (key: string) => void;
  onClose: () => void;
  onToggle: () => void;
  onGoToPortal?: () => void;
};

export default function Sidebar({ active, user, open, onNavigate, onClose, onToggle, onGoToPortal }: Props) {
  const allowedKeys = new Set(
    navItems
      .filter((item) => !item.roles || item.roles.includes(user.role))
      .map((item) => item.key)
  );

  return (
    <>
      <button className="mobile-menu" type="button" aria-label="Mở điều hướng" onClick={onToggle}>
        <Menu size={22} />
      </button>

      {open && <button className="sidebar-scrim" aria-label="Đóng điều hướng" onClick={onClose} />}

      <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
        {/* Brand Header matching Travel Portal brand */}
        <div className="brand">
          <div className="brand-mark">
            <Compass size={22} strokeWidth={2.2} />
            <i />
          </div>
          <div>
            <strong>VietTour<span>AI</span></strong>
            <small>HỆ THỐNG QUẢN TRỊ VẬN HÀNH</small>
          </div>
          <button className="sidebar-close" onClick={onClose} aria-label="Đóng menu">
            <X size={18} />
          </button>
        </div>

        {/* Quick Portal Switcher Button */}
        {onGoToPortal && (
          <button
            type="button"
            onClick={onGoToPortal}
            className="flex items-center justify-between w-full px-3 py-2.5 mb-3 text-xs font-bold text-blue-700 dark:text-blue-400 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-900/60 rounded-xl transition-all cursor-pointer shadow-xs group"
            title="Mở cổng thông tin du lịch dành cho khách hàng"
          >
            <span className="flex items-center gap-2">
              <Globe size={16} className="text-blue-600 dark:text-blue-400 group-hover:rotate-12 transition-transform" />
              <span>Xem Web Khách Hàng</span>
            </span>
            <ExternalLink size={14} className="opacity-70 group-hover:opacity-100" />
          </button>
        )}

        {/* Workspace Card */}
        <div className="workspace-switch">
          <span className="workspace-icon">
            <Sparkles size={16} />
          </span>
          <span>
            <strong>VietTour Enterprise</strong>
            <small>{user.role_label} • {user.name}</small>
          </span>
          <span className="switch-caret">⌄</span>
        </div>

        {/* Grouped Navigation List */}
        <nav className="nav-list" aria-label="Điều hướng chính">
          {navSections.map((section) => {
            const sectionItems = section.keys
              .filter((k) => allowedKeys.has(k))
              .map((k) => navItems.find((it) => it.key === k)!);

            if (sectionItems.length === 0) return null;

            return (
              <div key={section.title} className="mb-2">
                <div className="nav-group-title">{section.title}</div>
                {sectionItems.map((item) => {
                  const Icon = icons[item.icon];
                  const isActive = active === item.key;
                  return (
                    <button
                      key={item.key}
                      className={`nav-item ${isActive ? "nav-active" : ""}`}
                      onClick={() => {
                        onNavigate(item.key);
                        onClose();
                      }}
                    >
                      <Icon size={18} strokeWidth={isActive ? 2.2 : 1.8} />
                      <span>{item.label}</span>
                      {item.key === "bookings" && <span className="nav-dot" title="Đơn cần xử lý" />}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="sidebar-bottom">
          <div className="help-card">
            <div className="help-spark">
              <Sparkles size={16} />
            </div>
            <strong>Trợ lý AI VietTour</strong>
            <p>Gợi ý tour, sinh lịch trình & tóm tắt phản hồi tự động.</p>
            <button onClick={() => onNavigate("ai")}>
              Khám phá ngay <span>↗</span>
            </button>
          </div>
          <div className="sidebar-foot">
            <span className="status-dot" /> Máy chủ hoạt động ổn định <span>v2.0</span>
          </div>
        </div>
      </aside>
    </>
  );
}
