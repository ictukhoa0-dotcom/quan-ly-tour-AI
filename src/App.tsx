import { useCallback, useEffect, useState } from "react";
import {
  Bell,
  Check,
  ChevronDown,
  Globe,
  LogOut,
  Moon,
  Search,
  Sun,
  X,
} from "lucide-react";
import { api, type ListFilters } from "./api";
import { navItems } from "./data";
import type { DashboardData, ResourceName, Row, User } from "./types";
import Sidebar from "./components/Sidebar";
import EntityPage from "./components/EntityPage";
import Dashboard from "./pages/Dashboard";
import AiStudio from "./pages/AiStudio";
import UserManagement from "./pages/UserManagement";
import TravelPortal from "./pages/TravelPortal";
import LoginModal from "./components/portal/LoginModal";

const resourceKeys: ResourceName[] = [
  "tours", "destinations", "itineraries", "departures", "customers",
  "bookings", "payments", "guides", "assignments", "feedback",
];

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
  const [viewMode, setViewMode] = useState<"portal" | "admin">("portal");
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  const [rememberAdmin, setRememberAdmin] = useState(() => {
    return localStorage.getItem("viettour_remember_admin") === "true";
  });
  const [login, setLogin] = useState(() => ({
    username: localStorage.getItem("viettour_admin_username") || "",
    password: "",
  }));
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
      const result = await api.login(login.username, login.password, rememberAdmin);
      if (rememberAdmin) {
        localStorage.setItem("viettour_remember_admin", "true");
        localStorage.setItem("viettour_admin_username", login.username);
      } else {
        localStorage.setItem("viettour_remember_admin", "false");
        localStorage.removeItem("viettour_admin_username");
      }
      setUser(result.user);
      setAuthReady(true);
      setLogin({ username: rememberAdmin ? login.username : "", password: "" });
      setLoginModalOpen(false);
      setViewMode("admin");
      notify(`Đăng nhập thành công! Chào mừng ${result.user.name}.`, "success");
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
    setViewMode("portal");
    notify("Đã đăng xuất khỏi hệ thống.", "success");
  }

  async function reload() {
    if (user) await loadWorkspace(user.role);
  }

  if (!authReady) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-900 text-white font-medium">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span>Đang khởi động VietTour AI...</span>
        </div>
      </main>
    );
  }

  // 1. If currently in Portal view (default for customers & visitors)
  if (viewMode === "portal" || !user) {
    return (
      <>
        <TravelPortal
          user={user}
          darkMode={darkMode}
          onToggleDarkMode={() => setDarkMode((prev) => !prev)}
          onAdminLoginSuccess={(adminUser) => {
            setUser(adminUser);
            setAuthReady(true);
            setViewMode("admin");
            notify(`Đăng nhập thành công! Chào mừng ${adminUser.name}.`, "success");
            void loadWorkspace(adminUser.role).catch(() => undefined);
          }}
          onOpenLogin={() => setLoginModalOpen(true)}
          onGoToAdmin={() => setViewMode("admin")}
          onNotify={notify}
        />

        {/* Admin Login Dialog */}
        <LoginModal
          isOpen={loginModalOpen}
          loginData={login}
          loginBusy={loginBusy}
          loginError={loginError}
          rememberMe={rememberAdmin}
          onChangeRememberMe={setRememberAdmin}
          onClose={() => setLoginModalOpen(false)}
          onChangeLogin={setLogin}
          onSubmitLogin={submitLogin}
        />

        {toast && (
          <div className={`toast toast-${toast.kind}`} role="status">
            <span className="toast-icon">
              {toast.kind === "success" ? <Check size={16} /> : <X size={16} />}
            </span>
            {toast.message}
            <button aria-label="Đóng thông báo" onClick={() => setToast(null)}>
              <X size={15} />
            </button>
          </div>
        )}
      </>
    );
  }

  // 2. If in Admin Management view (for authenticated staff / admin)
  const activeItem = navItems.find((item) => item.key === active && (!item.roles || item.roles.includes(user.role)));
  const activePage = activeItem?.key ?? "dashboard";
  const content = activePage === "dashboard" ? (
    <Dashboard data={dashboard} loading={loading} role={user.role} onNavigate={navigate} onNewBooking={() => navigate("bookings")} />
  ) : activePage === "ai" ? (
    <AiStudio tours={data.tours} onToast={notify} />
  ) : activePage === "users" ? (
    <UserManagement currentUser={user} onToast={notify} onPasswordChanged={logout} />
  ) : (
    <EntityPage
      resource={activePage as ResourceName}
      rows={data[activePage as ResourceName]}
      datasets={data}
      role={user.role}
      busy={loading}
      onReload={reload}
      onLoadPage={loadPage}
      onToast={notify}
    />
  );

  return (
    <main className="app-shell">
      <Sidebar
        active={activePage}
        user={user}
        open={sidebarOpen}
        onNavigate={navigate}
        onClose={() => setSidebarOpen(false)}
        onToggle={() => setSidebarOpen((value) => !value)}
        onGoToPortal={() => setViewMode("portal")}
      />
      <section className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <span>VietTour Travel</span>
            <i>/</i>
            <strong>{activeItem?.label ?? "Tổng quan"}</strong>
          </div>
          <div className="topbar-actions">
            {/* Switch back to Website Portal button */}
            <button
              type="button"
              onClick={() => setViewMode("portal")}
              className="flex items-center gap-1.5 text-xs font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 px-3 py-1.5 rounded-lg transition-colors cursor-pointer mr-2 shadow-xs"
              title="Quay lại Cổng du lịch dành cho khách hàng"
            >
              <Globe size={15} />
              <span>Xem Website Du Lịch</span>
            </button>

            <label className="global-search">
              <Search size={16} />
              <input aria-label="Tìm kiếm nhanh" placeholder="Tìm kiếm..." />
              <kbd>⌘ K</kbd>
            </label>
            <button
              className="theme-toggle"
              aria-label={darkMode ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối"}
              title={darkMode ? "Giao diện sáng" : "Giao diện tối"}
              onClick={() => setDarkMode((value) => !value)}
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button className="notification-button" aria-label="Thông báo">
              <Bell size={18} />
              <i />
            </button>
            <div className="profile-wrap">
              <button className="profile-button" onClick={() => setProfileOpen((value) => !value)}>
                <span className="profile-avatar">{user.name.charAt(0)}</span>
                <span className="profile-details">
                  <strong>{user.name}</strong>
                  <small>{user.role_label}</small>
                </span>
                <ChevronDown size={15} />
              </button>
              {profileOpen && (
                <div className="profile-menu">
                  <div>
                    <strong>{user.name}</strong>
                    <small>{user.role_label}</small>
                  </div>
                  <button onClick={() => setViewMode("portal")}>
                    <Globe size={15} /> Xem Cổng Du Lịch
                  </button>
                  <button onClick={logout}>
                    <LogOut size={15} /> Đăng xuất
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {content}

        <footer className="app-footer">
          <span>© {new Date().getFullYear()} VietTour AI</span>
          <span>Trải nghiệm du lịch Việt Nam, được vận hành tốt hơn.</span>
          <span>
            <i className="status-dot" /> Tất cả hệ thống hoạt động
          </span>
        </footer>
      </section>

      {toast && (
        <div className={`toast toast-${toast.kind}`} role="status">
          <span className="toast-icon">
            {toast.kind === "success" ? <Check size={16} /> : <X size={16} />}
          </span>
          {toast.message}
          <button aria-label="Đóng thông báo" onClick={() => setToast(null)}>
            <X size={15} />
          </button>
        </div>
      )}
    </main>
  );
}
