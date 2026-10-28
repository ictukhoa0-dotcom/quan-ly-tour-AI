import { useEffect, useState } from "react";
import {
  X,
  Calendar,
  Users,
  CheckCircle,
  Phone,
  Mail,
  User,
  MapPin,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import type { CustomerUser, PortalTour, PortalDeparture, PublicBookingResponse } from "../../types";
import { api } from "../../api";

type BookingModalProps = {
  tour: PortalTour | null;
  initialDeparture?: PortalDeparture;
  allDepartures: PortalDeparture[];
  customer?: CustomerUser | null;
  onClose: () => void;
  onBookingSuccess?: () => void;
};

export default function BookingModal({
  tour,
  initialDeparture,
  allDepartures,
  customer,
  onClose,
  onBookingSuccess,
}: BookingModalProps) {
  if (!tour) return null;

  const tourDeps = allDepartures.filter(
    (d) => d.tour_id === tour.id && d.remaining_seats > 0
  );

  const [selectedDepId, setSelectedDepId] = useState<number>(
    initialDeparture?.id || (tourDeps.length > 0 ? tourDeps[0].id : 0)
  );

  const [seats, setSeats] = useState<number>(1);
  const [name, setName] = useState<string>(customer?.name || "");
  const [phone, setPhone] = useState<string>(customer?.phone || "");
  const [email, setEmail] = useState<string>(customer?.email || "");
  const [address, setAddress] = useState<string>(customer?.address || "");
  const [notes, setNotes] = useState<string>("");

  useEffect(() => {
    if (customer) {
      setName(customer.name);
      setPhone(customer.phone);
      setEmail(customer.email || "");
      setAddress(customer.address || "");
    }
  }, [customer]);

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [successData, setSuccessData] = useState<PublicBookingResponse | null>(null);

  const currentDep = allDepartures.find((d) => d.id === selectedDepId);
  const maxSeats = currentDep ? Math.min(10, currentDep.remaining_seats) : 1;
  const totalAmount = tour.price * seats;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedDepId) {
      setError("Vui lòng chọn ngày khởi hành.");
      return;
    }
    if (!phone || phone.trim().length < 8) {
      setError("Vui lòng nhập số điện thoại hợp lệ (tối thiểu 8 số).");
      return;
    }
    if (!name || name.trim().length < 2) {
      setError("Vui lòng nhập họ và tên của bạn.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await api.publicBook({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        address: address.trim(),
        departure_id: selectedDepId,
        seats,
        notes: notes.trim(),
      });
      setSuccessData(res);
      onBookingSuccess?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Không thể đặt tour. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-xl w-full max-h-[92vh] overflow-y-auto my-auto p-6 sm:p-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-6">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                Đặt Tour Trực Tuyến
              </h2>
              <span className="text-xs text-slate-500">VietTour AI • Giữ chỗ thời gian thực</span>
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

        {/* If Booking Succeeded */}
        {successData ? (
          <div className="text-center py-6 space-y-5 animate-fadeIn">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle className="w-10 h-10" />
            </div>

            <div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                Đặt Tour Thành Công!
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-md mx-auto">
                {successData.message}
              </p>
            </div>

            {/* Booking Confirmation Ticket */}
            <div className="bg-slate-50 dark:bg-slate-800/80 rounded-2xl p-5 border border-dashed border-blue-300 dark:border-slate-700 text-left space-y-2.5 text-xs sm:text-sm">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-700">
                <span className="text-slate-500">Mã đơn đặt tour:</span>
                <span className="font-mono font-black text-blue-700 dark:text-blue-400 text-base">
                  {successData.booking_code}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Hành trình:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-100 text-right">{successData.tour_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Khách hàng:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-100">{successData.customer_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Ngày khởi hành:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-100">{successData.departure_date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Số lượng chỗ:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-100">{successData.seats} khách</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-700">
                <span className="font-bold text-slate-800 dark:text-slate-100">Tổng tiền tạm tính:</span>
                <span className="font-black text-blue-700 dark:text-blue-400 text-lg">
                  {successData.total_amount.toLocaleString("vi-VN")} ₫
                </span>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/40 p-3.5 rounded-xl text-xs text-blue-800 dark:text-blue-300 text-left flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <span>
                Chỗ của bạn đã được hệ thống giữ thành công. Nhân viên tư vấn VietTour AI sẽ gọi điện xác nhận và gửi thông tin hướng dẫn thanh toán chi tiết.
              </span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-500/25 transition-all cursor-pointer text-sm"
            >
              Hoàn tất & Về trang chủ
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Tour Info Card */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1">
                  {tour.name}
                </h3>
                <span className="text-xs text-slate-500">
                  {tour.duration_days} Ngày • Đơn giá: {tour.price.toLocaleString("vi-VN")} ₫/khách
                </span>
              </div>
              <div className="text-right shrink-0">
                <span className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/50 px-2 py-0.5 rounded-md">
                  {tour.category}
                </span>
              </div>
            </div>

            {error && (
              <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs p-3 rounded-xl font-medium">
                {error}
              </div>
            )}

            {/* Select Departure Date */}
            <div>
              <label htmlFor="booking-dep-select" className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-blue-600" /> Ngày khởi hành *
              </label>
              <select
                id="booking-dep-select"
                value={selectedDepId}
                onChange={(e) => setSelectedDepId(Number(e.target.value))}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                {tourDeps.map((dep) => (
                  <option key={dep.id} value={dep.id}>
                    {dep.departure_date} (Còn {dep.remaining_seats} chỗ)
                  </option>
                ))}
              </select>
            </div>

            {/* Number of Seats */}
            <div>
              <label htmlFor="booking-seats-select" className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-blue-600" /> Số lượng khách *
              </label>
              <div className="flex items-center gap-3">
                <select
                  id="booking-seats-select"
                  value={seats}
                  onChange={(e) => setSeats(Number(e.target.value))}
                  className="w-32 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  {[...Array(maxSeats || 1)].map((_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {i + 1} người
                    </option>
                  ))}
                </select>
                <span className="text-xs text-slate-400">
                  (Tối đa {maxSeats} chỗ cho lần đặt này)
                </span>
              </div>
            </div>

            {/* Customer Information */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label htmlFor="booking-name-input" className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Họ và tên *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    id="booking-name-input"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nguyễn Văn A"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="booking-phone-input" className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Số điện thoại *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    id="booking-phone-input"
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0912345678"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="booking-email-input" className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Email nhận vé điện tử
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    id="booking-email-input"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="booking-address-input" className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Địa chỉ / Tỉnh thành
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    id="booking-address-input"
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Hà Nội / TP.HCM..."
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="booking-notes-input" className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Yêu cầu đặc biệt (Ăn chay, người già, em bé...)
              </label>
              <textarea
                id="booking-notes-input"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ví dụ: Cần phòng tầng thấp, có trẻ em 3 tuổi..."
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Total Price & Submit */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400">Tổng thanh toán ({seats} khách):</span>
                <div className="text-2xl font-black text-blue-700 dark:text-blue-400">
                  {totalAmount.toLocaleString("vi-VN")} ₫
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-gradient-to-r from-blue-700 to-indigo-600 hover:from-blue-800 hover:to-indigo-700 disabled:opacity-50 text-white font-bold px-6 py-2.5 rounded-xl text-xs sm:text-sm shadow-lg shadow-blue-500/25 transition-all transform hover:-translate-y-0.5 cursor-pointer flex items-center gap-2"
                >
                  {submitting ? "Đang xử lý..." : "Xác nhận đặt tour"}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
