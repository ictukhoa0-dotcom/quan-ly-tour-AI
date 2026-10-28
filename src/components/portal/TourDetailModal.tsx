import React, { useState } from "react";
import {
  X,
  Calendar,
  Clock,
  MapPin,
  Users,
  CheckCircle2,
  XCircle,
  Car,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";
import type { PortalTour, PortalDeparture, PortalItinerary } from "../../types";
import { DESTINATION_IMAGES } from "./portalData";

type TourDetailModalProps = {
  tour: PortalTour | null;
  departures: PortalDeparture[];
  itineraries: PortalItinerary[];
  onClose: () => void;
  onOpenBooking: (tour: PortalTour, selectedDep?: PortalDeparture) => void;
};

export default function TourDetailModal({
  tour,
  departures,
  itineraries,
  onClose,
  onOpenBooking,
}: TourDetailModalProps) {
  if (!tour) return null;

  const tourDeps = departures.filter((d) => d.tour_id === tour.id && d.remaining_seats > 0);
  const [selectedDepId, setSelectedDepId] = useState<number | null>(
    tourDeps.length > 0 ? tourDeps[0].id : null
  );

  const selectedDep = departures.find((d) => d.id === selectedDepId);
  const tourItins = itineraries
    .filter((it) => it.tour_id === tour.id)
    .sort((a, b) => a.day_number - b.day_number);

  const bgImage = tour.image_url?.trim() || DESTINATION_IMAGES[tour.destination_name] || DESTINATION_IMAGES["default"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-4xl w-full max-h-[90vh] overflow-y-auto my-auto flex flex-col">
        {/* Modal Header Image Banner */}
        <div className="relative h-64 sm:h-80 shrink-0 overflow-hidden rounded-t-3xl">
          <img src={bgImage} alt={tour.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent" />

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header metadata */}
          <div className="absolute bottom-5 left-5 right-5 text-white">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                {tour.category}
              </span>
              <span className="bg-black/60 backdrop-blur-md text-white text-xs font-medium px-3 py-1 rounded-full flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-amber-400" />
                {tour.destination_name} ({tour.region})
              </span>
            </div>
            <h2 className="text-xl sm:text-3xl font-black leading-tight drop-shadow-md">
              {tour.name}
            </h2>
            <div className="flex items-center gap-4 text-xs sm:text-sm text-slate-200 mt-2">
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4 text-sky-400" />
                {tour.duration_days} Ngày {tour.duration_days - 1} Đêm
              </span>
              <span className="flex items-center gap-1">
                <Car className="w-4 h-4 text-amber-400" />
                Xe du lịch máy lạnh & hướng dẫn viên
              </span>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 space-y-8 flex-1">
          {/* Overview */}
          <div>
            <h3 className="text-base font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400 mb-2">
              Giới thiệu hành trình
            </h3>
            <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed">
              {tour.description}
            </p>
          </div>

          {/* Select Departure Date */}
          <div className="bg-blue-50/70 dark:bg-slate-800/80 rounded-2xl p-5 border border-blue-200/70 dark:border-slate-700">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-blue-600" />
              Chọn ngày khởi hành còn chỗ
            </h3>

            {tourDeps.length === 0 ? (
              <p className="text-xs text-slate-500">
                Lịch khởi hành đang được cập nhật thêm. Bạn có thể liên hệ tổng đài 1900 6868 để yêu cầu ngày riêng.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {tourDeps.map((dep) => (
                  <button
                    key={dep.id}
                    type="button"
                    onClick={() => setSelectedDepId(dep.id)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      selectedDepId === dep.id
                        ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/25"
                        : "bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-blue-400"
                    }`}
                  >
                    <div className="font-bold text-sm">{dep.departure_date}</div>
                    <div className={`text-xs mt-1 ${selectedDepId === dep.id ? "text-blue-100" : "text-emerald-600 dark:text-emerald-400"}`}>
                      Còn {dep.remaining_seats} / {dep.capacity} chỗ trống
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Day by Day Itinerary */}
          {tourItins.length > 0 && (
            <div>
              <h3 className="text-base font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-4">
                Lịch trình chi tiết từng ngày
              </h3>
              <div className="space-y-4">
                {tourItins.map((itin) => (
                  <div
                    key={itin.id}
                    className="flex gap-4 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700"
                  >
                    <div className="w-12 h-12 rounded-xl bg-blue-700 text-white font-black text-sm flex flex-col items-center justify-center shrink-0 shadow-sm">
                      <span className="text-[10px] uppercase opacity-80">Ngày</span>
                      <span>{itin.day_number}</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-base text-slate-900 dark:text-white mb-1">
                        {itin.title}
                      </h4>
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                        {itin.details}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Inclusions & Exclusions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-200 dark:border-slate-800 text-xs sm:text-sm">
            <div className="bg-emerald-50/60 dark:bg-emerald-950/20 p-4 rounded-2xl border border-emerald-200/70 dark:border-emerald-900/30">
              <h4 className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5 mb-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Dịch vụ bao gồm
              </h4>
              <ul className="space-y-1.5 text-slate-600 dark:text-slate-300">
                <li>• Xe ô tô du lịch đời mới đưa đón suốt hành trình</li>
                <li>• Khách sạn tiêu chuẩn 3 - 4 sao tiện nghi (2 khách/phòng)</li>
                <li>• Các bữa ăn chất lượng theo tiêu chuẩn chương trình</li>
                <li>• Vé vào cổng các điểm tham quan theo lịch trình</li>
                <li>• Hướng dẫn viên giàu kinh nghiệm, nhiệt tình phục vụ</li>
                <li>• Bảo hiểm du lịch với mức bồi thường tối đa 50.000.000 ₫</li>
              </ul>
            </div>

            <div className="bg-rose-50/60 dark:bg-rose-950/20 p-4 rounded-2xl border border-rose-200/70 dark:border-rose-900/30">
              <h4 className="font-bold text-rose-800 dark:text-rose-300 flex items-center gap-1.5 mb-2.5">
                <XCircle className="w-4 h-4 text-rose-600" /> Dịch vụ không bao gồm
              </h4>
              <ul className="space-y-1.5 text-slate-600 dark:text-slate-300">
                <li>• Chi phí cá nhân, đồ uống tự gọi trong các bữa ăn</li>
                <li>• Tiền bồi dưỡng (tip) cho tài xế và hướng dẫn viên</li>
                <li>• Phụ thu phòng đơn (nếu có yêu cầu ngủ riêng)</li>
                <li>• Thuế VAT theo quy định</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Modal Footer with Price & Book Button */}
        <div className="p-5 sm:p-6 bg-slate-50 dark:bg-slate-800/90 rounded-b-3xl border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <div className="text-xs text-slate-400">Giá trọn gói / khách</div>
            <div className="text-2xl font-black text-blue-800 dark:text-blue-400">
              {tour.price.toLocaleString("vi-VN")} ₫
            </div>
            {selectedDep && (
              <div className="text-xs text-slate-500">
                Ngày khởi hành đã chọn: <strong>{selectedDep.departure_date}</strong> (còn {selectedDep.remaining_seats} chỗ)
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-5 py-3 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Đóng lại
            </button>
            <button
              type="button"
              onClick={() => onOpenBooking(tour, selectedDep)}
              disabled={!selectedDep || selectedDep.remaining_seats <= 0}
              className="flex-1 sm:flex-none bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 hover:from-blue-800 hover:to-indigo-700 disabled:opacity-50 text-white text-sm font-bold px-7 py-3 rounded-xl shadow-lg shadow-blue-600/30 transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Tiến hành đặt tour</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
