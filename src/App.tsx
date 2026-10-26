import { useCallback, useEffect, useState } from "react";
import { Bell, Check, ChevronDown, LogOut, Search, X } from "lucide-react";
import { api } from "./api";
import { navItems } from "./data";
import type { DashboardData, ResourceName, Row, User } from "./types";
import Sidebar from "./components/Sidebar";
import EntityPage from "./components/EntityPage";
import Dashboard from "./pages/Dashboard";
import AiStudio from "./pages/AiStudio";

const resourceKeys: ResourceName[] = ["tours", "destinations", "itineraries", "departures", "customers", "bookings", "payments", "guides", "assignments", "feedback"];
const roleResources: Record<User["role"], ResourceName[]> = {
  admin: resourceKeys,
  consultant: resourceKeys.filter((key) => key !== "payments"),
  accountant: ["tours", "departures", "customers", "bookings", "payments"],
};
const emptyData: Record<ResourceName, Row[]> = {
  tours: [], destinations: [], itineraries: [], departures: [], customers: [],
  bookings: [], payments: [], guides: [], assignments: [], feedback: [],
};

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem("viettour-token") ?? "");
  const [user, setUser] = useState<User | null>(null);
  const [login, setLogin] = useState({ username: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);
  const [active, setActive] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [data, setData] = useState(emptyData);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; kind: "success" | "error" } | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);

  const notify = useCallback((message: string, kind: "success" | "error" = "success") => {
    setToast({ message, kind });
    window.setTimeout(() => setToast(null), 4200);
  }, []);

  const loadWorkspace = useCallback(async (accessToken: string, role: User["role"]) => {
    setLoading(true);
    try {
      const readable = roleResources[role];
      const [overview, ...collections] = await Promise.all([
        api.dashboard(accessToken),
        ...readable.map((key) => api.list(accessToken, key)),
      ]);
      setDashboard(overview);
      const next = { ...emptyData };
      readable.forEach((key, index) => { next[key] = collections[index]; });
      setData(next);
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    if (!token) return;
    let alive = true;
    api.me(token).then((profile) => {
      if (!alive) return;
      setUser(profile);
      void loadWorkspace(token, profile.role).catch((error: unknown) => {
        if (alive) notify(error instanceof Error ? error.message : "Không thể tải dữ liệu.", "error");
      });
    }).catch(() => {
      localStorage.removeItem("viettour-token");
      setToken("");
      setUser(null);
    });
    return () => { alive = false; };
  }, [token, loadWorkspace, notify]);

  async function submitLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginBusy(true);
    setLoginError("");
    try {
      const result = await api.login(login.username, login.password);
      localStorage.setItem("viettour-token", result.access_token);
      setUser(result.user);
      setToken(result.access_token);
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "Không thể đăng nhập.");
    } finally {
      setLoginBusy(false);
    }
  }

  function logout() {
    localStorage.removeItem("viettour-token");
    setToken("");
    setUser(null);
    setData(emptyData);
    setDashboard(null);
    setActive("dashboard");
  }

  async function reload() {
    if (token && user) await loadWorkspace(token, user.role);
  }

  if (!user || !token) {
    return <main className="login-screen"><div className="login-visual"><div className="login-brand"><div className="brand-mark"><span>V</span><i /></div><strong>viettour<span>ai</span></strong></div><div className="login-landscape"><div className="login-sun" /><div className="login-mountain mountain-one" /><div className="login-mountain mountain-two" /><div className="login-water" /><div className="login-caption"><span>ĐI VÀ CHẠM</span><h1>Mỗi hành trình<br />là một câu chuyện.</h1><p>Nền tảng vận hành dành riêng cho những người tạo nên chuyến đi đáng nhớ.</p></div></div><div className="login-visual-foot">VIETTOUR TRAVEL · KHÁM PHÁ VIỆT NAM</div></div><section className="login-form-area"><div className="login-form-wrap"><span className="eyebrow">CHÀO MỪNG BẠN TRỞ LẠI</span><h2>Đăng nhập</h2><p className="login-subtitle">Đăng nhập để tiếp tục quản lý hành trình của bạn.</p><form onSubmit={submitLogin}><label className="form-field"><span>Tên đăng nhập</span><input autoComplete="username" value={login.username} onChange={(event) => setLogin({ ...login, username: event.target.value })} required /></label><label className="form-field"><span>Mật khẩu</span><input type="password" autoComplete="current-password" value={login.password} onChange={(event) => setLogin({ ...login, password: event.target.value })} required /></label>{loginError && <div className="form-error" role="alert">{loginError}</div>}<button className="button button-primary login-submit" disabled={loginBusy}>{loginBusy ? "Đang đăng nhập…" : "Đăng nhập"} <span>→</span></button></form>{import.meta.env.DEV ? <div className="demo-accounts"><span className="eyebrow">TÀI KHOẢN DÙNG THỬ · CHỈ DEVELOPMENT</span>{[["admin", "Quản trị viên"], ["tuvan", "Tư vấn viên"], ["ketoan", "Kế toán"]].map(([name, label]) => <button key={name} onClick={() => setLogin((current) => ({ ...current, username: name }))}><span>{label}</span><strong>{name}</strong></button>)}<small>Mật khẩu dùng thử lấy từ biến <b>DEMO_PASSWORD</b> trong <b>backend\.env</b>.</small></div> : <div className="form-error" role="note">Đăng nhập demo đã tắt. Hãy cấu hình nhà cung cấp danh tính trước khi triển khai production.</div>}<p className="login-privacy">Đăng nhập an toàn · Phiên làm việc có thời hạn</p></div></section></main>;
  }

  const activeItem = navItems.find((item) => item.key === active);
  const content = active === "dashboard" ? <Dashboard data={dashboard} loading={loading} onNavigate={setActive} onNewBooking={() => setActive("bookings")} />
    : active === "ai" ? <AiStudio token={token} tours={data.tours} onToast={notify} />
      : <EntityPage resource={active as ResourceName} rows={data[active as ResourceName]} datasets={data} token={token} role={user.role} busy={loading} onReload={reload} onToast={notify} />;

  return <main className="app-shell">
    <Sidebar active={active} user={user} open={sidebarOpen} onNavigate={setActive} onClose={() => setSidebarOpen(false)} onToggle={() => setSidebarOpen((value) => !value)} />
    <section className="main-shell">
      <header className="topbar"><div className="breadcrumb"><span>VietTour Travel</span><i>/</i><strong>{activeItem?.label ?? "Tổng quan"}</strong></div><div className="topbar-actions"><label className="global-search"><Search size={16} /><input aria-label="Tìm kiếm nhanh" placeholder="Tìm kiếm..." /><kbd>⌘ K</kbd></label><button className="notification-button" aria-label="Thông báo"><Bell size={18} /><i /></button><div className="profile-wrap"><button className="profile-button" onClick={() => setProfileOpen((value) => !value)}><span className="profile-avatar">{user.name.charAt(0)}</span><span className="profile-details"><strong>{user.name}</strong><small>{user.role_label}</small></span><ChevronDown size={15} /></button>{profileOpen && <div className="profile-menu"><div><strong>{user.name}</strong><small>{user.role_label}</small></div><button onClick={logout}><LogOut size={15} /> Đăng xuất</button></div>}</div></div></header>
      {content}
      <footer className="app-footer"><span>© {new Date().getFullYear()} VietTour AI</span><span>Trải nghiệm du lịch Việt Nam, được vận hành tốt hơn.</span><span><i className="status-dot" /> Tất cả hệ thống hoạt động</span></footer>
    </section>
    {toast && <div className={`toast toast-${toast.kind}`} role="status"><span className="toast-icon">{toast.kind === "success" ? <Check size={16} /> : <X size={16} />}</span>{toast.message}<button aria-label="Đóng thông báo" onClick={() => setToast(null)}><X size={15} /></button></div>}
  </main>;
}
