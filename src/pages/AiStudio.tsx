import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  AlertTriangle, ArrowRight, Bot, CalendarDays, Check, CircleDollarSign, Compass,
  LoaderCircle, Send, Sparkles, UserRound, WandSparkles,
} from "lucide-react";
import { api } from "../api";
import type { Row } from "../types";

type Props = {
  tours: Row[];
  onToast: (message: string, kind?: "success" | "error") => void;
};
type Mode = "recommendations" | "content" | "feedback" | "assistant";
type Message = {
  id: number;
  role: "assistant" | "user";
  text: string;
  mode?: Mode;
  result?: unknown;
  pendingResult?: unknown;
  targetText?: string;
  typing?: boolean;
};

const quickPrompts: Record<Mode, string[]> = {
  recommendations: ["Tìm tour văn hóa dưới 6 triệu", "Gợi ý chuyến đi biển 3 ngày", "Tìm tour khám phá cuối tuần"],
  content: ["Viết nội dung cho tour Hà Giang", "Soạn lịch trình 3 ngày tại Huế", "Tạo bản nháp cho tour đầu tiên"],
  feedback: ["Tóm tắt phản hồi khách hàng", "Khách thích điều gì nhất?", "Tổng hợp đánh giá tour gần đây"],
  assistant: ["Còn tour Nha Trang nào khởi hành tuần sau không?", "Còn bao nhiêu chỗ ở chuyến đi sắp tới?", "Tìm điểm đến miền Trung"],
};
const modeLabels: Record<Mode, string> = {
  recommendations: "Gợi ý hành trình",
  content: "Soạn nội dung",
  feedback: "Lắng nghe khách hàng",
  assistant: "Hỏi dữ liệu trực tiếp",
};

function getBudget(text: string): number | undefined {
  const normalized = text.toLocaleLowerCase("vi").replace(/\s/g, "");
  const million = normalized.match(/(\d+(?:[.,]\d+)?)\s*(?:triệu|tr|m)\b/);
  if (million) return Math.round(Number(million[1].replace(",", ".")) * 1_000_000);
  const plain = normalized.match(/(\d{7,12})\s*(?:đ|₫|vnd)?\b/);
  return plain ? Number(plain[1]) : undefined;
}

function getPreferences(text: string): string[] {
  const normalized = text.toLocaleLowerCase("vi");
  const knownPreferences = ["biển đảo", "văn hóa", "khám phá", "nghỉ dưỡng", "trải nghiệm", "thiên nhiên", "ẩm thực", "biển"];
  return knownPreferences.filter((preference) => normalized.includes(preference));
}

function greeting(mode: Mode): string {
  if (mode === "recommendations") return "Xin chào! Mình có thể tìm tour phù hợp dựa trên giá, thời lượng, sở thích và chỗ còn thực tế. Bạn muốn đi đâu?";
  if (mode === "content") return "Mình có thể giúp soạn bản nháp mô tả và lịch trình. Chọn tour hiện có hoặc cho mình biết điểm đến và số ngày nhé.";
  return "Mình có thể tổng hợp chủ đề và mức độ hài lòng từ phản hồi đã có. Bạn muốn xem phản hồi của tour nào?";
}

