import React, { useState } from "react";
import {
  Compass,
  Phone,
  MapPin,
  ChevronDown,
  Sparkles,
  User,
  Shield,
  Moon,
  Sun,
  Flame,
  Package,
  LogOut,
  CalendarCheck,
} from "lucide-react";
import type { User as UserType, CustomerUser } from "../../types";

type PortalHeaderProps = {
  user: UserType | null;
  customer: CustomerUser | null;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenCustomerAuth: () => void;
  onOpenCustomerBookings: () => void;
  onCustomerLogout: () => void;
  onOpenLogin: () => void;
  onGoToAdmin: () => void;
  onOpenBookingPage?: () => void;
  onSelectRegion?: (region: string) => void;
  onSelectDestination?: (name: string) => void;
  onOpenAIChat?: () => void;
};

export default function PortalHeader({
  user,
  customer,
  darkMode,
  onToggleDarkMode,
  onOpenCustomerAuth,
  onOpenCustomerBookings,
  onCustomerLogout,
  onOpenLogin,
  onGoToAdmin,
  onOpenBookingPage,
  onSelectRegion,
  onSelectDestination,
  onOpenAIChat,
}: PortalHeaderProps) {
  const [selectedCity, setSelectedCity] = useState("Hà Nội");
  const [domesticOpen, setDomesticOpen] = useState(false);
  const [customerMenuOpen, setCustomerMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-sm border-b border-slate-200 dark:border-slate-800 transition-colors">
      {/* Top Banner Ticker Bar (Saigontourist signature style) */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-600 to-blue-800 text-white text-xs py-1.5 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 overflow-hidden text-ellipsis whitespace-nowrap">
            <span className="inline-flex items-center gap-1 bg-amber-400 text-slate-950 font-bold px-2 py-0.5 rounded-full text-[10px] tracking-wide shrink-0">
              <Sparkles className="w-3 h-3" /> ƯU ĐÃI
            </span>
            <span className="font-medium truncate">
              Chào mừng đến với VietTour AI • Trợ lý du lịch thông minh • Hotline đặt tour 24/7: 1900 6868
            </span>
          </div>
          <div className="hidden md:flex items-center gap-5 shrink-0 text-white/90">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-amber-300" />
              <span>Khởi hành từ:</span>
              <select
                aria-label="Khởi hành từ"
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="bg-blue-900/60 text-white border border-white/20 rounded px-1.5 py-0.5 text-xs focus:outline-none cursor-pointer"
              >
                <option value="Hà Nội" className="text-slate-900">Hà Nội</option>
                <option value="TP. Hồ Chí Minh" className="text-slate-900">TP. Hồ Chí Minh</option>
                <option value="Đà Nẵng" className="text-slate-900">Đà Nẵng</option>
                <option value="Cần Thơ" className="text-slate-900">Cần Thơ</option>
              </select>
            </div>
            <span className="text-white/30">|</span>
            <a
              href="tel:19006868"
              className="flex items-center gap-1 hover:text-amber-300 transition-colors font-semibold"
            >
              <Phone className="w-3.5 h-3.5 text-amber-300" />
              <span>1900 6868</span>
            </a>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18">
          {/* Logo & Brand Identity */}
          <div className="flex items-center gap-3">
            <a href="#home" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-500/25 group-hover:scale-105 transition-transform">
                <Compass className="w-6 h-6 text-white animate-spin-slow" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-xl font-black tracking-tight text-blue-900 dark:text-blue-400">VietTour</span>
                  <span className="text-xs font-extrabold uppercase px-1.5 py-0.5 rounded-md bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-xs">
                    AI
                  </span>
                </div>
                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 tracking-wider uppercase">
                  Du lịch & Quản lý thông minh
                </span>
              </div>
            </a>
          </div>

          {/* Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 text-[14.5px] font-semibold text-slate-700 dark:text-slate-200">
            <a
              href="#home"
              className="px-3 py-2 rounded-lg hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors"
            >
              Trang chủ
            </a>

            {/* Dropdown Tour Trong Nước */}
            <div
              className="relative"
              onMouseEnter={() => setDomesticOpen(true)}
              onMouseLeave={() => setDomesticOpen(false)}
            >
              <button
                type="button"
                className="flex items-center gap-1 px-3 py-2 rounded-lg hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <span>Tour trong nước</span>
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${domesticOpen ? "rotate-180" : ""}`} />
              </button>

              {domesticOpen && (
                <div className="absolute top-full left-0 w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-3 grid gap-2 animate-fadeIn z-50">
                  <div className="p-2 border-b border-slate-100 dark:border-slate-800">
                    <p className="text-xs font-bold uppercase text-blue-600 dark:text-blue-400 tracking-wider">
                      Khám phá 3 miền Việt Nam
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-1 text-sm">
                    <button
                      type="button"
                      onClick={() => { onSelectRegion?.("Miền Bắc"); setDomesticOpen(false); }}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-slate-800 text-left transition-colors cursor-pointer"
                    >
                      <div>
                        <div className="font-semibold text-slate-800 dark:text-slate-100">Miền Bắc</div>
                        <div className="text-xs text-slate-500">Hà Giang, Vịnh Hạ Long, Sa Pa...</div>
                      </div>
                      <span className="text-[11px] font-bold text-blue-600 bg-blue-100 dark:bg-blue-900/40 px-2 py-0.5 rounded-full">Hot</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { onSelectRegion?.("Miền Trung"); setDomesticOpen(false); }}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-slate-800 text-left transition-colors cursor-pointer"
                    >
                      <div>
                        <div className="font-semibold text-slate-800 dark:text-slate-100">Miền Trung</div>
                        <div className="text-xs text-slate-500">Huế, Đà Nẵng, Hội An, Nha Trang...</div>
                      </div>
                      <span className="text-[11px] font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-900/40 px-2 py-0.5 rounded-full">Di sản</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { onSelectRegion?.("Miền Nam"); setDomesticOpen(false); }}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-slate-800 text-left transition-colors cursor-pointer"
                    >
                      <div>
                        <div className="font-semibold text-slate-800 dark:text-slate-100">Miền Nam & Tây Nguyên</div>
                        <div className="text-xs text-slate-500">Phú Quốc, Cần Thơ, Đà Lạt...</div>
                      </div>
                      <span className="text-[11px] font-bold text-amber-600 bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 rounded-full">Nghỉ dưỡng</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <a
              href="#flash-sale"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors font-bold"
            >
              <Flame className="w-4 h-4 text-rose-500 animate-bounce" />
              <span>Tour Giờ Chót</span>
            </a>

            <a
              href="#destinations"
              className="px-3 py-2 rounded-lg hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors"
            >
              Điểm đến
            </a>

            <a
              href="#guide"
              className="px-3 py-2 rounded-lg hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors"
            >
              Cẩm nang
            </a>

            <button
              type="button"
              onClick={onOpenAIChat}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors cursor-pointer font-bold"
            >
              <Sparkles className="w-4 h-4 text-indigo-500" />
              <span>Trợ lý AI</span>
            </button>

            {/* Dedicated Booking Page CTA */}
            <button
              type="button"
              onClick={onOpenBookingPage}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white font-bold shadow-md shadow-orange-400/30 transition-all transform hover:-translate-y-0.5 cursor-pointer animate-pulse-slow"
            >
              <CalendarCheck className="w-4 h-4" />
              <span>Đặt Tour Ngay</span>
            </button>
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2.5">
            {/* Dark Mode */}
            <button
              type="button"
              onClick={onToggleDarkMode}
              className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              title={darkMode ? "Chuyển giao diện sáng" : "Chuyển giao diện tối"}
            >
              {darkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* Customer Authentication Area */}
            {customer ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setCustomerMenuOpen((v) => !v)}
                  className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-800 dark:text-blue-200 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold border border-blue-200/60 dark:border-blue-800 transition-all cursor-pointer"
                >
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-[11px] flex items-center justify-center">
                    {customer.name.charAt(0)}
                  </div>
                  <span className="max-w-[100px] truncate">{customer.name}</span>
                  <ChevronDown className="w-3.5 h-3.5 opacity-60" />
                </button>

                {customerMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-52 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-2 z-50 animate-fadeIn text-xs sm:text-sm">
                    <div className="p-2.5 border-b border-slate-100 dark:border-slate-800">
                      <div className="font-bold text-slate-900 dark:text-white truncate">{customer.name}</div>
                      <div className="text-xs text-slate-400">{customer.phone}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setCustomerMenuOpen(false); onOpenCustomerBookings(); }}
                      className="w-full flex items-center gap-2 p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-left text-slate-700 dark:text-slate-200 font-medium transition-colors cursor-pointer"
                    >
                      <Package className="w-4 h-4 text-blue-600" />
                      <span>Đơn tour của tôi</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setCustomerMenuOpen(false); onCustomerLogout(); }}
                      className="w-full flex items-center gap-2 p-2.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 text-left text-rose-600 font-medium transition-colors cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Đăng xuất</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={onOpenCustomerAuth}
                className="flex items-center gap-1.5 bg-gradient-to-r from-blue-700 to-indigo-600 hover:from-blue-800 hover:to-indigo-700 text-white px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-blue-500/25 transition-all transform hover:-translate-y-0.5 cursor-pointer"
              >
                <User className="w-4 h-4" />
                <span>Đăng nhập / Đăng ký</span>
              </button>
            )}

            {/* Admin Back-Office Switcher */}
            {user ? (
              <button
                type="button"
                onClick={onGoToAdmin}
                className="hidden sm:flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white px-3.5 py-2 rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
                title="Vào Bảng điều khiển quản trị"
              >
                <Shield className="w-3.5 h-3.5 text-amber-400" />
                <span>Quản trị ({user.role})</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenLogin}
                className="hidden md:flex items-center gap-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 text-xs font-semibold px-2 py-1 transition-colors cursor-pointer"
                title="Dành cho nhân viên & quản trị viên"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Admin</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
