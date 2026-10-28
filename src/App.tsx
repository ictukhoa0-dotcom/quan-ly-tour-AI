import { useCallback, useEffect, useState } from "react";
import { Bell, Check, ChevronDown, LogOut, Moon, Search, Sun, X } from "lucide-react";
import { api, type ListFilters } from "./api";
import { navItems } from "./data";
import type { DashboardData, ResourceName, Row, User } from "./types";
import Sidebar from "./components/Sidebar";
import EntityPage from "./components/EntityPage";
import Dashboard from "./pages/Dashboard";
import AiStudio from "./pages/AiStudio";
import UserManagement from "./pages/UserManagement";

const resourceKeys: ResourceName[] = ["tours", "destinations", "itineraries", "departures", "customers", "bookings", "payments", "guides", "assignments", "feedback"];
const roleResources: Record<User["role"], ResourceName[]> = {
  admin: resourceKeys,
  tu_van: ["tours", "departures", "customers", "bookings"],
};
const emptyData: Record<ResourceName, Row[]> = {
  tours: [], destinations: [], itineraries: [], departures: [], customers: [],
  bookings: [], payments: [], guides: [], assignments: [], feedback: [],
};

export default function App() {
  const [authReady, setAuthReady] = useState(false);
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
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("viettour-theme") === "dark");

  const notify = useCallback((message: string, kind: "success" | "error" = "success") => {
    setToast({ message, kind });
    window.setTimeout(() => setToast(null), 4200);
  }, []);

  const navigate = useCallback((key: string) => {
    const item = navItems.find((candidate) => candidate.key === key);
    if (!item || (item.roles && (!user || !item.roles.includes(user.role)))) {
      notify("Bạn không có quyền truy cập mục này.", "error");
      setActive("dashboard");
      return;
    }
    setActive(key);
  }, [notify, user]);

  const loadWorkspace = useCallback(async (role: User["role"]) => {
    setLoading(true);
    try {
      const readable = roleResources[role];
      const [overview, ...collections] = await Promise.all([
        api.dashboard(),
        ...readable.map((key) => key === "customers" || key === "bookings"
          ? api.listPage(key, { page: 1, limit: 20 }).then((result) => result.items)
          : api.list(key)),
      ]);
      setDashboard(overview);
      const next = { ...emptyData };
      readable.forEach((key, index) => { next[key] = collections[index]; });
      setData(next);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Không thể tải dữ liệu.", "error");
      throw error;
    } finally {
      setLoading(false);
    }
  }, [notify]);

  const loadPage = useCallback((resource: "customers" | "bookings", filters: ListFilters) =>
    api.listPage(resource, filters), []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("viettour-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  useEffect(() => {
    let alive = true;
    api.me().then((profile) => {
      if (!alive) return;
      setUser(profile);
      setAuthReady(true);
      void loadWorkspace(profile.role).catch(() => undefined);
    }).catch(() => {
      if (!alive) return;
      setUser(null);
      setAuthReady(true);
    });
    return () => { alive = false; };
  }, [loadWorkspace]);

  async function submitLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginBusy(true);
    setLoginError("");
    try {
      const result = await api.login(login.username, login.password);
      setUser(result.user);
      setAuthReady(true);
      setLogin({ username: "", password: "" });
      void loadWorkspace(result.user.role).catch(() => undefined);
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "Không thể đăng nhập.");
    } finally {
      setLoginBusy(false);
    }
  }

  async function logout() {
    try {
      await api.logout();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Không thể kết thúc phiên đăng nhập.", "error");
    }
    setUser(null);
    setData(emptyData);
    setDashboard(null);
    setActive("dashboard");
  }

  async function reload() {
    if (user) await loadWorkspace(user.role);
  }

  if (!authReady) return <main className="login-screen"><section className="login-form-area">Đang kiểm tra phiên đăng nhập…</section></main>;
  if (!user) {
    return <main className="login-screen"><div className="login-visual"><div className="login-brand"><div className="brand-mark"><span>V</span><i /></div><strong>viettour<span>ai</span></strong></div><div className="login-landscape"><div className="login-sun" /><div className="login-mountain mountain-one" /><div className="login-mountain mountain-two" /><div className="login-water" /><div className="login-caption"><span>ĐI VÀ CHẠM</span><h1>Mỗi hành trình<br />là một câu chuyện.</h1><p>Nền tảng vận hành dành riêng cho những người tạo nên chuyến đi đáng nhớ.</p></div></div><div className="login-visual-foot">VIETTOUR TRAVEL · KHÁM PHÁ VIỆT NAM</div></div><section className="login-form-area"><div className="login-form-wrap"><span className="eyebrow">CHÀO MỪNG BẠN TRỞ LẠI</span><h2>Đăng nhập</h2><p className="login-subtitle">Đăng nhập để tiếp tục quản lý hành trình của bạn.</p><form onSubmit={submitLogin}><label className="form-field"><span>Tên đăng nhập</span><input autoComplete="username" value={login.username} onChange={(event) => setLogin({ ...login, username: event.target.value })} required /></label><label className="form-field"><span>Mật khẩu</span><input type="password" autoComplete="current-password" value={login.password} onChange={(event) => setLogin({ ...login, password: event.target.value })} required /></label>{loginError && <div className="form-error" role="alert">{loginError}</div>}<button className="button button-primary login-submit" disabled={loginBusy}>{loginBusy ? "Đang đăng nhập…" : "Đăng nhập"} <span>→</span></button></form><p className="login-privacy">Tài khoản do quản trị viên cấp · Phiên làm việc có thời hạn</p></div></section></main>;
  }

  const activeItem = navItems.find((item) => item.key === active && (!item.roles || item.roles.includes(user.role)));
  const activePage = activeItem?.key ?? "dashboard";
  const content = activePage === "dashboard" ? <Dashboard data={dashboard} loading={loading} role={user.role} onNavigate={navigate} onNewBooking={() => navigate("bookings")} />
    : activePage === "ai" ? <AiStudio tours={data.tours} onToast={notify} />
      : activePage === "users" ? <UserManagement currentUser={user} onToast={notify} onPasswordChanged={logout} />
        : <EntityPage resource={activePage as ResourceName} rows={data[activePage as ResourceName]} datasets={data} role={user.role} busy={loading} onReload={reload} onLoadPage={loadPage} onToast={notify} />;

  return <main className="app-shell">
    <Sidebar active={activePage} user={user} open={sidebarOpen} onNavigate={navigate} onClose={() => setSidebarOpen(false)} onToggle={() => setSidebarOpen((value) => !value)} />
    <section className="main-shell">
      <header className="topbar"><div className="breadcrumb"><span>VietTour Travel</span><i>/</i><strong>{activeItem?.label ?? "Tổng quan"}</strong></div><div className="topbar-actions"><label className="global-search"><Search size={16} /><input aria-label="Tìm kiếm nhanh" placeholder="Tìm kiếm..." /><kbd>⌘ K</kbd></label><button className="theme-toggle" aria-label={darkMode ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối"} title={darkMode ? "Giao diện sáng" : "Giao diện tối"} onClick={() => setDarkMode((value) => !value)}>{darkMode ? <Sun size={18} /> : <Moon size={18} />}</button><button className="notification-button" aria-label="Thông báo"><Bell size={18} /><i /></button><div className="profile-wrap"><button className="profile-button" onClick={() => setProfileOpen((value) => !value)}><span className="profile-avatar">{user.name.charAt(0)}</span><span className="profile-details"><strong>{user.name}</strong><small>{user.role_label}</small></span><ChevronDown size={15} /></button>{profileOpen && <div className="profile-menu"><div><strong>{user.name}</strong><small>{user.role_label}</small></div><button onClick={logout}><LogOut size={15} /> Đăng xuất</button></div>}</div></div></header>
      {content}
      <footer className="app-footer"><span>© {new Date().getFullYear()} VietTour AI</span><span>Trải nghiệm du lịch Việt Nam, được vận hành tốt hơn.</span><span><i className="status-dot" /> Tất cả hệ thống hoạt động</span></footer>
    </section>
    {toast && <div className={`toast toast-${toast.kind}`} role="status"><span className="toast-icon">{toast.kind === "success" ? <Check size={16} /> : <X size={16} />}</span>{toast.message}<button aria-label="Đóng thông báo" onClick={() => setToast(null)}><X size={15} /></button></div>}
  </main>;
}
