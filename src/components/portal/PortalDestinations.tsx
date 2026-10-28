import React from "react";
import { MapPin, Compass, ArrowRight } from "lucide-react";
import type { PortalDestination, PortalTour } from "../../types";
import { DESTINATION_IMAGES } from "./portalData";

type PortalDestinationsProps = {
  destinations: PortalDestination[];
  tours: PortalTour[];
  onSelectDestination: (destId: number) => void;
};

export default function PortalDestinations({
  destinations,
  tours,
  onSelectDestination,
}: PortalDestinationsProps) {
  return (
    <section id="destinations" className="py-16 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/40 px-3 py-1 rounded-full">
              Khám Phá Danh Thắng
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-2">
              Điểm Đến Du Lịch Được Yêu Thích
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Tuyển tập những vùng đất di sản, danh lam thắng cảnh hàng đầu Việt Nam
            </p>
          </div>
          <div className="text-xs font-semibold text-slate-500">
            {destinations.length} điểm đến chính • Cập nhật liên tục
          </div>
        </div>

        {/* Destination Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {destinations.map((dest) => {
            const destToursCount = tours.filter((t) => t.destination_id === dest.id).length;
            const bgImage = DESTINATION_IMAGES[dest.name] || DESTINATION_IMAGES["default"];

            return (
              <div
                key={dest.id}
                onClick={() => onSelectDestination(dest.id)}
                className="group relative h-72 rounded-2xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300 cursor-pointer transform hover:-translate-y-1"
              >
                <img
                  src={bgImage}
                  alt={dest.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent" />

                {/* Region pill */}
                <div className="absolute top-4 left-4 bg-white/20 backdrop-blur-md border border-white/30 text-white text-xs font-semibold px-3 py-1 rounded-full">
                  {dest.region}
                </div>

                {/* Bottom text info */}
                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-xl font-black group-hover:text-amber-300 transition-colors">
                      {dest.name}
                    </h3>
                    <span className="text-xs font-bold bg-amber-500/90 text-slate-950 px-2.5 py-0.5 rounded-full">
                      {destToursCount} tour
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 line-clamp-2 mb-3">
                    {dest.description}
                  </p>
                  <div className="flex items-center gap-1 text-xs font-bold text-amber-300 group-hover:translate-x-1 transition-transform">
                    <span>Xem các tour tại đây</span>
                    <ArrowRight className="w-3.5 h-3.5" />
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
