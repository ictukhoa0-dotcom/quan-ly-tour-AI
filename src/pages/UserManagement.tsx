import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Pencil, Plus, Search, Shield, UserRound, X } from "lucide-react";
import { api } from "../api";
import type { Account, User } from "../types";

type Props = {
  currentUser: User;
  onToast: (message: string, kind?: "success" | "error") => void;
  onPasswordChanged: () => Promise<void>;
};

const roleLabels: Record<User["role"], string> = {
  admin: "Quản trị viên",
  consultant: "Tư vấn viên",
  accountant: "Kế toán",
};

const emptyForm = { username: "", name: "", role: "consultant" as User["role"], password: "" };

export default function UserManagement({ currentUser, onToast, onPasswordChanged }: Props) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    try {
      setAccounts(await api.accounts());
    } catch (reason) {
      onToast(reason instanceof Error ? reason.message : "Không thể tải tài khoản.", "error");
    } finally {
      setLoading(false);
    }
  }, [onToast]);

  useEffect(() => { void reload(); }, [reload]);

  const filtered = accounts.filter((account) =>
    `${account.username} ${account.name} ${account.role_label}`
      .toLocaleLowerCase("vi")
      .includes(query.toLocaleLowerCase("vi")),
  );

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setError("");
    setModalOpen(true);
  }

  function openEdit(account: Account) {
    setEditing(account);
    setForm({ username: account.username, name: account.name, role: account.role, password: "" });
    setError("");
    setModalOpen(true);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const changingOwnPassword = Boolean(editing && editing.username === currentUser.username && form.password);
      if (editing) {
        const { name, role, password } = form;
        await api.updateAccount(editing.id, { name, role, ...(password ? { password } : {}) });
      } else {
        await api.createAccount(form);
      }
      setModalOpen(false);
      if (changingOwnPassword) {
        onToast("Đã đổi mật khẩu. Vui lòng đăng nhập lại.");
        await onPasswordChanged();
        return;
      }
      await reload();
      onToast(editing ? "Đã cập nhật tài khoản." : "Đã tạo tài khoản mới.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể lưu tài khoản.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(account: Account) {
    try {
      await api.updateAccount(account.id, { is_active: !account.is_active });
      await reload();
      onToast(account.is_active ? "Đã vô hiệu hóa tài khoản." : "Đã kích hoạt tài khoản.");
    } catch (reason) {
      onToast(reason instanceof Error ? reason.message : "Không thể cập nhật trạng thái tài khoản.", "error");
    }
  }

  return (
    <div className="page-content entity-page">
      <div className="entity-heading">
        <div><span className="eyebrow">QUẢN TRỊ HỆ THỐNG</span><h2>Quản lý tài khoản</h2><p>Tạo nhân viên, phân quyền và đặt lại mật khẩu đăng nhập.</p></div>
        <button className="button button-primary" onClick={openCreate}><Plus size={17} /> Tạo tài khoản</button>
      </div>
      <section className="panel entity-panel">
        <div className="table-toolbar">
          <div><strong>{accounts.length}</strong><span> tài khoản</span></div>
          <label className="search-box"><Search size={16} /><input aria-label="Tìm kiếm tài khoản" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm kiếm..." /></label>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Tài khoản</th><th>Họ và tên</th><th>Vai trò</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={5}>Đang tải tài khoản…</td></tr>
                : filtered.length === 0 ? <tr><td colSpan={5}>Không tìm thấy tài khoản.</td></tr>
                  : filtered.map((account) => (
                    <tr key={account.id}>
                      <td><strong>{account.username}</strong></td>
                      <td>{account.name}</td>
                      <td>{roleLabels[account.role]}</td>
                      <td><span className={`status-pill ${account.is_active ? "status-green" : "status-red"}`}>{account.is_active ? "Đang hoạt động" : "Đã khóa"}</span></td>
                      <td><div className="table-actions">
                        <button className="icon-button" aria-label={`Sửa ${account.username}`} onClick={() => openEdit(account)}><Pencil size={15} /></button>
                        <button className="button button-secondary" disabled={account.username === currentUser.username} onClick={() => void toggleActive(account)}>
                          {account.is_active ? "Vô hiệu hóa" : "Kích hoạt"}
                        </button>
                      </div></td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </section>

      {modalOpen && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setModalOpen(false); }}>
        <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="account-modal-title">
          <header className="modal-header"><div><span className="eyebrow"><Shield size={12} /> TÀI KHOẢN NỘI BỘ</span><h2 id="account-modal-title">{editing ? "Cập nhật tài khoản" : "Tạo tài khoản"}</h2></div><button className="icon-button" onClick={() => setModalOpen(false)} aria-label="Đóng"><X size={19} /></button></header>
          <form onSubmit={save}>
            <div className="form-grid">
              {!editing && <label className="form-field"><span>Tên đăng nhập *</span><input autoComplete="username" minLength={3} maxLength={40} pattern="[A-Za-z0-9_.-]+" required value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} /></label>}
              <label className="form-field"><span>Họ và tên *</span><input autoComplete="name" maxLength={120} required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
              <label className="form-field"><span>Vai trò *</span><select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as User["role"] })}>
                {Object.entries(roleLabels).map(([role, label]) => <option key={role} value={role}>{label}</option>)}
              </select></label>
              <label className="form-field"><span>{editing ? "Mật khẩu mới (để trống nếu giữ nguyên)" : "Mật khẩu *"}</span><input type="password" autoComplete="new-password" minLength={12} maxLength={72} required={!editing} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label>
            </div>
            <p className="login-privacy"><UserRound size={13} /> Mật khẩu tối thiểu 12 ký tự, được băm BCrypt trước khi lưu.</p>
            {error && <div className="form-error" role="alert">{error}</div>}
            <footer className="modal-actions"><button type="button" className="button button-secondary" onClick={() => setModalOpen(false)}>Hủy</button><button type="submit" className="button button-primary" disabled={busy}>{busy ? "Đang lưu…" : "Lưu tài khoản"}</button></footer>
          </form>
        </section>
      </div>}
    </div>
  );
}
