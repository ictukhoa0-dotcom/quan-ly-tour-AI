import { useEffect, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import type { Field, Row } from "../types";

type Props = {
  title: string;
  fields: Field[];
  initial?: Row;
  onClose: () => void;
  onSubmit: (value: Record<string, string | number>) => Promise<void>;
};

export default function ModalForm({ title, fields, initial, onClose, onSubmit }: Props) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const next: Record<string, string> = {};
    for (const field of fields) {
      const value = initial?.[field.key];
      next[field.key] = value === null || value === undefined ? "" : String(value);
      if (!next[field.key] && field.kind === "date" && field.key === "created_at") next[field.key] = new Date().toISOString().slice(0, 10);
    }
    setValues(next);
  }, [fields, initial]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const payload: Record<string, string | number> = {};
    for (const field of fields) {
      const raw = values[field.key] ?? "";
      payload[field.key] = field.kind === "number" ? Number(raw) : raw;
    }
    try {
      await onSubmit(payload);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể lưu dữ liệu.");
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <header className="modal-header"><div><span className="eyebrow">VIETTOUR AI</span><h2 id="modal-title">{title}</h2></div><button className="icon-button" onClick={onClose} aria-label="Đóng"><X size={19} /></button></header>
        <form onSubmit={submit}>
          <div className="form-grid">
            {fields.map((field) => (
              <label className={`form-field ${field.kind === "textarea" ? "field-wide" : ""}`} key={field.key}>
                <span>{field.label}{field.required && <b> *</b>}</span>
                {field.kind === "textarea" ? (
                  <textarea required={field.required} rows={3} value={values[field.key] ?? ""} onChange={(event) => setValues({ ...values, [field.key]: event.target.value })} />
                ) : field.kind === "select" ? (
                  <select required={field.required} value={values[field.key] ?? ""} onChange={(event) => setValues({ ...values, [field.key]: event.target.value })}>
                    <option value="">Chọn {field.label.toLowerCase()}</option>
                    {field.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                ) : (
                  <input type={field.kind === "number" ? "number" : field.kind === "date" ? "date" : field.kind === "email" ? "email" : "text"}
                    min={field.min} max={field.max} required={field.required} value={values[field.key] ?? ""}
                    onChange={(event) => setValues({ ...values, [field.key]: event.target.value })} />
                )}
              </label>
            ))}
          </div>
          {error && <div className="form-error" role="alert">{error}</div>}
          <footer className="modal-actions"><button type="button" className="button button-secondary" onClick={onClose}>Hủy</button><button type="submit" className="button button-primary" disabled={saving}>{saving ? "Đang lưu…" : "Lưu thông tin"}</button></footer>
        </form>
      </section>
    </div>
  );
}
