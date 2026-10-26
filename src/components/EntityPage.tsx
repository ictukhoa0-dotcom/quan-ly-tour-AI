import { useMemo, useState } from "react";
import { CalendarDays, CircleDollarSign, ClipboardPlus, Pencil, Plus, Search, Trash2, Users } from "lucide-react";
import { api } from "../api";
import { canWrite, resourceFields, resourceTitles } from "../data";
import type { Field, ResourceName, Row, User } from "../types";
import ConfirmDialog from "./ConfirmDialog";
import ModalForm from "./ModalForm";

const columns: Record<ResourceName, [string, string][]> = {
  tours: [["name", "Tên tour"], ["destination_name", "Điểm đến"], ["duration_days", "Thời lượng"], ["price", "Giá"], ["category", "Danh mục"], ["status", "Trạng thái"]],
  destinations: [["name", "Điểm đến"], ["region", "Khu vực"], ["description", "Mô tả"]],
  itineraries: [["tour_name", "Tour"], ["day_number", "Ngày"], ["title", "Nội dung"], ["details", "Chi tiết"]],
  departures: [["tour_name", "Tour"], ["departure_date", "Khởi hành"], ["remaining_seats", "Còn trống"], ["capacity", "Sức chứa"], ["status", "Trạng thái"]],
  customers: [["name", "Khách hàng"], ["phone", "Điện thoại"], ["email", "Email"], ["address", "Địa chỉ"]],
  bookings: [["booking_code", "Mã đơn"], ["customer_name", "Khách hàng"], ["tour_name", "Tour"], ["departure_date", "Khởi hành"], ["seats", "Số chỗ"], ["total_amount", "Tổng tiền"], ["paid_amount", "Đã thu"], ["amount_due", "Còn nợ"], ["status", "Trạng thái"]],
  payments: [["booking_code", "Mã đơn"], ["amount", "Số tiền"], ["method", "Phương thức"], ["paid_at", "Ngày thu"], ["note", "Ghi chú"]],
  guides: [["name", "Hướng dẫn viên"], ["phone", "Điện thoại"], ["languages", "Ngôn ngữ"], ["status", "Trạng thái"]],
  assignments: [["guide_name", "Hướng dẫn viên"], ["departure_date", "Khởi hành"], ["note", "Ghi chú"]],
  feedback: [["customer_name", "Khách hàng"], ["tour_name", "Tour"], ["rating", "Đánh giá"], ["comment", "Nội dung"], ["created_at", "Ngày gửi"]],
};

const descriptions: Record<ResourceName, string> = {
  tours: "Quản lý sản phẩm tour, giá bán và trạng thái khai thác.",
  destinations: "Danh mục điểm đến và vùng du lịch của VietTour.",
  itineraries: "Tổ chức nội dung từng ngày trong hành trình.",
  departures: "Theo dõi ngày khởi hành, sức chứa và chỗ còn.",
  customers: "Lưu thông tin liên hệ và lịch sử khách hàng.",
  bookings: "Tạo đơn, giữ chỗ và quản lý trạng thái đặt tour.",
  payments: "Theo dõi khoản thu, tiền cọc và số dư đơn hàng.",
  guides: "Quản lý đội ngũ hướng dẫn viên và ngôn ngữ.",
  assignments: "Phân công hướng dẫn viên theo lịch khởi hành.",
  feedback: "Ghi nhận đánh giá sau chuyến đi.",
};

const money = (value: number) => new Intl.NumberFormat("vi-VN").format(value) + " ₫";
const dateText = (value: string) => {
  if (!value) return "—";
  const date = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("vi-VN", { day: "2-digit", month: "short", year: "numeric" });
};

type Props = {
  resource: ResourceName;
  rows: Row[];
  datasets: Record<string, Row[]>;
  role: User["role"];
  busy: boolean;
  onReload: () => Promise<void>;
  onToast: (message: string, kind?: "success" | "error") => void;
};

