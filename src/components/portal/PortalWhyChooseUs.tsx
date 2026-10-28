import React from "react";
import { Sparkles, ShieldCheck, HeartHandshake, Award } from "lucide-react";

export default function PortalWhyChooseUs() {
  const features = [
    {
      icon: Sparkles,
      color: "from-blue-600 to-indigo-600",
      title: "Trợ Lý AI Du Lịch 24/7",
      description: "Ứng dụng trí tuệ nhân tạo tư vấn lịch trình theo ngân sách, sở thích và đề xuất tour chính xác theo thời gian thực.",
    },
    {
      icon: Award,
      color: "from-amber-500 to-orange-500",
      title: "Giá Chuẩn & Giữ Chỗ Tức Thì",
      description: "Cam kết giá tour niêm yết minh bạch, không chi phí ẩn. Số chỗ còn trống được khóa giao dịch ngay khi bạn đặt.",
    },
    {
      icon: ShieldCheck,
      color: "from-emerald-500 to-teal-600",
      title: "Bảo Hiểm Du Lịch Toàn Diện",
      description: "Mọi hành trình cùng VietTour AI đều được bảo hiểm trọn gói với mức bồi thường tối đa, đem lại sự an tâm tuyệt đối.",
    },
    {
      icon: HeartHandshake,
      color: "from-rose-500 to-pink-600",
      title: "Đội Ngũ Hướng Dẫn Viên Tận Tâm",
      description: "100% hướng dẫn viên có thẻ hành nghề quốc tế, am hiểu sâu sắc văn hóa bản địa và luôn hỗ trợ du khách ân cần.",
    },
  ];

  return (
    <section className="py-16 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900/40 dark:to-slate-900 border-t border-slate-200/60 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/40 px-3 py-1 rounded-full">
            Giá Trị Khác Biệt
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-2">
            Vì Sao Chọn VietTour AI?
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Kết hợp hoàn hảo giữa dịch vụ lữ hành truyền thống chu đáo và công nghệ quản lý hiện đại
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-700 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between"
              >
                <div>
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${f.color} flex items-center justify-center text-white shadow-md mb-5`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white mb-2">
                    {f.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {f.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
