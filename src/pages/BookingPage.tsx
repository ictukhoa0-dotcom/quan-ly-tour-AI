import React, { useState, useEffect } from "react";
import {
  Calendar,
  Users,
  CheckCircle2,
  Clock,
  MapPin,
  CreditCard,
  QrCode,
  Building,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  Sparkles,
  Car,
  AlertCircle,
} from "lucide-react";
import type {
  PortalTour,
  PortalDeparture,
  CustomerUser,
  PublicBookingResponse,
} from "../types";
import { api } from "../api";
import { DESTINATION_IMAGES } from "../components/portal/portalData";

type BookingPageProps = {
  tours: PortalTour[];
  departures: PortalDeparture[];
  customer: CustomerUser | null;
  selectedTourId?: number;
  selectedDepId?: number;
  onGoHome: () => void;
  onBookingSuccess: () => void;
  onNotify: (message: string, kind?: "success" | "error") => void;
  onOpenCustomerAuth?: () => void;
};

export default function BookingPage({
  tours,
  departures,
  customer,
  selectedTourId,
  selectedDepId,
  onGoHome,
  onBookingSuccess,
  onNotify,
  onOpenCustomerAuth,
}: BookingPageProps) {
  // Step: 1 (Select Tour & Date) -> 2 (Customer Info) -> 3 (Payment & Confirm) -> 4 (Success)
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Selection state
  const [tourId, setTourId] = useState<number>(
    selectedTourId || (tours.length > 0 ? tours[0].id : 0)
  );

  const currentTour = tours.find((t) => t.id === tourId);
  const currentDeps = departures.filter(
    (d) => d.tour_id === tourId && d.remaining_seats > 0
  );

  const [depId, setDepId] = useState<number>(
    selectedDepId || (currentDeps.length > 0 ? currentDeps[0].id : 0)
  );

  // Update departure when tour changes
  useEffect(() => {
    if (currentTour) {
      const available = departures.filter(
        (d) => d.tour_id === currentTour.id && d.remaining_seats > 0
      );
      if (available.length > 0 && !available.some((d) => d.id === depId)) {
        setDepId(available[0].id);
      }
    }
  }, [tourId, departures, currentTour, depId]);

  const currentDep = departures.find((d) => d.id === depId);

  // Tickets
  const [adults, setAdults] = useState<number>(1);
  const [children, setChildren] = useState<number>(0);

  // Customer info
  const [name, setName] = useState<string>(customer?.name || "");
  const [phone, setPhone] = useState<string>(customer?.phone || "");
  const [email, setEmail] = useState<string>(customer?.email || "");
  const [address, setAddress] = useState<string>(customer?.address || "");
  const [notes, setNotes] = useState<string>("");

  useEffect(() => {
    if (customer) {
      if (!name) setName(customer.name);
      if (!phone) setPhone(customer.phone);
      if (!email) setEmail(customer.email || "");
      if (!address) setAddress(customer.address || "");
    }
  }, [customer]);

  // Payment method
  const [paymentMethod, setPaymentMethod] = useState<"vietqr" | "vnpay" | "office">("vietqr");

  // Random QR account (chosen once per booking session)
  const QR_ACCOUNTS = [
    {
      name: "PHAM VAN TUAN",
      phone: "0865384882",
      bank: "MBBank / VietQR",
      image: "/qr/qr_pham_van_tuan_crop.jpg",
    },
    {
      name: "DUONG TRUNG KIEN",
      phone: "0582198938",
      bank: "MB / VietQR",
      image: "/qr/qr_duong_trung_kien_crop.jpg",
    },
  ];
  const [qrAccount] = useState(() => QR_ACCOUNTS[Math.floor(Math.random() * QR_ACCOUNTS.length)]);

  // Submission state
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [bookingResult, setBookingResult] = useState<PublicBookingResponse | null>(null);

  // Calculate pricing
  const adultPrice = currentTour ? currentTour.price : 0;
  const childPrice = Math.round(adultPrice * 0.7); // 70% for children
  const totalAmount = adultPrice * adults + childPrice * children;
  const totalSeats = adults + children;

  const bgImage = currentTour
    ? currentTour.image_url?.trim() || DESTINATION_IMAGES[currentTour.destination_name] || DESTINATION_IMAGES["default"]
    : DESTINATION_IMAGES["default"];

  function validateStep1(): boolean {
    if (!currentTour) {
      onNotify("Vui lòng chọn tour du lịch.", "error");
      return false;
    }
    if (!currentDep) {
      onNotify("Vui lòng chọn ngày khởi hành còn chỗ.", "error");
      return false;
    }
    if (totalSeats <= 0) {
      onNotify("Số lượng hành khách tối thiểu là 1 người.", "error");
      return false;
    }
    if (totalSeats > currentDep.remaining_seats) {
      onNotify(`Ngày khởi hành này chỉ còn ${currentDep.remaining_seats} chỗ trống.`, "error");
      return false;
    }
    return true;
  }

  function validateStep2(): boolean {
    if (!name.trim() || name.trim().length < 2) {
      onNotify("Vui lòng nhập họ và tên của bạn.", "error");
      return false;
    }
    if (!phone.trim() || phone.trim().length < 8) {
      onNotify("Vui lòng nhập số điện thoại liên hệ hợp lệ (tối thiểu 8 số).", "error");
      return false;
    }
    return true;
  }

  async function handleConfirmBooking() {
    if (!validateStep1() || !validateStep2()) return;

    setSubmitting(true);
    try {
      const res = await api.publicBook({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        address: address.trim(),
        departure_id: depId,
        seats: totalSeats,
        notes: `Người lớn: ${adults}, Trẻ em: ${children}. Thanh toán: ${paymentMethod}. Ghi chú: ${notes.trim()}`,
      });
      setBookingResult(res);
      setStep(4);
      onBookingSuccess();
      onNotify("Đặt tour thành công!", "success");
    } catch (err: unknown) {
      onNotify(err instanceof Error ? err.message : "Không thể tạo đơn đặt tour.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-10 px-4 sm:px-6 lg:px-8 animate-fadeIn">
      <div className="max-w-6xl mx-auto">
        {/* Top Breadcrumb & Return button */}
        <div className="flex items-center justify-between mb-8">
          <button
            type="button"
            onClick={onGoHome}
            className="flex items-center gap-2 text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer bg-white dark:bg-slate-900 px-4 py-2 rounded-xl shadow-xs border border-slate-200 dark:border-slate-800"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại Trang chủ Cổng du lịch</span>
          </button>

          <div className="text-xs font-semibold text-slate-500">
            VietTour AI • Hệ thống Đặt Tour Trực Tuyến 24/7
          </div>
        </div>

        {/* Multi-Step Flow Indicator */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-4 mb-8">
          <div className="grid grid-cols-3 gap-2 text-center text-xs sm:text-sm font-bold">
            <div
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all ${
                step === 1
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/25"
                  : step > 1
                  ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40"
                  : "text-slate-400"
              }`}
            >
              <span className="w-6 h-6 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center text-xs">
                1
              </span>
              <span>Chọn Tour & Lịch Đi</span>
            </div>

            <div
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all ${
                step === 2
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/25"
                  : step > 2
                  ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40"
                  : "text-slate-400"
              }`}
            >
              <span className="w-6 h-6 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center text-xs">
                2
              </span>
              <span>Thông Tin Đặt Chỗ</span>
            </div>

            <div
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all ${
                step >= 3
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/25"
                  : "text-slate-400"
              }`}
            >
              <span className="w-6 h-6 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center text-xs">
                3
              </span>
              <span>Thanh Toán & Xác Nhận</span>
            </div>
          </div>
        </div>

        {/* STEP 4: Success Screen */}
        {step === 4 && bookingResult ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 sm:p-12 shadow-xl border border-slate-200 dark:border-slate-800 text-center max-w-2xl mx-auto space-y-6">
            <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-12 h-12" />
            </div>

            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 rounded-full">
                Giao Dịch Thành Công
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-3">
                Đặt Tour Thành Công!
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-2 max-w-md mx-auto">
                Hệ thống VietTour AI đã lưu đơn và giữ chỗ thời gian thực cho bạn.
              </p>
            </div>

            {/* Electronic Voucher Card */}
            <div className="bg-slate-50 dark:bg-slate-800/80 rounded-2xl p-6 border border-dashed border-blue-300 dark:border-slate-700 text-left space-y-3 text-sm">
              <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-700">
                <span className="text-slate-500">Mã đơn đặt tour:</span>
                <span className="font-mono font-black text-blue-700 dark:text-blue-400 text-lg">
                  {bookingResult.booking_code}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Hành trình:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-100 text-right">{bookingResult.tour_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Khách hàng:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-100">{bookingResult.customer_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Ngày khởi hành:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-100">{bookingResult.departure_date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Số lượng chỗ:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-100">{bookingResult.seats} người</span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-slate-200 dark:border-slate-700">
                <span className="font-bold text-slate-800 dark:text-slate-100">Tổng thanh toán:</span>
                <span className="font-black text-blue-700 dark:text-blue-400 text-xl">
                  {bookingResult.total_amount.toLocaleString("vi-VN")} ₫
                </span>
              </div>
            </div>

            {/* E-Ticket QR Code */}
            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/40 dark:to-blue-950/40 rounded-2xl p-5 border border-indigo-200 dark:border-indigo-800">
              <p className="text-xs font-bold text-center uppercase tracking-wider text-indigo-700 dark:text-indigo-300 mb-3">
                🎫 Mã QR Vé Điện Tử
              </p>
              <div className="flex justify-center">
                <div className="bg-white p-3 rounded-2xl shadow-md border border-slate-100">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                      `VIETTOUR-TICKET\nMã đơn: ${bookingResult.booking_code}\nKhách: ${bookingResult.customer_name}\nSĐT: ${phone}\nTour: ${bookingResult.tour_name}\nKhởi hành: ${bookingResult.departure_date}\nSố chỗ: ${bookingResult.seats}\nTổng tiền: ${bookingResult.total_amount.toLocaleString("vi-VN")}đ\nHotline: 1900 6868`
                    )}`}
                    alt="E-Ticket QR"
                    className="w-48 h-48 rounded-xl"
                  />
                </div>
              </div>
              <p className="text-[11px] text-center text-slate-500 mt-3">
                Xuất trình mã QR này khi check-in tại điểm khởi hành.<br/>
                Hotline hỗ trợ 24/7: <strong>1900 6868</strong>
              </p>
            </div>

            {/* Next Steps Guide */}
            <div className="bg-blue-50 dark:bg-blue-950/40 p-4 rounded-2xl text-xs text-blue-800 dark:text-blue-300 text-left space-y-1.5">
              <div className="font-bold flex items-center gap-1.5 text-sm">
                <ShieldCheck className="w-4 h-4 text-blue-600" /> Hướng dẫn tiếp theo:
              </div>
              <p>• Chuyên viên tư vấn VietTour AI sẽ gọi điện tới số {bookingResult.customer_name} trong vòng 15 phút.</p>
              <p>• Vé điện tử và phiếu thu sẽ được gửi trực tiếp tới email của bạn.</p>
              <p>• Cần hỗ trợ khẩn cấp, xin vui lòng gọi hotline <strong>1900 6868</strong>.</p>
            </div>

            <div className="flex gap-3 justify-center pt-2">
              <button
                type="button"
                onClick={onGoHome}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-xl shadow-lg shadow-blue-500/25 transition-all cursor-pointer text-sm"
              >
                Về Trang Chủ Cổng Du Lịch
              </button>
            </div>
          </div>
        ) : (
          /* STEP 1, 2, 3 LAYOUT */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left 2 Cols: Form Steps */}
            <div className="lg:col-span-2 space-y-6">
              {/* STEP 1: Select Tour, Departure Date & Passengers */}
              {step === 1 && (
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 dark:border-slate-800 space-y-6">
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Bước 1</span>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
                      Chọn Tour & Ngày Khởi Hành
                    </h2>
                  </div>

                  {/* 1.1 Choose Tour */}
                  <div>
                    <label htmlFor="booking-page-tour-select" className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                      Chọn tour du lịch:
                    </label>
                    <select
                      id="booking-page-tour-select"
                      value={tourId}
                      onChange={(e) => setTourId(Number(e.target.value))}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl p-3.5 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                    >
                      {tours.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.duration_days} ngày - {t.price.toLocaleString("vi-VN")} ₫)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 1.2 Choose Departure Date */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                      Chọn ngày khởi hành còn chỗ:
                    </label>

                    {currentDeps.length === 0 ? (
                      <div className="bg-amber-50 dark:bg-amber-950/40 p-4 rounded-2xl border border-amber-200 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>Tour này hiện đang chờ mở thêm lịch khởi hành mới. Vui lòng chọn tour khác hoặc liên hệ hotline.</span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {currentDeps.map((dep) => (
                          <div
                            key={dep.id}
                            onClick={() => setDepId(dep.id)}
                            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                              depId === dep.id
                                ? "bg-blue-50 dark:bg-blue-900/40 border-blue-600 ring-2 ring-blue-500/20"
                                : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-slate-300"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                                <Calendar className="w-4 h-4 text-blue-600" />
                                {dep.departure_date}
                              </span>
                              <span className="text-xs font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
                                Còn {dep.remaining_seats} chỗ
                              </span>
                            </div>
                            <div className="text-xs text-slate-500 mt-1">
                              Sức chứa đoàn: {dep.capacity} khách
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 1.3 Choose Quantity */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-3">
                      Số lượng hành khách:
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Adults */}
                      <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                        <div>
                          <div className="font-bold text-sm text-slate-900 dark:text-white">Người lớn</div>
                          <div className="text-xs text-slate-500">Từ 12 tuổi trở lên (100% giá)</div>
                          <div className="text-xs font-bold text-blue-600 mt-1">
                            {adultPrice.toLocaleString("vi-VN")} ₫
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setAdults((v) => Math.max(1, v - 1))}
                            className="w-8 h-8 rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 flex items-center justify-center font-bold text-base cursor-pointer hover:bg-slate-100"
                          >
                            -
                          </button>
                          <span className="w-8 text-center font-bold text-sm">{adults}</span>
                          <button
                            type="button"
                            onClick={() => setAdults((v) => v + 1)}
                            className="w-8 h-8 rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 flex items-center justify-center font-bold text-base cursor-pointer hover:bg-slate-100"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Children */}
                      <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                        <div>
                          <div className="font-bold text-sm text-slate-900 dark:text-white">Trẻ em</div>
                          <div className="text-xs text-slate-500">Từ 5 - 11 tuổi (70% giá tour)</div>
                          <div className="text-xs font-bold text-blue-600 mt-1">
                            {childPrice.toLocaleString("vi-VN")} ₫
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setChildren((v) => Math.max(0, v - 1))}
                            className="w-8 h-8 rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 flex items-center justify-center font-bold text-base cursor-pointer hover:bg-slate-100"
                          >
                            -
                          </button>
                          <span className="w-8 text-center font-bold text-sm">{children}</span>
                          <button
                            type="button"
                            onClick={() => setChildren((v) => v + 1)}
                            className="w-8 h-8 rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 flex items-center justify-center font-bold text-base cursor-pointer hover:bg-slate-100"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Continue Button */}
                  <div className="pt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        if (validateStep1()) setStep(2);
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-7 py-3 rounded-xl shadow-lg shadow-blue-500/25 transition-all flex items-center gap-2 cursor-pointer text-sm"
                    >
                      <span>Tiếp tục: Nhập thông tin</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: Customer Information */}
              {step === 2 && (
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 dark:border-slate-800 space-y-6 animate-fadeIn">
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Bước 2</span>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
                      Thông Tin Người Đặt Chỗ
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Thông tin này sẽ được dùng để liên hệ đón đoàn và gửi vé điện tử xác nhận.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="customer-name-field" className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                        Họ và tên người đặt *
                      </label>
                      <input
                        id="customer-name-field"
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Nguyễn Văn A"
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label htmlFor="customer-phone-field" className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                        Số điện thoại liên hệ *
                      </label>
                      <input
                        id="customer-phone-field"
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="0912345678"
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="customer-email-field" className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                        Email nhận phiếu xác nhận
                      </label>
                      <input
                        id="customer-email-field"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="email@example.com"
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label htmlFor="customer-address-field" className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                        Địa chỉ / Nơi ở
                      </label>
                      <input
                        id="customer-address-field"
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Hà Nội, Đà Nẵng, TP.HCM..."
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="customer-notes-field" className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                      Ghi chú đặc biệt (Chế độ ăn chay, phòng gia đình, đón tại điểm hẹn...)
                    </label>
                    <textarea
                      id="customer-notes-field"
                      rows={3}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Nhập ghi chú cho hướng dẫn viên nếu có..."
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Nav Buttons */}
                  <div className="pt-4 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300 cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Quay lại bước 1</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (validateStep2()) setStep(3);
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-7 py-3 rounded-xl shadow-lg shadow-blue-500/25 transition-all flex items-center gap-2 cursor-pointer text-sm"
                    >
                      <span>Tiếp tục: Thanh toán</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: Payment & Confirm */}
              {step === 3 && (
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 dark:border-slate-800 space-y-6 animate-fadeIn">
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Bước 3</span>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
                      Phương Thức Thanh Toán & Xác Nhận
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Lựa chọn hình thức thanh toán thuận tiện nhất cho bạn.
                    </p>
                  </div>

                  {/* Payment Options */}
                  <div className="space-y-3">
                    {/* VietQR */}
                    <div
                      onClick={() => setPaymentMethod("vietqr")}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center gap-4 ${
                        paymentMethod === "vietqr"
                          ? "bg-blue-50 dark:bg-blue-900/40 border-blue-600 ring-2 ring-blue-500/20"
                          : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      <div className="w-12 h-12 rounded-xl bg-blue-700 text-white flex items-center justify-center shrink-0">
                        <QrCode className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                          <span>Quét mã VietQR Chuyển khoản tức thì</span>
                          <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">Khuyên dùng</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Quét mã bằng mọi ứng dụng ngân hàng hoặc ví điện tử (Miễn phí giao dịch).
                        </p>
                      </div>
                    </div>

                    {/* VNPAY / Card */}
                    <div
                      onClick={() => setPaymentMethod("vnpay")}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center gap-4 ${
                        paymentMethod === "vnpay"
                          ? "bg-blue-50 dark:bg-blue-900/40 border-blue-600 ring-2 ring-blue-500/20"
                          : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                        <CreditCard className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-sm text-slate-900 dark:text-white">
                          Cổng thanh toán VNPAY / Thẻ Visa, MasterCard
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Thanh toán an toàn qua thẻ ATM nội địa hoặc thẻ quốc tế.
                        </p>
                      </div>
                    </div>

                    {/* Pay at Office */}
                    <div
                      onClick={() => setPaymentMethod("office")}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center gap-4 ${
                        paymentMethod === "office"
                          ? "bg-blue-50 dark:bg-blue-900/40 border-blue-600 ring-2 ring-blue-500/20"
                          : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      <div className="w-12 h-12 rounded-xl bg-slate-800 text-white flex items-center justify-center shrink-0">
                        <Building className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-sm text-slate-900 dark:text-white">
                          Thanh toán trực tiếp tại văn phòng VietTour AI
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Giữ chỗ trong 24 giờ và thanh toán tại văn phòng Hà Nội hoặc TP. Hồ Chí Minh.
                        </p>
                      </div>
                    </div>
                    {/* VietQR QR Code Display */}
                    {paymentMethod === "vietqr" && (
                      <div className="mt-4 p-5 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 rounded-2xl border border-blue-200 dark:border-blue-800 animate-fadeIn">
                        <div className="text-center mb-3">
                          <p className="text-xs font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wide">Quét mã để chuyển khoản</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">Sử dụng bất kỳ ứng dụng ngân hàng nào hỗ trợ VietQR / NAPAS 247</p>
                        </div>

                        {/* Account Info Banner */}
                        <div className="bg-white dark:bg-slate-900 rounded-xl px-4 py-2.5 mb-3 flex items-center gap-3 shadow-xs border border-slate-100 dark:border-slate-800">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shrink-0">
                            <span className="text-white font-black text-xs">✦</span>
                          </div>
                          <div>
                            <div className="font-black text-sm text-slate-900 dark:text-white tracking-wide">{qrAccount.name}</div>
                            <div className="text-xs text-slate-500">{qrAccount.phone} • {qrAccount.bank}</div>
                          </div>
                        </div>

                        {/* QR Image */}
                        <div className="flex justify-center">
                          <div className="bg-white p-3 rounded-2xl shadow-lg border border-slate-200">
                            <img
                              src={qrAccount.image}
                              alt={`QR ${qrAccount.name}`}
                              className="w-56 h-auto rounded-xl object-contain"
                            />
                          </div>
                        </div>

                        {/* Amount hint */}
                        <div className="mt-3 text-center">
                          <p className="text-xs text-slate-500">Số tiền cần chuyển:</p>
                          <p className="text-xl font-black text-blue-700 dark:text-blue-400">{totalAmount.toLocaleString("vi-VN")} ₫</p>
                          <p className="text-[11px] text-slate-400 mt-1">Nội dung chuyển khoản: VietTour - {name} - {phone}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Summary of Booker */}
                  <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs space-y-1.5">
                    <div className="font-bold text-slate-800 dark:text-slate-200 text-sm mb-2">
                      Xác nhận thông tin người đặt:
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Người liên hệ:</span>
                      <strong>{name}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Số điện thoại:</span>
                      <strong>{phone}</strong>
                    </div>
                    {email && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Email:</span>
                        <span>{email}</span>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-4 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300 cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Quay lại bước 2</span>
                    </button>

                    <button
                      type="button"
                      disabled={submitting}
                      onClick={handleConfirmBooking}
                      className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 text-white font-bold px-8 py-3.5 rounded-xl shadow-lg shadow-emerald-600/25 transition-all flex items-center gap-2 cursor-pointer text-sm"
                    >
                      {submitting ? (
                        <span>Đang lưu đơn và giữ chỗ...</span>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Xác nhận & Giữ chỗ ngay</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Right Col: Booking Bill Summary Card */}
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 sticky top-24">
                <div className="relative h-40 rounded-2xl overflow-hidden mb-4">
                  <img src={bgImage} alt={currentTour?.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent" />
                  <span className="absolute top-3 left-3 bg-blue-600 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                    {currentTour?.category}
                  </span>
                  <div className="absolute bottom-3 left-3 right-3 text-white">
                    <div className="text-xs text-slate-300 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-amber-300" />
                      {currentTour?.destination_name}
                    </div>
                    <div className="font-bold text-sm line-clamp-1">{currentTour?.name}</div>
                  </div>
                </div>

                <h3 className="font-bold text-sm uppercase tracking-wider text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
                  Chi Tiết Tạm Tính
                </h3>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Khởi hành:</span>
                    <strong className="text-slate-800 dark:text-slate-200">
                      {currentDep?.departure_date || "Chưa chọn"}
                    </strong>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-500">Thời gian:</span>
                    <span className="text-slate-800 dark:text-slate-200">
                      {currentTour?.duration_days} Ngày {((currentTour?.duration_days || 1) - 1)} Đêm
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-500">Người lớn ({adults} x {adultPrice.toLocaleString("vi-VN")} ₫):</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {(adultPrice * adults).toLocaleString("vi-VN")} ₫
                    </span>
                  </div>

                  {children > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Trẻ em ({children} x {childPrice.toLocaleString("vi-VN")} ₫):</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {(childPrice * children).toLocaleString("vi-VN")} ₫
                      </span>
                    </div>
                  )}

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-baseline">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">Tổng thanh toán:</span>
                    <span className="font-black text-xl text-blue-700 dark:text-blue-400">
                      {totalAmount.toLocaleString("vi-VN")} ₫
                    </span>
                  </div>
                </div>

                <div className="mt-5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700 text-[11px] text-slate-500 space-y-1">
                  <div className="flex items-center gap-1 font-bold text-slate-700 dark:text-slate-300">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                    Chính sách giá minh bạch
                  </div>
                  <div>• Đã bao gồm bảo hiểm du lịch toàn diện</div>
                  <div>• Miễn phí hủy trước 7 ngày khởi hành</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
