import { useState } from 'react';
import { createInquiry } from '../utils/firestore.js';
import { useToast } from './Toast.jsx';
import Spinner from './Spinner.jsx';
import { isEmail } from '../utils/validation.js';

const CURRENCIES = ['USD', 'EUR', 'NZD', 'AUD', 'WST', 'JPY', 'GBP'];
const GRADES = [
  { value: 'any', label: 'Any grade' },
  { value: 'A', label: 'Grade A' },
  { value: 'B', label: 'Grade B' },
  { value: 'C', label: 'Grade C' }
];

const TARGET_LABEL = {
  exporter: 'exporter',
  farmer: 'farmer'
};

export default function InquiryForm({
  targetUid,
  targetName,
  targetKind = 'exporter',
  shipmentId = null
}) {
  const toast = useToast();
  const [mode, setMode] = useState('message'); // 'message' | 'order'
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    message: '',
    // RFQ fields
    quantityKg: '',
    qualityGrade: 'any',
    variety: '',
    targetPrice: '',
    currency: 'USD',
    deliveryDate: '',
    destination: ''
  });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    if (errors[k]) setErrors((s) => ({ ...s, [k]: undefined }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.name.trim()) errs.name = 'Enter your name.';
    if (!form.email.trim() && !form.phone.trim()) {
      errs.email = 'Add an email or a phone — so they can reply.';
    } else if (form.email.trim() && !isEmail(form.email)) {
      errs.email = 'That email looks off.';
    }

    if (mode === 'order') {
      const kg = Number(form.quantityKg);
      if (!kg || kg <= 0) errs.quantityKg = 'Enter the quantity you want (kg).';
      if (!form.message.trim() || form.message.trim().length < 4) {
        // Order messages can be shorter — context is in the structured fields.
        errs.message = 'Add a short note (any context for the seller).';
      }
    } else if (!form.message.trim() || form.message.trim().length < 8) {
      errs.message = 'Add a short message (at least 8 characters).';
    }

    setErrors(errs);
    if (Object.keys(errs).length) {
      toast.error(Object.values(errs)[0]);
      return;
    }
    setBusy(true);
    try {
      await createInquiry({
        targetUid,
        targetKind,
        shipmentId,
        kind: mode === 'order' ? 'order' : 'inquiry',
        ...form,
        quantityKg: mode === 'order' ? form.quantityKg : null,
        qualityGrade: mode === 'order' ? form.qualityGrade : null,
        variety: mode === 'order' ? form.variety : null,
        targetPrice: mode === 'order' ? form.targetPrice : null,
        currency: mode === 'order' ? form.currency : null,
        deliveryDate: mode === 'order' ? form.deliveryDate : null,
        destination: mode === 'order' ? form.destination : null
      });
      setSent(true);
      toast.success(mode === 'order' ? 'RFQ sent.' : 'Inquiry sent.');
    } catch (err) {
      toast.error(err.message || 'Could not send.');
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <div className="card-elevated text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-koko-teal100 text-koko-teal animate-bounce-sm">
          <span className="text-xl">✓</span>
        </div>
        <p className="eyebrow mt-3">Sent</p>
        <h3 className="mt-2 font-display text-2xl text-koko-ink">
          {mode === 'order'
            ? 'Your RFQ is on its way'
            : 'Your inquiry is on its way'}
        </h3>
        <div className="divider-teal mt-3" />
        <p className="mt-4 text-sm text-koko-body">
          {targetName ? `${targetName} will reply` : "You'll hear back"} via the email or
          phone you provided.
        </p>
      </div>
    );
  }

  const targetLabel = targetName || `this ${TARGET_LABEL[targetKind] || 'seller'}`;

  return (
    <form onSubmit={onSubmit} noValidate className="card-elevated space-y-4">
      <div>
        <p className="eyebrow">Get in touch</p>
        <h3 className="mt-1 font-display text-2xl text-koko-ink">
          Reach {targetLabel}
        </h3>
        <p className="mt-1 text-sm text-koko-muted">
          No account needed. They'll reply directly to your email or phone.
        </p>
      </div>

      {/* Mode toggle */}
      <div
        role="tablist"
        className="inline-flex rounded-xl border border-koko-border p-1 bg-koko-bg/40"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'message'}
          onClick={() => setMode('message')}
          className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${
            mode === 'message'
              ? 'bg-white text-koko-ink shadow-sm'
              : 'text-koko-muted hover:text-koko-ink'
          }`}
        >
          Send a message
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'order'}
          onClick={() => setMode('order')}
          className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${
            mode === 'order'
              ? 'bg-white text-koko-ink shadow-sm'
              : 'text-koko-muted hover:text-koko-ink'
          }`}
        >
          Place an RFQ
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Your name" id="iq-name" required error={errors.name}>
          <input
            id="iq-name"
            className={`input ${errors.name ? 'input-error' : ''}`}
            value={form.name}
            onChange={set('name')}
            autoComplete="name"
          />
        </Field>
        <Field label="Company" id="iq-company" hint="Optional">
          <input
            id="iq-company"
            className="input"
            value={form.company}
            onChange={set('company')}
            autoComplete="organization"
          />
        </Field>
        <Field label="Email" id="iq-email" error={errors.email}>
          <input
            id="iq-email"
            type="email"
            className={`input ${errors.email ? 'input-error' : ''}`}
            value={form.email}
            onChange={set('email')}
            autoComplete="email"
          />
        </Field>
        <Field label="Phone" id="iq-phone" hint="Optional · +685 …">
          <input
            id="iq-phone"
            type="tel"
            className="input"
            value={form.phone}
            onChange={set('phone')}
            autoComplete="tel"
          />
        </Field>
      </div>

      {mode === 'order' && (
        <div className="grid gap-4 rounded-2xl border border-koko-border bg-koko-bg/30 p-4 sm:grid-cols-2">
          <Field
            label="Quantity (kg)"
            id="iq-kg"
            required
            error={errors.quantityKg}
          >
            <input
              id="iq-kg"
              type="number"
              min="1"
              step="1"
              className={`input ${errors.quantityKg ? 'input-error' : ''}`}
              value={form.quantityKg}
              onChange={set('quantityKg')}
              placeholder="e.g. 200"
            />
          </Field>
          <Field label="Quality grade" id="iq-grade">
            <select
              id="iq-grade"
              className="input"
              value={form.qualityGrade}
              onChange={set('qualityGrade')}
            >
              {GRADES.map((g) => (
                <option key={g.value} value={g.value}>{g.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Variety" id="iq-variety" hint="Optional · e.g. Trinitario">
            <input
              id="iq-variety"
              className="input"
              value={form.variety}
              onChange={set('variety')}
            />
          </Field>
          <Field label="Target price (per kg)" id="iq-price" hint="Optional">
            <div className="flex gap-2">
              <input
                id="iq-price"
                type="number"
                step="0.01"
                min="0"
                className="input flex-1"
                value={form.targetPrice}
                onChange={set('targetPrice')}
                placeholder="0.00"
              />
              <select
                aria-label="Currency"
                className="input !w-24"
                value={form.currency}
                onChange={set('currency')}
              >
                {CURRENCIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
          </Field>
          <Field label="Delivery by" id="iq-delivery" hint="Optional">
            <input
              id="iq-delivery"
              type="date"
              className="input"
              value={form.deliveryDate}
              onChange={set('deliveryDate')}
            />
          </Field>
          <Field label="Destination" id="iq-dest" hint="Where the shipment lands">
            <input
              id="iq-dest"
              className="input"
              value={form.destination}
              onChange={set('destination')}
              placeholder="e.g. Tokyo, Japan"
            />
          </Field>
        </div>
      )}

      <Field
        label={mode === 'order' ? 'Notes for the seller' : 'Message'}
        id="iq-message"
        required
        error={errors.message}
      >
        <textarea
          id="iq-message"
          className={`input ${errors.message ? 'input-error' : ''}`}
          value={form.message}
          onChange={set('message')}
          placeholder={
            mode === 'order'
              ? 'Anything they should know — packaging, payment terms, prior conversations…'
              : "e.g. We're interested in your Trinitario — what's your availability?"
          }
        />
      </Field>

      <button className="btn-accent w-full sm:w-auto" disabled={busy}>
        {busy && <Spinner size="sm" />}{' '}
        {busy
          ? 'Sending…'
          : mode === 'order'
            ? 'Send RFQ'
            : 'Send inquiry'}
      </button>
    </form>
  );
}

function Field({ label, id, hint, error, required, children }) {
  return (
    <div>
      <label htmlFor={id} className="label">
        {label} {required && <span className="text-koko-error">*</span>}
      </label>
      {children}
      {hint && !error && <p className="helper">{hint}</p>}
      {error && (
        <p className="error-text" role="alert">
          <span aria-hidden>!</span> {error}
        </p>
      )}
    </div>
  );
}