export default function AiStudio({ tours, onToast }: Props) {
  const [mode, setMode] = useState<Mode>("recommendations");
  const [messages, setMessages] = useState<Message[]>([{ id: 0, role: "assistant", text: greeting("recommendations") }]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [tourId, setTourId] = useState("");
  const [dailyBudget, setDailyBudget] = useState("6000000");
  const [typingMessageId, setTypingMessageId] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(1);

  useEffect(() => {
    let active = true;
    api.aiStatus()
      .then((status) => { if (active) setConfigured(status.configured); })
      .catch((error: unknown) => { if (active) onToast(error instanceof Error ? error.message : "Không thể kiểm tra cấu hình trợ lý.", "error"); });
    return () => { active = false; };
  }, [onToast]);

  useEffect(() => {
    const container = scrollRef.current;
    if (container) container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
  }, [messages, typingMessageId]);

  useEffect(() => {
    const message = messages.find((item) => item.id === typingMessageId);
    if (!message) return;
    const fullText = message.targetText ?? message.text;
    let position = 0;
    const timer = window.setInterval(() => {
      position = Math.min(position + 4, fullText.length);
      setMessages((previous) => previous.map((item) => item.id === message.id
        ? {
          ...item,
          text: fullText.slice(0, position),
          result: position >= fullText.length ? item.pendingResult : item.result,
          pendingResult: position >= fullText.length ? undefined : item.pendingResult,
          targetText: position >= fullText.length ? undefined : item.targetText,
          typing: position < fullText.length,
        }
        : item));
      if (position >= fullText.length) {
        window.clearInterval(timer);
        setTypingMessageId(null);
      }
    }, 14);
    return () => window.clearInterval(timer);
  }, [typingMessageId]);

  function switchMode(nextMode: Mode) {
    if (busy) return;
    setMode(nextMode);
    setMessages((previous) => [...previous, { id: nextId.current++, role: "assistant", text: greeting(nextMode) }]);
  }

  async function submitMessage(event?: FormEvent<HTMLFormElement>, text = draft) {
    event?.preventDefault();
    const prompt = text.trim();
    if (!prompt || busy) return;
    const currentMode = mode;
    const userMessage: Message = { id: nextId.current++, role: "user", text: prompt };
    const pendingId = nextId.current++;
    setDraft("");
    setBusy(true);
    setMessages((previous) => [...previous, userMessage, { id: pendingId, role: "assistant", text: "", typing: true }]);
    try {
      let result: unknown;
      let answer: string;
      if (currentMode === "assistant") {
        const history = messages
          .filter((message) => message.id !== 0 && !message.typing && message.text.trim())
          .slice(-10)
          .map((message) => ({ role: message.role, content: message.text.slice(0, 2000) }));
        let streamedText = "";
        await api.streamAIChat(prompt, history, (chunk) => {
          streamedText += chunk;
          setMessages((previous) => previous.map((message) => message.id === pendingId
            ? { ...message, text: streamedText, typing: true }
            : message));
        });
        setMessages((previous) => previous.map((message) => message.id === pendingId
          ? { ...message, text: streamedText || "Mình chưa nhận được nội dung trả lời.", typing: false }
          : message));
        return;
      } else if (currentMode === "recommendations") {
        const budget = getBudget(prompt) ?? Number(dailyBudget);
        const duration = prompt.match(/(\d{1,2})\s*(?:ngày|ngay)/i);
        result = await api.recommendations({
          budget,
          duration_days: duration ? Number(duration[1]) : null,
          preferences: getPreferences(prompt),
        });
        const count = (result as { recommendations: Row[] }).recommendations.length;
        answer = count ? `Mình tìm thấy ${count} hành trình còn chỗ, khởi hành sắp tới và phù hợp với ngân sách ${new Intl.NumberFormat("vi-VN").format(budget)} ₫.` : "Hiện chưa tìm thấy hành trình còn chỗ phù hợp. Bạn thử điều chỉnh ngân sách hoặc thời lượng nhé.";
      } else if (currentMode === "content") {
        const normalizedPrompt = prompt.toLocaleLowerCase("vi");
        const selectedTour = tours.find((tour) => String(tour.id) === tourId)
          ?? tours.find((tour) => normalizedPrompt.includes(String(tour.name ?? "").toLocaleLowerCase("vi")))
          ?? tours.find((tour) => String(tour.destination_name ?? "").length > 1 && normalizedPrompt.includes(String(tour.destination_name).toLocaleLowerCase("vi")))
          ?? (/tour\s+(?:đầu tiên|đầu|thứ nhất)/i.test(prompt) ? [...tours].sort((left, right) => Number(left.id) - Number(right.id))[0] : undefined);
        const requestedDays = prompt.match(/(\d{1,2})\s*(?:ngày|ngay)/i);
        const days = requestedDays ? Number(requestedDays[1]) : Number(selectedTour?.duration_days ?? 3);
        const destination = selectedTour?.destination_name ? String(selectedTour.destination_name) : prompt.replace(/^(viết|soạn|tạo|lên)\s*(nội dung|lịch trình|bản nháp)?\s*(tour|cho|tại|ở)?\s*/i, "").slice(0, 100);
        result = await api.generateTourContent({
          ...(selectedTour ? { tour_id: Number(selectedTour.id) } : {}),
          destination: selectedTour ? "" : destination,
          duration_days: Math.min(30, Math.max(1, days)),
          style: "trải nghiệm du lịch Việt Nam",
        });
        answer = "Đây là bản nháp để bạn xem xét. Lịch trình và thông tin cần được kiểm tra trước khi chia sẻ với khách.";
      } else {
        const selectedTour = tours.find((tour) => String(tour.id) === tourId);
        result = await api.summarizeFeedback({ ...(selectedTour ? { tour_id: Number(selectedTour.id) } : {}), max_feedback: 50 });
        const summary = result as { count: number };
        answer = summary.count ? "Mình đã tổng hợp các phản hồi liên quan. Đây là những điểm nổi bật:" : "Chưa có phản hồi trong phạm vi bạn chọn. Hãy thử tổng hợp tất cả tour.";
      }
      setMessages((previous) => previous.map((message) => message.id === pendingId
        ? { ...message, text: "", targetText: answer, pendingResult: result, mode: currentMode, typing: true }
        : message));
      setTypingMessageId(pendingId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không thể hoàn thành yêu cầu.";
      setMessages((previous) => previous.filter((item) => item.id !== pendingId));
      onToast(message, "error");
    } finally {
      setBusy(false);
    }
  }

  const starters = quickPrompts[mode];

  return (
    <div className="page-content ai-page">
      <section className="ai-hero flex items-center gap-4">
        <div className="ai-orb"><Sparkles size={25} /></div>
        <div className="tw-relative tw-z-10"><span className="eyebrow eyebrow-light">VIETTOUR AI STUDIO</span><h2>Trợ lý vận hành thông minh</h2><p>Trò chuyện để tìm tour, soạn nội dung và lắng nghe khách hàng.</p></div>
        <div className="ai-hero-decoration" aria-hidden="true">✳</div>
      </section>
      <div className="ai-layout ai-chat-layout">
        <section className="panel ai-chat-panel" aria-label="Trò chuyện với VietTour AI">
          <div className="ai-chat-toolbar">
            <div className="ai-assistant-identity"><span><Bot size={18} /></span><div><strong>VietTour Assistant</strong><small><i className="status-dot" /> Sẵn sàng hỗ trợ</small></div></div>
            <div className="ai-chat-toolbar-controls">
              <label className="ai-budget-setting" title="Ngân sách mặc định cho gợi ý tour"><CircleDollarSign size={14} /><input aria-label="Ngân sách mặc định" type="number" min="0" max="500000000" value={dailyBudget} onChange={(event) => setDailyBudget(event.target.value)} /></label>
              <label className="ai-tour-select"><Compass size={14} /><select aria-label="Tour đang chọn" value={tourId} onChange={(event) => setTourId(event.target.value)}><option value="">Tất cả tour</option>{tours.map((tour) => <option key={String(tour.id)} value={String(tour.id ?? "")}>{String(tour.name ?? "")}</option>)}</select></label>
            </div>
          </div>
          <div className="ai-chat-modes" role="tablist" aria-label="Chọn tác vụ trợ lý">
            {(["recommendations", "content", "feedback", "assistant"] as const).map((option) => <button key={option} role="tab" aria-selected={mode === option} disabled={busy} className={`ai-mode-chip ${mode === option ? "selected" : ""}`} onClick={() => switchMode(option)}>{option === "recommendations" || option === "assistant" ? <Compass size={14} /> : option === "content" ? <WandSparkles size={14} /> : <Sparkles size={14} />}{modeLabels[option]}</button>)}
          </div>
          <div ref={scrollRef} className="ai-chat-messages flex flex-col gap-4" aria-live="polite">
            {messages.map((message) => <article key={message.id} className={`chat-message ${message.role === "user" ? "chat-message-user" : "chat-message-assistant"}`}>
              <span className="chat-avatar">{message.role === "user" ? <UserRound size={16} /> : <Sparkles size={15} />}</span>
              <div className="chat-message-body">
                <span className="chat-sender">{message.role === "user" ? "Bạn" : "VietTour Assistant"}</span>
                {message.typing && !message.text ? <div className="typing-dots" aria-label="Trợ lý đang xử lý"><i /><i /><i /></div> : <p>{message.text}{message.id === typingMessageId && <i className="typing-caret" aria-hidden="true" />}</p>}
                {message.result !== undefined && message.result !== null && <ChatResult mode={message.mode ?? mode} result={message.result} />}
              </div>
            </article>)}
          </div>
          {!busy && <div className="ai-prompt-suggestions">{starters.map((prompt) => <button key={prompt} onClick={() => void submitMessage(undefined, prompt)}>{prompt}<ArrowRight size={12} /></button>)}</div>}
          <form className="ai-chat-composer" onSubmit={(event) => void submitMessage(event)}>
            <textarea aria-label="Tin nhắn cho trợ lý" rows={1} maxLength={500} value={draft} disabled={busy} placeholder={busy ? "Trợ lý đang xử lý yêu cầu…" : "Nhắn tin cho trợ lý…"} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void submitMessage(); } }} />
            <span className="chat-char-count">{draft.length}/500</span>
            <button className="chat-send-button" type="submit" aria-label="Gửi tin nhắn" disabled={busy || !draft.trim()}>{busy ? <LoaderCircle className="spin" size={17} /> : <Send size={16} />}</button>
          </form>
          <div className="chat-footnote"><AlertTriangle size={13} /> AI có thể chưa chính xác. Vui lòng xác minh nội dung trước khi sử dụng.</div>
        </section>
        <aside className="ai-chat-aside">
          <section className="ai-context-card">
            <span className="eyebrow">TRỢ LÝ HỖ TRỢ BẠN</span>
            <h3>Việc gì cũng có thể bắt đầu từ một câu hỏi.</h3>
            <div className="ai-capability"><span><CalendarDays size={15} /></span><div><strong>Tìm hành trình thực tế</strong><p>Gợi ý tour có chỗ trống, giá và lịch thật.</p></div></div>
            <div className="ai-capability"><span><Compass size={15} /></span><div><strong>Tra cứu dữ liệu trực tiếp</strong><p>AI truy vấn tour, lịch khởi hành và chỗ còn qua công cụ chỉ đọc.</p></div></div>
            <div className="ai-capability"><span><WandSparkles size={15} /></span><div><strong>Soạn bản nháp nhanh</strong><p>Đưa ra ý tưởng lịch trình để đội ngũ duyệt.</p></div></div>
            <div className="ai-capability"><span><Sparkles size={15} /></span><div><strong>Lắng nghe khách hàng</strong><p>Tổng hợp phản hồi trực tiếp từ hệ thống.</p></div></div>
          </section>
          <section className={`ai-configuration ${configured === false ? "ai-configuration-warning" : ""}`}>
            {configured === null ? <LoaderCircle size={16} className="spin" /> : configured ? <Check size={16} /> : <AlertTriangle size={16} />}
            <div><strong>{configured === null ? "Đang kiểm tra cấu hình AI…" : configured ? "AI đã được cấu hình" : "Chưa cấu hình AI API key"}</strong><p>{configured === false ? "Ứng dụng vẫn hoạt động với bộ máy gợi ý từ dữ liệu thật và nội dung dự phòng. Thêm AI_API_KEY ở backend để bật mô hình ngôn ngữ." : configured ? "Khóa được giữ ở backend; không chia sẻ khóa này với trình duyệt." : "Không cần API key để demo; nội dung sẽ dùng fallback xác định, không bịa giá hoặc ngày khởi hành."}</p></div>
          </section>
          <div className="human-warning"><AlertTriangle size={17} /><div><strong>Quyết định cuối cùng thuộc về bạn</strong><p>Hãy xác minh mô tả, lịch trình và mọi thông tin tư vấn trước khi gửi khách.</p></div></div>
          <div className="ai-context-tip"><CircleDollarSign size={15} /><span>Gợi ý tour chỉ hiển thị chuyến còn chỗ trong ngân sách.</span></div>
        </aside>
      </div>
    </div>
  );
}

