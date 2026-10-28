import React, { useState, useEffect } from "react";
import { X, Calendar, Users, CheckCircle, Clock, XCircle, Package, ArrowRight, ShieldCheck, QrCode, ChevronDown, ChevronUp } from "lucide-react";
import { api } from "../../api";
import type { CustomerBookingItem, CustomerUser } from "../../types";

type CustomerBookingsModalProps = {
  isOpen: boolean;
  customer: CustomerUser | null;
  onClose: () => void;
  onExploreTours?: () => void;
};

export default function CustomerBookingsModal({
  isOpen,
  customer,
  onClose,
  onExploreTours,
}: CustomerBookingsModalProps) {
  const [bookings, setBookings] = useState<CustomerBookingItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expandedQR, setExpandedQR] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen && customer) {
      setLoading(true);
      setError("");
      api
        .customerBookings()
        .then((res) => setBookings(res.bookings))
        .catch((err) => setError(err instanceof Error ? err.message : "Không thể tải danh sách đơn."))
        .finally(() => setLoading(false));
    }
  }, [isOpen, customer]);

  if (!isOpen || !customer) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-fadeIn">
      <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-3xl w-full p-6 sm:p-8 max-h-[90vh] overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                Đơn Tour Của Tôi
              </h2>
              <p className="text-xs text-slate-500">
                Tài khoản: <strong>{customer.name}</strong> • SĐT: {customer.phone}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto space-y-4">
          {loading ? (
            <div className="text-center py-12 text-slate-400 text-sm">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Đang tải danh sách đơn tour...
            </div>
          ) : error ? (
            <div className="text-center py-8 text-rose-500 text-sm bg-rose-50 dark:bg-rose-950/30 rounded-2xl p-4">
              {error}
            </div>
          ) : bookings.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-6">
              <Package className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <h3 className="font-bold text-slate-800 dark:text-slate-200 text-base mb-1">
                Bạn chưa có đơn đặt tour nào
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mb-5">
                Hãy lựa chọn các hành trình tuyệt đẹp cùng gia đình và bạn bè ngay hôm nay.
              </p>
              <button
                type="button"
                onClick={() => { onClose(); onExploreTours?.(); }}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-md transition-all cursor-pointer inline-flex items-center gap-1.5"
              >
                <span>Khám phá tour ngay</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {bookings.map((b) => (
                <div
                  key={b.id}
                  className="bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700 overflow-hidden"
                >
                  <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-blue-700 dark:text-blue-400 text-xs sm:text-sm bg-blue-100 dark:bg-blue-900/40 px-2.5 py-0.5 rounded-md">
                          {b.booking_code}
                        </span>
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                            b.status === "Đã thanh toán"
                              ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400"
                              : b.status === "Đã hủy"
                              ? "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400"
                              : "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400"
                          }`}
                        >
                          {b.status}
                        </span>
                      </div>

                      <h4 className="font-bold text-base text-slate-900 dark:text-white">
                        {b.tour_name}
                      </h4>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-blue-600" />
                          Khởi hành: <strong>{b.departure_date}</strong>
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-blue-600" />
                          Số khách: <strong>{b.seats} người</strong>
                        </span>
                      </div>
                    </div>

                    <div className="sm:text-right shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200 dark:border-slate-700">
                      <div className="text-xs text-slate-400">Tổng tiền</div>
                      <div className="text-lg font-black text-blue-700 dark:text-blue-400">
                        {b.total_amount.toLocaleString("vi-VN")} ₫
                      </div>
                      {b.paid_amount > 0 && (
                        <div className="text-[11px] text-emerald-600">
                          Đã thanh toán: {b.paid_amount.toLocaleString("vi-VN")} ₫
                        </div>
                      )}
                      {/* QR Ticket Button */}
                      <button
                        type="button"
                        onClick={() => setExpandedQR(expandedQR === b.id ? null : b.id)}
                        className="mt-2 flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-3 py-1.5 rounded-lg transition-colors cursor-pointer border border-indigo-200 dark:border-indigo-800"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        {expandedQR === b.id ? (
                          <><span>Ẩn QR vé</span><ChevronUp className="w-3 h-3" /></>
                        ) : (
                          <><span>Xem QR vé</span><ChevronDown className="w-3 h-3" /></>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* QR Ticket Panel */}
                  {expandedQR === b.id && (
                    <div className="border-t border-slate-200 dark:border-slate-700 bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/30 dark:to-blue-950/30 p-5 animate-fadeIn">
                      <p className="text-xs font-bold text-center uppercase tracking-wider text-indigo-700 dark:text-indigo-300 mb-4">
                        🎫 Vé Điện Tử — Quét check-in tại điểm khởi hành
                      </p>
                      <div className="flex flex-col sm:flex-row gap-5 items-center">
                        {/* QR Code */}
                        <div className="flex justify-center shrink-0">
                          <div className="bg-white p-3 rounded-2xl shadow-md border border-slate-200">
                            <img
                              src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                                `VIETTOUR-TICKET\nMã đơn: ${b.booking_code}\nKhách: ${customer.name}\nSĐT: ${customer.phone}\nTour: ${b.tour_name}\nKhởi hành: ${b.departure_date}\nSố chỗ: ${b.seats} người\nTổng tiền: ${b.total_amount.toLocaleString("vi-VN")}đ\nTrạng thái: ${b.status}\nVietTour AI - Hotline: 1900 6868`
                              )}`}
                              alt="E-Ticket QR"
                              className="w-44 h-44 rounded-xl"
                            />
                          </div>
                        </div>
                        {/* Booking Info */}
                        <div className="flex-1 space-y-2 text-xs w-full">
                          <div className="font-black text-base text-slate-900 dark:text-white">{b.tour_name}</div>
                          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-slate-600 dark:text-slate-300">
                            <span className="text-slate-400">Khách hàng:</span>
                            <span className="font-bold">{customer.name}</span>
                            <span className="text-slate-400">SĐT:</span>
                            <span className="font-bold">{customer.phone}</span>
                            <span className="text-slate-400">Mã đơn:</span>
                            <span className="font-mono font-bold text-blue-700 dark:text-blue-400">{b.booking_code}</span>
                            <span className="text-slate-400">Ngày đi:</span>
                            <span className="font-bold">{b.departure_date}</span>
                            <span className="text-slate-400">Số khách:</span>
                            <span className="font-bold">{b.seats} người</span>
                            <span className="text-slate-400">Tổng tiền:</span>
                            <span className="font-black text-blue-700 dark:text-blue-400">{b.total_amount.toLocaleString("vi-VN")} ₫</span>
                            <span className="text-slate-400">Trạng thái:</span>
                            <span className={`font-bold ${
                              b.status === "Đã thanh toán" ? "text-emerald-600" :
                              b.status === "Đã hủy" ? "text-rose-600" : "text-amber-600"
                            }`}>{b.status}</span>
                          </div>
                          <div className="mt-2 pt-2 border-t border-indigo-200 dark:border-indigo-800 text-[11px] text-slate-400">
                            ℹ️ Xuất trình mã QR này tại điểm khởi hành để xác nhận vé.<br/>
                            Hỗ trợ 24/7: <strong>1900 6868</strong>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span>Mọi thắc mắc về đơn tour xin vui lòng gọi hotline 1900 6868</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
