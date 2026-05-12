import { useState } from 'react';
import { createInquiry } from '../utils/firestore.js';
import { useToast } from './Toast.jsx';
import Spinner from './Spinner.jsx';
import { isEmail } from '../utils/validation.js';

export default function InquiryForm({ targetUid, targetName, shipmentId = null }) {
  const toast = useToast();
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    message: ''
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
    if (!form.message.trim() || form.message.trim().length < 8) {
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
        targetKind: 'exporter',
        shipmentId,
        ...form
      });
      setSent(true);
      toast.success('Inquiry sent.');
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
          Your inquiry is on its way
        </h3>
        <div className="divider-teal mt-3" />
        <p className="mt-4 text-sm text-koko-body">
          {targetName ? `${targetName} will reply` : 'You\'ll hear back'} via the email or phone you provided.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="card-elevated space-y-4">
      <div>
        <p className="eyebrow">Get in touch</p>
        <h3 className="mt-1 font-display text-2xl text-koko-ink">
          Send {targetName ? targetName : 'this exporter'} a message
        </h3>
        <p className="mt-1 text-sm text-koko-muted">
          No account needed. They'll reply directly to your email or phone.
        </p>
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

      <Field label="Message" id="iq-message" required error={errors.message}>
        <textarea
          id="iq-message"
          className={`input ${errors.message ? 'input-error' : ''}`}
          value={form.message}
          onChange={set('message')}
          placeholder="e.g. We're interested in 200kg of Grade A for Q1 — what's your availability?"
        />
      </Field>

      <button className="btn-accent w-full sm:w-auto" disabled={busy}>
        {busy && <Spinner size="sm" />} {busy ? 'Sending…' : 'Send inquiry'}
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
