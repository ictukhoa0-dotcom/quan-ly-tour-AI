import React, { useState } from "react";
import {
  MapPin,
  Calendar,
  Clock,
  Users,
  ChevronRight,
  Filter,
  CheckCircle2,
  Car,
  X,
} from "lucide-react";
import type { PortalTour, PortalDeparture } from "../../types";
import { DESTINATION_IMAGES } from "./portalData";

type PortalTourGridProps = {
  tours: PortalTour[];
  departures: PortalDeparture[];
  selectedRegion?: string;
  onClearFilters?: () => void;
  onSelectTour: (tour: PortalTour) => void;
  onBookTour: (tour: PortalTour, departure?: PortalDeparture) => void;
};

export default function PortalTourGrid({
  tours,
  departures,
  selectedRegion,
  onClearFilters,
  onSelectTour,
  onBookTour,
}: PortalTourGridProps) {
  const [activeTab, setActiveTab] = useState<string>("all");

  const tabs = [
    { key: "all", label: "Tất cả tour" },
    { key: "Miền Bắc", label: "Miền Bắc" },
    { key: "Miền Trung", label: "Miền Trung" },
    { key: "Miền Nam", label: "Miền Nam" },
    { key: "Khám phá", label: "Tour Khám phá" },
    { key: "Văn hóa", label: "Tour Văn hóa" },
    { key: "Nghỉ dưỡng", label: "Tour Nghỉ dưỡng" },
  ];

  // Filter tours by tab and search
  const filteredTours = tours.filter((tour) => {
    if (selectedRegion && tour.region !== selectedRegion) return false;
    if (activeTab === "all") return true;
    if (activeTab === "Miền Bắc" || activeTab === "Miền Trung" || activeTab === "Miền Nam") {
      return tour.region === activeTab;
    }
    return tour.category === activeTab;
  });

  return (
    <section id="tours-section" className="py-16 bg-slate-50/60 dark:bg-slate-900/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/40 px-3 py-1 rounded-full">
            Hành Trình Trải Nghiệm
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white tracking-tight mt-3">
            Tour Du Lịch Trong Nước Nổi Bật
          </h2>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mt-2">
            Khám phá trọn vẹn văn hóa, ẩm thực và cảnh sắc tuyệt mỹ cùng VietTour AI
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                activeTab === tab.key
                  ? "bg-blue-700 text-white shadow-md shadow-blue-500/25"
                  : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Region filter banner if active */}
        {selectedRegion && (
          <div className="mb-6 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-xl p-3 flex items-center justify-between">
            <div className="text-xs font-semibold text-blue-800 dark:text-blue-300 flex items-center gap-1.5">
              <Filter className="w-4 h-4" /> Đang lọc theo khu vực: <strong>{selectedRegion}</strong> ({filteredTours.length} tour)
            </div>
            <button
              type="button"
              onClick={onClearFilters}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-bold cursor-pointer"
            >
              <X className="w-3.5 h-3.5" /> Bỏ lọc
            </button>
          </div>
        )}

        {/* Tour Cards Grid */}
        {filteredTours.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-8">
            <p className="text-slate-500 dark:text-slate-400 font-medium text-base mb-3">
              Không tìm thấy tour phù hợp với tiêu chí của bạn.
            </p>
            <button
              type="button"
              onClick={() => { setActiveTab("all"); onClearFilters?.(); }}
              className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
            >
              Xem tất cả danh sách tour
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {filteredTours.map((tour) => {
              const tourDeps = departures.filter((d) => d.tour_id === tour.id && d.remaining_seats > 0);
              const nearestDep = tourDeps[0];
              const bgImage = tour.image_url?.trim() || DESTINATION_IMAGES[tour.destination_name] || DESTINATION_IMAGES["default"];

              return (
                <div
                  key={tour.id}
                  className="group bg-white dark:bg-slate-800 rounded-2xl shadow-sm hover:shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col transition-all duration-300 hover:-translate-y-1"
                >
                  {/* Photo & Top badges */}
                  <div className="relative h-56 overflow-hidden">
                    <img
                      src={bgImage}
                      alt={tour.name}
                      className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                    {/* Category pill */}
                    <div className="absolute top-3 left-3 bg-blue-700 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-md">
                      {tour.category}
                    </div>

                    {/* Region badge */}
                    <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md text-white text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-amber-400" />
                      <span>{tour.destination_name}</span>
                    </div>

                    {/* Bottom overlay: duration & vehicle */}
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-white">
                      <span className="font-semibold flex items-center gap-1 bg-black/50 backdrop-blur-sm px-2.5 py-1 rounded-md">
                        <Clock className="w-3.5 h-3.5 text-sky-300" />
                        {tour.duration_days} Ngày {tour.duration_days - 1} Đêm
                      </span>
                      <span className="font-semibold flex items-center gap-1 bg-black/50 backdrop-blur-sm px-2.5 py-1 rounded-md">
                        <Car className="w-3.5 h-3.5 text-amber-300" />
                        Ô tô / Máy bay
                      </span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <h3
                        onClick={() => onSelectTour(tour)}
                        className="font-bold text-lg text-slate-900 dark:text-white line-clamp-2 hover:text-blue-600 transition-colors cursor-pointer mb-2"
                        title={tour.name}
                      >
                        {tour.name}
                      </h3>

                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-4 leading-relaxed">
                        {tour.description}
                      </p>

                      {/* Departure info */}
                      <div className="space-y-1.5 mb-4 text-xs text-slate-600 dark:text-slate-300">
                        {nearestDep ? (
                          <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-700/50 p-2.5 rounded-xl">
                            <span className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-blue-600" />
                              Khởi hành: <strong>{nearestDep.departure_date}</strong>
                            </span>
                            <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Users className="w-3 h-3" /> Còn {nearestDep.remaining_seats} chỗ
                            </span>
                          </div>
                        ) : (
                          <div className="text-xs text-slate-400 bg-slate-50 dark:bg-slate-700/50 p-2.5 rounded-xl">
                            Đang cập nhật thêm lịch khởi hành mới
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom Pricing & Buttons */}
                    <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between gap-3">
                      <div>
                        <span className="text-[11px] text-slate-400 block font-medium">Giá trọn gói từ</span>
                        <div className="text-xl font-black text-blue-800 dark:text-blue-400">
                          {tour.price.toLocaleString("vi-VN")} <span className="text-xs font-normal">₫</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
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
                          className="bg-gradient-to-r from-blue-700 to-indigo-600 hover:from-blue-800 hover:to-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-md shadow-blue-500/20 transition-all transform hover:-translate-y-0.5 cursor-pointer flex items-center gap-1"
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
        )}
      </div>
    </section>
  );
}
