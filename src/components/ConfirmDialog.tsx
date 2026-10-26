import { AlertTriangle, LoaderCircle, X } from "lucide-react";

type Props = {
  title: string;
  description: string;
  confirmLabel: string;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function ConfirmDialog({ title, description, confirmLabel, busy, onCancel, onConfirm }: Props) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onCancel(); }}>
      <section className="confirm-card" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-description">
        <button className="icon-button confirm-close" type="button" aria-label="Đóng" disabled={busy} onClick={onCancel}><X size={18} /></button>
        <div className="confirm-icon"><AlertTriangle size={21} /></div>
        <h2 id="confirm-title">{title}</h2>
        <p id="confirm-description">{description}</p>
        <div className="confirm-actions">
          <button className="button button-secondary" type="button" disabled={busy} onClick={onCancel}>Quay lại</button>
          <button className="button button-danger" type="button" disabled={busy} onClick={onConfirm}>
            {busy && <LoaderCircle className="spin" size={15} />}{busy ? "Đang xử lý…" : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
