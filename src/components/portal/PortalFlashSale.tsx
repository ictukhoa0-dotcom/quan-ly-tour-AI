import React, { useState, useEffect } from "react";
import {
  Flame,
  Clock,
  MapPin,
  Calendar,
  Users,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import type { PortalTour, PortalDeparture } from "../../types";
import { DESTINATION_IMAGES } from "./portalData";

type PortalFlashSaleProps = {
  tours: PortalTour[];
  departures: PortalDeparture[];
  onSelectTour: (tour: PortalTour) => void;
  onBookTour: (tour: PortalTour, departure?: PortalDeparture) => void;
};

export default function PortalFlashSale({
  tours,
  departures,
  onSelectTour,
  onBookTour,
}: PortalFlashSaleProps) {
  // Countdown simulation (e.g., 2 days, 14 hours, 28 minutes, 40 seconds)
  const [timeLeft, setTimeLeft] = useState({
    days: 2,
    hours: 14,
    minutes: 36,
    seconds: 45,
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: 59, seconds: 59 };
        if (prev.hours > 0) return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        if (prev.days > 0) return { ...prev, days: prev.days - 1, hours: 23, minutes: 59, seconds: 59 };
        return prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Filter flash sale tours: pick top 3 tours with active departures
  const flashTours = tours
    .filter((tour) => departures.some((d) => d.tour_id === tour.id && d.remaining_seats > 0))
    .slice(0, 3);

  if (flashTours.length === 0) return null;

  return (
    <section id="flash-sale" className="py-14 bg-gradient-to-b from-rose-50/70 via-white to-white dark:from-rose-950/20 dark:via-slate-900 dark:to-slate-900 border-b border-rose-100/60 dark:border-rose-900/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header with Title and Countdown Timer */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 text-xs font-bold uppercase tracking-wider mb-2">
              <Flame className="w-4 h-4 text-rose-600 animate-bounce" />
              <span>Tour Giờ Chót - Săn Vé Giá Tốt</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Khuyến Mãi Flash Sale Hôm Nay
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Số lượng chỗ có hạn, giá ưu đãi dành cho khách hàng đặt trực tuyến trong ngày
            </p>
          </div>

          {/* Countdown Clock (Saigontourist Style) */}
          <div className="flex items-center gap-2 bg-gradient-to-r from-rose-600 to-red-600 text-white p-2.5 sm:p-3 rounded-2xl shadow-md shadow-rose-500/20 shrink-0">
            <span className="text-xs font-bold uppercase tracking-wider hidden sm:inline ml-1">
              Kết thúc sau:
            </span>
            <div className="flex items-center gap-1.5 font-mono text-sm sm:text-base font-black">
              <div className="bg-black/30 rounded-lg px-2 py-1 text-center min-w-[32px]">
                {String(timeLeft.days).padStart(2, "0")}<span className="text-[10px] block font-sans font-normal opacity-80">Ngày</span>
              </div>
              <span>:</span>
              <div className="bg-black/30 rounded-lg px-2 py-1 text-center min-w-[32px]">
                {String(timeLeft.hours).padStart(2, "0")}<span className="text-[10px] block font-sans font-normal opacity-80">Giờ</span>
              </div>
              <span>:</span>
              <div className="bg-black/30 rounded-lg px-2 py-1 text-center min-w-[32px]">
                {String(timeLeft.minutes).padStart(2, "0")}<span className="text-[10px] block font-sans font-normal opacity-80">Phút</span>
              </div>
              <span>:</span>
              <div className="bg-black/30 rounded-lg px-2 py-1 text-center min-w-[32px] text-amber-300">
                {String(timeLeft.seconds).padStart(2, "0")}<span className="text-[10px] block font-sans font-normal opacity-80 text-white">Giây</span>
              </div>
            </div>
          </div>
        </div>

        {/* Flash Sale Tour Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {flashTours.map((tour) => {
            const tourDeps = departures.filter((d) => d.tour_id === tour.id && d.remaining_seats > 0);
            const nearestDep = tourDeps[0];
            const originalPrice = Math.round(tour.price * 1.25);
            const discountPercent = 20;
            const bgImage = tour.image_url?.trim() || DESTINATION_IMAGES[tour.destination_name] || DESTINATION_IMAGES["default"];

            return (
              <div
                key={tour.id}
                className="group bg-white dark:bg-slate-800 rounded-2xl shadow-md hover:shadow-xl border border-rose-200/70 dark:border-slate-700 overflow-hidden flex flex-col transition-all duration-300 hover:-translate-y-1"
              >
                {/* Image & Badges */}
                <div className="relative h-52 overflow-hidden">
                  <img
                    src={bgImage}
                    alt={tour.name}
                    className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />

                  {/* Flash sale tag */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-gradient-to-r from-red-600 to-rose-600 text-white text-xs font-black px-2.5 py-1 rounded-full shadow-lg">
                    <Flame className="w-3.5 h-3.5 animate-pulse" />
                    <span>GIẢM {discountPercent}%</span>
                  </div>

                  {/* Destination pill */}
                  <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md text-white text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-amber-400" />
                    <span>{tour.destination_name}</span>
                  </div>

                  {/* Remaining seats warning */}
                  {nearestDep && (
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-white">
                      <span className="bg-amber-500/90 text-slate-950 font-black px-2 py-0.5 rounded-md flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" /> Chỉ còn {nearestDep.remaining_seats} chỗ
                      </span>
                      <span className="font-semibold bg-black/50 backdrop-blur-sm px-2 py-0.5 rounded-md">
                        {tour.duration_days} Ngày {tour.duration_days - 1} Đêm
                      </span>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3
                      onClick={() => onSelectTour(tour)}
                      className="font-bold text-base sm:text-lg text-slate-900 dark:text-white line-clamp-2 hover:text-blue-600 transition-colors cursor-pointer mb-2"
                      title={tour.name}
                    >
                      {tour.name}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-4">
                      {tour.description}
                    </p>

                    {nearestDep && (
                      <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-700/50 p-2.5 rounded-xl mb-4">
                        <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
                        <span>Khởi hành gần nhất:</span>
                        <strong className="text-slate-800 dark:text-slate-100">{nearestDep.departure_date}</strong>
                      </div>
                    )}
                  </div>

                  {/* Price & Action */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between gap-2">
                    <div>
                      <div className="text-xs text-slate-400 line-through">
                        {originalPrice.toLocaleString("vi-VN")} ₫
                      </div>
                      <div className="text-lg sm:text-xl font-black text-rose-600 dark:text-rose-400">
                        {tour.price.toLocaleString("vi-VN")} ₫
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onSelectTour(tour)}
                        className="px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
                      >
                        Chi tiết
                      </button>
                      <button
                        type="button"
                        onClick={() => onBookTour(tour, nearestDep)}
                        className="bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-md shadow-rose-500/20 transition-all transform hover:-translate-y-0.5 cursor-pointer flex items-center gap-1"
                      >
                        <span>Đặt ngay</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