export default function EntityPage({ resource, rows, datasets, role, busy, onReload, onToast }: Props) {
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Row | undefined>();
  const [confirmation, setConfirmation] = useState<{ action: "delete" | "cancel"; row: Row } | null>(null);
  const [pending, setPending] = useState(false);
  const writable = canWrite(resource, role);
  const list = useMemo(() => rows.filter((row) => Object.values(row).some((value) => String(value ?? "").toLocaleLowerCase("vi").includes(query.toLocaleLowerCase("vi")))), [rows, query]);
  const fields: Field[] = useMemo(() => resourceFields[resource].map((field) => {
    const sources: Record<string, { source: string; label: string } | undefined> = {
      destination_id: { source: "destinations", label: "name" },
      tour_id: { source: "tours", label: "name" },
      customer_id: { source: "customers", label: "name" },
      departure_id: { source: "departures", label: "departure_date" },
      guide_id: { source: "guides", label: "name" },
      booking_id: { source: "bookings", label: "booking_code" },
    };
    const source = sources[field.key];
    if (!source) return field;
    const options = (datasets[source.source] ?? []).filter((item) => {
      if (field.key === "departure_id") return item.status === "Đang mở" && Number(item.remaining_seats) > 0 && String(item.departure_date) >= new Date().toISOString().slice(0, 10);
      if (field.key === "booking_id") return item.status !== "Đã hủy" && Number(item.amount_due) > 0;
      return true;
    });
    return {
      ...field,
      max: field.key === "booking_id" ? undefined : field.max,
      options: options.map((item) => ({
        value: Number(item.id),
        label: String(item[source.label] ?? `#${item.id}`) + (field.key === "departure_id"
          ? ` · ${String(item.tour_name ?? "")} · còn ${item.remaining_seats}`
          : field.key === "booking_id" ? ` · còn nợ ${money(Number(item.amount_due))}` : ""),
      })),
    };
  }), [resource, datasets]);

  async function save(payload: Record<string, string | number>) {
    try {
      if (editing) await api.update(resource, Number(editing.id), payload);
      else await api.create(resource, payload);
      await onReload();
      setModal(false);
      setEditing(undefined);
      onToast(editing ? "Đã cập nhật thông tin." : "Đã tạo mới thành công.");
    } catch (error) {
      onToast(error instanceof Error ? error.message : "Không thể lưu dữ liệu.", "error");
      throw error;
    }
  }

  async function confirmAction() {
    if (!confirmation || pending) return;
    const { action, row } = confirmation;
    setPending(true);
    try {
      if (action === "delete") await api.remove(resource, Number(row.id));
      else await api.cancelBooking(Number(row.id));
      await onReload();
      onToast(action === "delete" ? "Đã xóa thành công." : "Đã hủy đơn và cập nhật số chỗ.");
      setConfirmation(null);
    } catch (error) {
      onToast(error instanceof Error ? error.message : action === "delete" ? "Không thể xóa mục này." : "Không thể hủy đơn.", "error");
    } finally {
      setPending(false);
    }
  }

  const createOnly = resource === "bookings" || resource === "payments";
  const showCreate = writable;
  const createLabel = resource === "bookings" ? "Tạo đơn đặt tour" : resource === "payments" ? "Ghi nhận thanh toán" : "Thêm mới";
  const Icon = resource === "customers" ? Users : resource === "payments" ? CircleDollarSign : resource === "bookings" ? ClipboardPlus : Plus;

  return (
    <div className="page-content entity-page">
      <div className="entity-heading"><div><span className="eyebrow">QUẢN LÝ VẬN HÀNH</span><h2>{resourceTitles[resource]}</h2><p>{descriptions[resource]}</p></div>{showCreate && <button className="button button-primary" onClick={() => { setEditing(undefined); setModal(true); }}><Icon size={17} /> {createLabel}</button>}</div>
      <section className="panel entity-panel">
        <div className="table-toolbar"><div><strong>{rows.length}</strong><span> mục dữ liệu</span></div><label className="search-box"><Search size={16} /><input aria-label="Tìm kiếm" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm kiếm..." /></label></div>
        <div className="table-wrap"><table><thead><tr>{columns[resource].map(([key, label]) => <th key={key}>{label}</th>)}{writable && <th className="actions-head">Thao tác</th>}</tr></thead>
          <tbody>
            {list.map((row) => <tr key={row.id}>
              {columns[resource].map(([key]) => <td key={key}>{key === "price" || key === "amount" || key === "total_amount" || key === "paid_amount" || key === "amount_due" ? money(Number(row[key] ?? 0)) :
                key === "departure_date" || key === "created_at" || key === "paid_at" ? dateText(String(row[key] ?? "")) :
                key === "duration_days" ? `${row[key]} ngày` :
                key === "remaining_seats" ? <span className={Number(row[key]) <= 3 ? "seat-low" : ""}>{row[key]} chỗ</span> :
                key === "rating" ? <span className="rating-value">★ {row[key]}/5</span> :
                key === "description" || key === "details" || key === "comment" ? <span className="cell-truncate" title={String(row[key] ?? "")}>{row[key]}</span> :
                key === "status" ? <span className={`status-pill ${row[key] === "Đã hủy" ? "status-red" : row[key] === "Chờ xác nhận" ? "status-amber" : "status-green"}`}>{row[key]}</span> :
                row[key] ?? "—"}</td>)}
              {writable && <td><div className="row-actions">
                {resource === "bookings" && row.status !== "Đã hủy" && <button className="text-action action-danger" disabled={pending} onClick={() => setConfirmation({ action: "cancel", row })}>Hủy đơn</button>}
                {!createOnly && <><button className="icon-button small-icon" disabled={pending} aria-label="Chỉnh sửa" title="Chỉnh sửa" onClick={() => { setEditing(row); setModal(true); }}><Pencil size={15} /></button><button className="icon-button small-icon delete-action" disabled={pending} aria-label="Xóa" title="Xóa" onClick={() => setConfirmation({ action: "delete", row })}><Trash2 size={15} /></button></>}
              </div></td>}
            </tr>)}
            {!list.length && busy && Array.from({ length: 5 }, (_, row) => <tr className="skeleton-row" key={`loading-${row}`}>{columns[resource].map(([key]) => <td key={key}><span className="skeleton-cell" /></td>)}{writable && <td><span className="skeleton-cell" /></td>}</tr>)}
            {!list.length && !busy && <tr><td className="table-empty" colSpan={columns[resource].length + (writable ? 1 : 0)}>{query ? "Không tìm thấy kết quả phù hợp." : "Chưa có dữ liệu. Hãy tạo mục đầu tiên."}</td></tr>}
          </tbody>
        </table></div>
        <div className="table-footer"><span>Hiển thị <strong>{list.length}</strong> trên {rows.length} mục</span><span>{resource === "departures" && <><CalendarDays size={14} /> Số chỗ được cập nhật theo đơn đang hoạt động</>}</span></div>
      </section>
      {modal && <ModalForm title={`${editing ? "Chỉnh sửa" : "Thêm"} ${resourceTitles[resource].toLocaleLowerCase("vi")}`} fields={fields} initial={editing} onClose={() => { setModal(false); setEditing(undefined); }} onSubmit={save} />}
      {confirmation && <ConfirmDialog
        title={confirmation.action === "delete" ? "Xóa dữ liệu này?" : "Hủy đơn đặt tour?"}
        description={confirmation.action === "delete"
          ? `Bạn sắp xóa ${String(confirmation.row.name ?? confirmation.row.booking_code ?? "mục dữ liệu này")}. Thao tác này không thể hoàn tác và có thể bị từ chối nếu dữ liệu đang được sử dụng.`
          : `Đơn ${String(confirmation.row.booking_code)} sẽ được hủy và ${confirmation.row.seats} chỗ sẽ được hoàn lại lịch khởi hành.`}
        confirmLabel={confirmation.action === "delete" ? "Xóa dữ liệu" : "Xác nhận hủy"}
        busy={pending}
        onCancel={() => setConfirmation(null)}
        onConfirm={() => void confirmAction()}
      />}
    </div>
  );
}
