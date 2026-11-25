'use client';
import { useActionState, useState } from 'react';
import type { FormState } from '@northem/core/forms';

export type FormAction = (prev: FormState | null, data: FormData) => Promise<FormState>;

export interface FieldSpec {
  name: string;
  label: string;
  type?: 'text' | 'email' | 'tel' | 'url' | 'textarea' | 'select' | 'chips';
  placeholder?: string;
  required?: boolean;
  options?: string[];
  hint?: string;
  wide?: boolean;
}

/**
 * One form component for every public form. The server action does the real
 * validation; this keeps the fields, honeypot and fill-time stamp consistent.
 */
export function SiteForm({ action, form, division, openingId, fields, submitLabel = 'Send', successTitle = 'Sent', className }: {
  action: FormAction; form: string; division?: string | null; openingId?: string | null;
  fields: FieldSpec[]; submitLabel?: string; successTitle?: string; className?: string;
}) {
  const [state, run, pending] = useActionState(action, null);
  const [started] = useState(() => Date.now());
  if (state?.ok) {
    return (
      <div className={`nm-form-done ${className ?? ''}`} role="status">
        <span className="nm-form-done-mark" aria-hidden>✓</span>
        <strong>{successTitle}</strong>
        <p>{state.message}</p>
      </div>
    );
  }
  return (
    <form action={run} className={`nm-form ${className ?? ''}`} noValidate={false}>
      <input type="hidden" name="form" value={form} />
      <input type="hidden" name="started" value={started} />
      {division ? <input type="hidden" name="division" value={division} /> : null}
      {openingId ? <input type="hidden" name="opening_id" value={openingId} /> : null}
      <div className="nm-hp" aria-hidden>
        <label>Website <input name="website" tabIndex={-1} autoComplete="off" /></label>
      </div>
      {fields.map((f) => <Field key={f.name} f={f} error={state?.errors?.[f.name]} />)}
      {state && !state.ok ? <p className="nm-form-error" role="alert">{state.message}</p> : null}
      <button type="submit" className="nm-btn nm-btn-primary" disabled={pending}>
        {pending ? 'Sending…' : submitLabel}
      </button>
    </form>
  );
}

function Field({ f, error }: { f: FieldSpec; error?: string }) {
  const id = `f-${f.name}`;
  const common = { id, name: f.name, required: f.required, placeholder: f.placeholder, 'aria-invalid': error ? true : undefined } as const;
  return (
    <div className={`nm-field ${f.wide || f.type === 'textarea' ? 'nm-field-wide' : ''}`}>
      <label htmlFor={id}>{f.label}{f.required ? <span aria-hidden> *</span> : null}</label>
      {f.type === 'textarea' ? <textarea {...common} rows={5} />
        : f.type === 'select' ? (
          <select {...common} defaultValue="">
            <option value="" disabled>Choose…</option>
            {f.options?.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        ) : f.type === 'chips' ? <Chips name={f.name} options={f.options ?? []} />
        : <input {...common} type={f.type ?? 'text'} autoComplete={f.type === 'email' ? 'email' : f.name === 'name' ? 'name' : undefined} />}
      {f.hint ? <small>{f.hint}</small> : null}
      {error ? <small className="nm-field-error">{error}</small> : null}
    </div>
  );
}

function Chips({ name, options }: { name: string; options: string[] }) {
  const [sel, setSel] = useState<string[]>([]);
  return (
    <div className="nm-chips" role="group">
      <input type="hidden" name={name} value={sel.join(', ')} />
      {options.map((o) => {
        const on = sel.includes(o);
        return (
          <button key={o} type="button" aria-pressed={on} className={`nm-chip ${on ? 'is-on' : ''}`}
            onClick={() => setSel((s) => (on ? s.filter((x) => x !== o) : [...s, o]))}>{o}</button>
        );
      })}
    </div>
  );
}
