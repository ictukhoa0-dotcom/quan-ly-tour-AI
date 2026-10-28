import React, { useState, useEffect } from "react";
import {
  Search,
  MapPin,
  Calendar,
  Wallet,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Headphones,
  Award,
  Users,
} from "lucide-react";
import type { PortalDestination } from "../../types";
import { HERO_SLIDES } from "./portalData";

type PortalHeroProps = {
  destinations: PortalDestination[];
  onSearch: (filters: {
    destinationId?: number;
    maxPrice?: number;
    departureDate?: string;
  }) => void;
  onOpenAIChat: () => void;
};

export default function PortalHero({
  destinations,
  onSearch,
  onOpenAIChat,
}: PortalHeroProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [selectedDestination, setSelectedDestination] = useState<string>("");
  const [departureDate, setDepartureDate] = useState<string>("");
  const [priceRange, setPriceRange] = useState<string>("");

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    let maxPrice: number | undefined;
    if (priceRange === "under3m") maxPrice = 3000000;
    else if (priceRange === "3to5m") maxPrice = 5000000;
    else if (priceRange === "above5m") maxPrice = 100000000;

    onSearch({
      destinationId: selectedDestination ? Number(selectedDestination) : undefined,
      maxPrice,
      departureDate: departureDate || undefined,
    });

    const el = document.getElementById("tours-section");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  }

  const slide = HERO_SLIDES[currentSlide];

  return (
    <div id="home" className="relative min-h-[580px] lg:min-h-[640px] flex items-center justify-center overflow-hidden bg-slate-900">
      {/* Background Slides */}
      {HERO_SLIDES.map((s, idx) => (
        <div
          key={s.title}
          className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
            idx === currentSlide ? "opacity-100 scale-100" : "opacity-0 scale-105 pointer-events-none"
          }`}
          style={{
            backgroundImage: `linear-gradient(to bottom, rgba(15, 23, 42, 0.55), rgba(15, 23, 42, 0.85)), url('${s.image}')`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            transform: idx === currentSlide ? "scale(1)" : "scale(1.05)",
            transition: "transform 7s ease-out, opacity 1s ease-in-out",
          }}
        />
      ))}

      {/* Hero Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24 w-full">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/25 text-amber-300 text-xs sm:text-sm font-semibold mb-5 shadow-lg animate-fadeIn">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Nền tảng Du lịch Việt Nam Thế hệ Mới</span>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span className="text-white font-medium">{slide.highlight}</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight mb-4 drop-shadow-md">
            {slide.title}
          </h1>

          <p className="text-base sm:text-lg text-slate-200 font-medium mb-6 drop-shadow">
            {slide.subtitle}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={onOpenAIChat}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-orange-500/30 transition-transform transform hover:-translate-y-0.5 cursor-pointer text-sm"
            >
              <Sparkles className="w-4 h-4" />
              <span>Nhận gợi ý tour từ AI</span>
            </button>
            <a
              href="#flash-sale"
              className="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/30 text-white font-semibold px-5 py-2.5 rounded-xl transition-all cursor-pointer text-sm"
            >
              <span>Xem tour giờ chót</span>
              <ChevronRight className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Floating Saigontourist-Style Search & Booking Bar */}
        <div className="max-w-5xl mx-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-2xl border border-white/30 dark:border-slate-800 p-4 sm:p-6 transition-all">
          <div className="flex items-center gap-2 mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
            <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400 flex items-center gap-2">
              <Search className="w-4 h-4 text-blue-600" /> Tìm kiếm & Giữ chỗ tour trực tuyến
            </span>
            <span className="text-xs text-slate-400 hidden sm:inline">• Cập nhật số chỗ trống thời gian thực</span>
          </div>

          <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Field 1: Điểm đến */}
            <div className="bg-slate-50 dark:bg-slate-800/80 rounded-xl p-3 border border-slate-200 dark:border-slate-700 hover:border-blue-500 transition-colors">
              <label htmlFor="portal-dest-select" className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> Điểm đến
              </label>
              <select
                id="portal-dest-select"
                value={selectedDestination}
                onChange={(e) => setSelectedDestination(e.target.value)}
                className="w-full bg-transparent font-semibold text-slate-800 dark:text-slate-100 text-sm focus:outline-none cursor-pointer"
              >
                <option value="" className="text-slate-900">Tất cả điểm đến</option>
                {destinations.map((d) => (
                  <option key={d.id} value={d.id} className="text-slate-900">
                    {d.name} ({d.region})
                  </option>
                ))}
              </select>
            </div>

            {/* Field 2: Ngày khởi hành */}
            <div className="bg-slate-50 dark:bg-slate-800/80 rounded-xl p-3 border border-slate-200 dark:border-slate-700 hover:border-blue-500 transition-colors">
              <label htmlFor="portal-date-input" className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> Ngày đi
              </label>
              <input
                id="portal-date-input"
                type="date"
                value={departureDate}
                onChange={(e) => setDepartureDate(e.target.value)}
                className="w-full bg-transparent font-semibold text-slate-800 dark:text-slate-100 text-sm focus:outline-none cursor-pointer"
              />
            </div>

            {/* Field 3: Ngân sách */}
            <div className="bg-slate-50 dark:bg-slate-800/80 rounded-xl p-3 border border-slate-200 dark:border-slate-700 hover:border-blue-500 transition-colors">
              <label htmlFor="portal-price-select" className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                <Wallet className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> Ngân sách / Khách
              </label>
              <select
                id="portal-price-select"
                value={priceRange}
                onChange={(e) => setPriceRange(e.target.value)}
                className="w-full bg-transparent font-semibold text-slate-800 dark:text-slate-100 text-sm focus:outline-none cursor-pointer"
              >
                <option value="" className="text-slate-900">Tất cả mức giá</option>
                <option value="under3m" className="text-slate-900">Dưới 3.500.000 ₫</option>
                <option value="3to5m" className="text-slate-900">3.500.000 ₫ - 5.000.000 ₫</option>
                <option value="above5m" className="text-slate-900">Trên 5.000.000 ₫</option>
              </select>
            </div>

            {/* Action Search Button */}
            <div className="flex items-end">
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 hover:from-blue-800 hover:to-indigo-700 text-white font-bold py-3.5 px-6 rounded-xl shadow-lg shadow-blue-600/30 transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2 cursor-pointer text-sm"
              >
                <Search className="w-4 h-4" />
                <span>Tìm kiếm tour</span>
              </button>
            </div>
          </form>
        </div>

        {/* Quick Trust Badges */}
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-4xl mx-auto text-white/90 text-xs sm:text-sm">
          <div className="flex items-center gap-2.5 justify-center bg-black/25 backdrop-blur-md rounded-xl py-2 px-3 border border-white/10">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>100% Giữ chỗ realtime</span>
          </div>
          <div className="flex items-center gap-2.5 justify-center bg-black/25 backdrop-blur-md rounded-xl py-2 px-3 border border-white/10">
            <Award className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Giá tour chuẩn niêm yết</span>
          </div>
          <div className="flex items-center gap-2.5 justify-center bg-black/25 backdrop-blur-md rounded-xl py-2 px-3 border border-white/10">
            <Headphones className="w-4 h-4 text-sky-400 shrink-0" />
            <span>Hỗ trợ tư vấn 24/7</span>
          </div>
          <div className="flex items-center gap-2.5 justify-center bg-black/25 backdrop-blur-md rounded-xl py-2 px-3 border border-white/10">
            <Users className="w-4 h-4 text-purple-400 shrink-0" />
            <span>Hướng dẫn viên tận tâm</span>
          </div>
        </div>
      </div>
    </div>
  );
}
