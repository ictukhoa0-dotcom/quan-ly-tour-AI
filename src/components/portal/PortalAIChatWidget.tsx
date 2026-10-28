import React, { useState, useRef, useEffect } from "react";
import { Sparkles, Send, X, Bot, User, ChevronDown, Compass } from "lucide-react";
import { api } from "../../api";
import type { PortalTour } from "../../types";

type PortalAIChatWidgetProps = {
  isOpen: boolean;
  onToggle: () => void;
  onSelectTour?: (tourId: number) => void;
};

type ChatMessage = {
  sender: "user" | "ai";
  text: string;
};

export default function PortalAIChatWidget({
  isOpen,
  onToggle,
  onSelectTour,
}: PortalAIChatWidgetProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      sender: "ai",
      text: "Xin chào quý khách! Tôi là Trợ lý AI của VietTour. Tôi có thể hỗ trợ bạn tìm tour theo điểm đến, ngân sách hoặc lịch khởi hành gần nhất. Bạn muốn đi đâu?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  async function handleSend(textToSend?: string) {
    const prompt = textToSend || input;
    if (!prompt.trim() || loading) return;

    const userMsg: ChatMessage = { sender: "user", text: prompt.trim() };
    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput("");
    setLoading(true);

    try {
      const res = await api.publicAIChat(prompt.trim());
      setMessages((prev) => [...prev, { sender: "ai", text: res.reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: "Xin lỗi, hiện tại tôi chưa thể kết nối máy chủ. Bạn có thể xem danh sách tour trên trang chủ hoặc liên hệ hotline 1900 6868 nhé!",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const quickPrompts = [
    "Gợi ý tour 4 ngày",
    "Tour dưới 4 triệu",
    "Tour miền Bắc",
    "Tour Vịnh Hạ Long",
  ];

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          type="button"
          onClick={onToggle}
          className="relative group bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 hover:from-blue-800 hover:to-indigo-700 text-white p-3.5 sm:px-5 sm:py-3.5 rounded-full shadow-2xl shadow-blue-500/40 flex items-center gap-2.5 transition-all transform hover:scale-105 cursor-pointer"
        >
          <div className="relative">
            <Sparkles className="w-5 h-5 text-amber-300" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full animate-ping" />
          </div>
          <span className="text-xs sm:text-sm font-bold hidden sm:inline tracking-wide">
            Trợ lý AI VietTour
          </span>
        </button>
      )}

      {/* Floating Chat Dialog Window */}
      {isOpen && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-[92vw] sm:w-[400px] h-[520px] flex flex-col overflow-hidden animate-fadeIn">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-700 via-indigo-600 to-blue-800 p-4 text-white flex items-center justify-between shadow-md">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center font-bold">
                <Compass className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <h3 className="font-bold text-sm flex items-center gap-1.5">
                  <span>Trợ Lý Du Lịch AI</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                </h3>
                <span className="text-[11px] text-white/80">Tư vấn lịch trình & tour tự động</span>
              </div>
            </div>
            <button
              type="button"
              onClick={onToggle}
              className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Suggestions */}
          <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto text-[11px]">
            {quickPrompts.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => handleSend(p)}
                className="whitespace-nowrap px-2.5 py-1 rounded-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-slate-600 hover:text-blue-600 transition-colors cursor-pointer"
              >
                {p}
              </button>
            ))}
          </div>

          {/* Messages Area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs sm:text-sm">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex gap-2.5 ${m.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                {m.sender === "ai" && (
                  <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 text-xs font-bold shadow-xs">
                    <Bot className="w-4 h-4" />
                  </div>
                )}
                <div
                  className={`p-3 rounded-2xl max-w-[85%] whitespace-pre-wrap leading-relaxed ${
                    m.sender === "user"
                      ? "bg-blue-700 text-white rounded-br-none shadow-sm"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-none border border-slate-200/80 dark:border-slate-700"
                  }`}
                >
                  {m.text}
                </div>
                {m.sender === "user" && (
                  <div className="w-7 h-7 rounded-lg bg-slate-800 text-white flex items-center justify-center shrink-0 text-xs font-bold">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 text-xs text-slate-400 italic py-2">
                <Bot className="w-4 h-4 animate-spin text-blue-600" />
                <span>VietTour AI đang phân tích dữ liệu tour...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-3 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Nhập câu hỏi hoặc điểm bạn muốn đến..."
              className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white p-2.5 rounded-xl transition-all cursor-pointer shadow-sm"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
