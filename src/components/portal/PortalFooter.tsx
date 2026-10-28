import React, { useState } from "react";
import {
  Compass,
  Phone,
  Mail,
  MapPin,
  ShieldCheck,
  CreditCard,
  Send,
  Sparkles,
} from "lucide-react";

export default function PortalFooter() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  function handleSubscribe(e: React.FormEvent) {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
      setEmail("");
    }
  }

  return (
    <footer className="bg-slate-950 text-slate-300 pt-16 pb-12 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Newsletter Callout Banner */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-10 border border-blue-800/50 shadow-2xl mb-14 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="max-w-xl text-center md:text-left">
            <div className="inline-flex items-center gap-1.5 text-amber-300 text-xs font-bold uppercase tracking-wider mb-2">
              <Sparkles className="w-4 h-4" /> Bản Tin Du Lịch
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white">
              Đăng Ký Nhận Ưu Đãi Tour Độc Quyền
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Nhận voucher giảm giá đến 500.000 ₫ và cập nhật các tour giờ chót hàng tuần.
            </p>
          </div>

          <form onSubmit={handleSubscribe} className="w-full md:w-auto flex flex-col sm:flex-row gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Nhập email của bạn..."
              required
              className="bg-black/40 border border-white/20 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-amber-400 min-w-[260px]"
            />
            <button
              type="submit"
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-bold px-6 py-3 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer text-sm whitespace-nowrap"
            >
              <Send className="w-4 h-4" />
              <span>{subscribed ? "Đã Đăng Ký!" : "Đăng Ký Ngay"}</span>
            </button>
          </form>
        </div>

        {/* Main Footer Links & Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {/* Column 1: Brand & License */}
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md">
                <Compass className="w-5 h-5" />
              </div>
              <span className="text-xl font-black text-white tracking-tight">VietTour <span className="text-amber-400">AI</span></span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Hệ thống điều hành và đặt tour du lịch thông minh hàng đầu Việt Nam. Tích hợp AI tư vấn hành trình tự động và quản trị booking theo thời gian thực.
            </p>
            <div className="space-y-1.5 text-xs text-slate-400 border-t border-slate-800/80 pt-3">
              <div><strong>Giấy phép kinh doanh lữ hành:</strong> Số 01-888/2024/TCDL-GP LHQT</div>
              <div><strong>Mã số doanh nghiệp:</strong> 0109988776 do Sở KH&ĐT cấp</div>
            </div>
          </div>

          {/* Column 2: Liên hệ */}
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-white mb-4 border-l-2 border-blue-500 pl-2.5">
              Thông Tin Liên Hệ
            </h4>
            <ul className="space-y-3 text-xs text-slate-400">
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <span>Trụ sở chính: Tòa nhà VietTour, 88 Phố Huế, Hoàn Kiếm, Hà Nội</span>
              </li>
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <span>Chi nhánh miền Nam: 120 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-white font-bold">Hotline: 1900 6868 (24/7)</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-sky-400 shrink-0" />
                <span>Email: contact@viettour.ai</span>
              </li>
            </ul>
          </div>

          {/* Column 3: Dịch vụ & Chính sách */}
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-white mb-4 border-l-2 border-blue-500 pl-2.5">
              Dịch Vụ & Hỗ Trợ
            </h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li><a href="#tours-section" className="hover:text-white transition-colors">Tour Miền Bắc - Săn Mây Tây Bắc</a></li>
              <li><a href="#tours-section" className="hover:text-white transition-colors">Tour Miền Trung - Con Đường Di Sản</a></li>
              <li><a href="#tours-section" className="hover:text-white transition-colors">Tour Miền Nam - Nghỉ Dưỡng Biển Đảo</a></li>
              <li><a href="#flash-sale" className="hover:text-white transition-colors">Chính sách đặt & hoàn hủy tour</a></li>
              <li><a href="#home" className="hover:text-white transition-colors">Điều khoản bảo hiểm du lịch</a></li>
              <li><a href="#home" className="hover:text-white transition-colors">Chính sách bảo mật thông tin</a></li>
            </ul>
          </div>

          {/* Column 4: Thanh toán an toàn */}
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-white mb-4 border-l-2 border-blue-500 pl-2.5">
              Thanh Toán An Toàn
            </h4>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Hỗ trợ đa dạng các phương thức thanh toán bảo mật với mã hóa giao dịch 256-bit:
            </p>
            <div className="grid grid-cols-3 gap-2 text-[11px] text-center font-bold text-slate-300">
              <div className="bg-slate-900 border border-slate-800 rounded-lg py-2 px-1">VietQR</div>
              <div className="bg-slate-900 border border-slate-800 rounded-lg py-2 px-1">VNPAY</div>
              <div className="bg-slate-900 border border-slate-800 rounded-lg py-2 px-1">MoMo</div>
              <div className="bg-slate-900 border border-slate-800 rounded-lg py-2 px-1">Visa</div>
              <div className="bg-slate-900 border border-slate-800 rounded-lg py-2 px-1">MasterCard</div>
              <div className="bg-slate-900 border border-slate-800 rounded-lg py-2 px-1">JCB</div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-emerald-400">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Chứng nhận bảo mật thanh toán SSL</span>
            </div>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="pt-8 border-t border-slate-800 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 VietTour AI. Bản quyền thuộc về Công ty Lữ hành VietTour AI Việt Nam.</p>
          <p className="text-[11px]">Designed with pride for Vietnamese Tourism Excellence</p>
        </div>
      </div>
    </footer>
  );
}