function ChatResult({ mode, result }: { mode: Mode; result: unknown }) {
  if (mode === "recommendations") {
    const data = result as { recommendations?: Row[] };
    return <div className="chat-result-list">{data.recommendations?.map((tour) => <article className="chat-tour-card" key={tour.tour_id}><div className="chat-tour-top"><span>{String(tour.category)}</span><strong>{new Intl.NumberFormat("vi-VN").format(Number(tour.price))} ₫</strong></div><h4>{String(tour.name)}</h4><p>{String(tour.destination)} · {tour.duration_days} ngày</p><div className="chat-tour-bottom"><span><CalendarDays size={12} /> {new Date(`${tour.departure_date}T00:00:00`).toLocaleDateString("vi-VN")}</span><span>{tour.remaining_seats} chỗ còn</span></div></article>)}</div>;
  }
  if (mode === "content") {
    const response = result as { content?: { description?: string; itinerary?: { day: number; title: string; details: string }[]; suggestion?: string }; source?: string };
    return <div className="chat-content-result"><div className="chat-result-label"><WandSparkles size={13} /> BẢN NHÁP · {response.source === "ai" ? "AI" : "FALLBACK AN TOÀN"}</div><p><TypewriterText text={response.content?.description ?? ""} /></p>{response.content?.itinerary?.map((day, index) => <div className="chat-itinerary-day" key={day.day}><span>NGÀY {day.day}</span><strong><TypewriterText text={day.title} delay={index * 500} /></strong><p><TypewriterText text={day.details} delay={index * 500 + 250} /></p></div>)}{response.content?.suggestion && <pre>{response.content.suggestion}</pre>}</div>;
  }

  function TypewriterText({ text, delay = 0 }: { text: string; delay?: number }) {
    const [visible, setVisible] = useState("");

    useEffect(() => {
      setVisible("");
      let position = 0;
      let timer: number | undefined;
      const timeout = window.setTimeout(() => {
        timer = window.setInterval(() => {
          position = Math.min(position + 3, text.length);
          setVisible(text.slice(0, position));
          if (position >= text.length && timer !== undefined) window.clearInterval(timer);
        }, 12);
      }, delay);
      return () => {
        window.clearTimeout(timeout);
        if (timer !== undefined) window.clearInterval(timer);
      };
    }, [delay, text]);

    return <>{visible}</>;
  }
  const feedback = result as { summary?: string; count?: number; average_rating?: number | null; source?: string };
  return <div className="chat-content-result"><div className="chat-result-label"><Sparkles size={13} /> TỔNG HỢP PHẢN HỒI</div><div className="chat-feedback-score"><strong>{feedback.average_rating ?? "—"}</strong><span>★ / 5<br />{feedback.count} đánh giá · {feedback.source === "ai" ? "AI" : "fallback"}</span></div><p>{feedback.summary}</p></div>;
}
