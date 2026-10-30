import React, { useState, useEffect } from "react";
import { X, Lock, Phone, User, Mail, MapPin, ArrowRight, Sparkles, Shield } from "lucide-react";
import { api } from "../../api";
import type { CustomerUser, User as AdminUser } from "../../types";

type CustomerAuthModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (customer: CustomerUser) => void;
  onAdminSuccess?: (user: AdminUser) => void;
  onOpenAdminLogin?: () => void;
  initialRoleTab?: "customer" | "admin";
};

export default function CustomerAuthModal({
  isOpen,
  onClose,
  onSuccess,
  onAdminSuccess,
  initialRoleTab = "customer",
}: CustomerAuthModalProps) {
  // Main role tab: "customer" vs "admin"
  const [roleTab, setRoleTab] = useState<"customer" | "admin">(initialRoleTab);

  // Customer sub-tab: "login" vs "register"
  const [mode, setMode] = useState<"login" | "register">("login");

  // Customer login form
  const [loginPhone, setLoginPhone] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Customer register form
  const [regName, setRegName] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regAddress, setRegAddress] = useState("");

  // Admin login form
  const [adminUsername, setAdminUsername] = useState("admin");
  const [adminPassword, setAdminPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setRoleTab(initialRoleTab);
      setError("");
    }
  }, [isOpen, initialRoleTab]);

  if (!isOpen) return null;

  async function handleCustomerLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!loginPhone.trim() || !loginPassword) {
      setError("Vui lòng điền đầy đủ số điện thoại và mật khẩu.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await api.customerLogin({
        phone: loginPhone.trim(),
        password: loginPassword,
      });
      onSuccess(res.customer);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCustomerRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!regName.trim() || !regPhone.trim() || !regPassword) {
      setError("Vui lòng nhập họ tên, số điện thoại và mật khẩu.");
      return;
    }
    if (regPassword.length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await api.customerRegister({
        name: regName.trim(),
        phone: regPhone.trim(),
        password: regPassword,
        email: regEmail.trim(),
        address: regAddress.trim(),
      });
      onSuccess(res.customer);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Đăng ký thất bại. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAdminLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!adminUsername.trim() || !adminPassword) {
      setError("Vui lòng điền đầy đủ tên đăng nhập và mật khẩu quản trị.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await api.login(adminUsername.trim(), adminPassword);
      if (onAdminSuccess) {
        onAdminSuccess(res.user);
      }
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Đăng nhập quản trị thất bại. Vui lòng kiểm tra lại thông tin.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-fadeIn">
      <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 sm:p-8 max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand Icon & Heading */}
        <div className="text-center mb-5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-700 via-indigo-600 to-blue-800 text-white flex items-center justify-center mx-auto mb-3 shadow-md shadow-blue-500/25">
            {roleTab === "admin" ? (
              <Shield className="w-6 h-6 text-amber-300" />
            ) : (
              <Sparkles className="w-6 h-6 text-amber-300" />
            )}
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white">
            {roleTab === "admin" ? "Đăng Nhập Quản Trị Hệ Thống" : "Đăng Nhập Khách Hàng"}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            VietTour AI • Du lịch & Điều hành tour thông minh
          </p>
        </div>

        {/* Role Tab Selector (Khách Hàng vs Quản Trị) */}
        <div className="grid grid-cols-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl mb-4 gap-1">
          <button
            type="button"
            onClick={() => { setRoleTab("customer"); setError(""); }}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              roleTab === "customer"
                ? "bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <User className="w-4 h-4" />
            <span>Khách hàng</span>
          </button>
          <button
            type="button"
            onClick={() => { setRoleTab("admin"); setError(""); }}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              roleTab === "admin"
                ? "bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Quản trị viên</span>
          </button>
        </div>

        {error && (
          <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs p-3 rounded-xl mb-4 font-medium">
            {error}
          </div>
        )}

        {/* ===== TAB 1: KHÁCH HÀNG ===== */}
        {roleTab === "customer" && (
          <>
            {/* Customer Sub-tabs: Đăng nhập vs Đăng ký */}
            <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl mb-4">
              <button
                type="button"
                onClick={() => { setMode("login"); setError(""); }}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  mode === "login"
                    ? "bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                Đăng Nhập
              </button>
              <button
                type="button"
                onClick={() => { setMode("register"); setError(""); }}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  mode === "register"
                    ? "bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                Đăng Ký Mới
              </button>
            </div>

            {mode === "login" ? (
              /* Customer Login Form */
              <form onSubmit={handleCustomerLogin} className="space-y-4">
                <div>
                  <label htmlFor="customer-login-phone" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Số điện thoại
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      id="customer-login-phone"
                      type="text"
                      required
                      autoComplete="username"
                      value={loginPhone}
                      onChange={(e) => setLoginPhone(e.target.value)}
                      placeholder="0912345678"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="customer-login-password" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Mật khẩu
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      id="customer-login-password"
                      type="password"
                      required
                      autoComplete="current-password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-700 to-indigo-600 hover:from-blue-800 hover:to-indigo-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-sm shadow-lg shadow-blue-500/25 transition-all transform hover:-translate-y-0.5 cursor-pointer flex items-center justify-center gap-2 mt-2"
                >
                  <span>{loading ? "Đang xử lý..." : "Đăng Nhập Khách Hàng"}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            ) : (
              /* Customer Register Form */
              <form onSubmit={handleCustomerRegister} className="space-y-3">
                <div>
                  <label htmlFor="customer-reg-name" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Họ và tên *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      id="customer-reg-name"
                      type="text"
                      required
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="Nguyễn Văn A"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="customer-reg-phone" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Số điện thoại *
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      id="customer-reg-phone"
                      type="tel"
                      required
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      placeholder="0912345678"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="customer-reg-password" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Mật khẩu (tối thiểu 6 ký tự) *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      id="customer-reg-password"
                      type="password"
                      required
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="customer-reg-email" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Email nhận vé điện tử (tùy chọn)
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      id="customer-reg-email"
                      type="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="email@example.com"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="customer-reg-address" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Địa chỉ / Tỉnh thành (tùy chọn)
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      id="customer-reg-address"
                      type="text"
                      value={regAddress}
                      onChange={(e) => setRegAddress(e.target.value)}
                      placeholder="Hà Nội / TP.HCM..."
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-700 to-indigo-600 hover:from-blue-800 hover:to-indigo-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-sm shadow-lg shadow-blue-500/25 transition-all transform hover:-translate-y-0.5 cursor-pointer flex items-center justify-center gap-2 mt-2"
                >
                  <span>{loading ? "Đang tạo tài khoản..." : "Đăng Ký Tài Khoản"}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}

            {/* Quick Switch to Admin Tab */}
            <div className="mt-5 pt-3.5 border-t border-slate-100 dark:border-slate-800 text-center">
              <button
                type="button"
                onClick={() => { setRoleTab("admin"); setError(""); }}
                className="text-xs text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 inline-flex items-center gap-1.5 font-semibold transition-colors cursor-pointer"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Bạn là nhân viên điều hành? Đăng nhập Quản trị tại đây</span>
              </button>
            </div>
          </>
        )}

        {/* ===== TAB 2: QUẢN TRỊ VIÊN / NHÂN VIÊN ===== */}
        {roleTab === "admin" && (
          <div>
            <div className="flex items-center gap-2.5 p-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 rounded-xl text-xs text-indigo-700 dark:text-indigo-300 mb-4">
              <Shield className="w-4 h-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
              <span>Dành cho Quản trị viên (Admin) và Nhân viên tư vấn điều hành hệ thống VietTour AI.</span>
            </div>

            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label htmlFor="admin-login-username" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tên tài khoản quản trị
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    id="admin-login-username"
                    type="text"
                    required
                    autoComplete="username"
                    value={adminUsername}
                    onChange={(e) => setAdminUsername(e.target.value)}
                    placeholder="admin"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="admin-login-password" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Mật khẩu quản trị
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    id="admin-login-password"
                    type="password"
                    required
                    autoComplete="current-password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-indigo-700 via-blue-700 to-indigo-800 hover:from-indigo-800 hover:to-blue-800 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-sm shadow-lg shadow-indigo-500/25 transition-all transform hover:-translate-y-0.5 cursor-pointer flex items-center justify-center gap-2 mt-2"
              >
                <span>{loading ? "Đang xác thực..." : "Đăng Nhập Quản Trị"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Quick Switch to Customer Tab */}
            <div className="mt-5 pt-3.5 border-t border-slate-100 dark:border-slate-800 text-center">
              <button
                type="button"
                onClick={() => { setRoleTab("customer"); setError(""); }}
                className="text-xs text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 inline-flex items-center gap-1.5 font-semibold transition-colors cursor-pointer"
              >
                <User className="w-3.5 h-3.5" />
                <span>Bạn là khách hàng du lịch? Đăng nhập Khách hàng tại đây</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
