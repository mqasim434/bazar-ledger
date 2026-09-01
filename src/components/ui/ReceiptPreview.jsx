import { Button } from './Button';
import { buildReceiptText, buildWhatsAppLink, normalizeWhatsAppNumber } from '../../utils/whatsapp';
import { useState } from 'react';

export function ReceiptPreview({ type, data, phone, onSent }) {
  const [copied, setCopied] = useState(false);
  const text = buildReceiptText(type, data);
  const hasPhone = Boolean(normalizeWhatsAppNumber(phone));

  async function copyText() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function share() {
    window.open(buildWhatsAppLink(phone, text), '_blank', 'noopener,noreferrer');
    onSent?.();
  }

  return (
    <div className="space-y-3">
      <pre className="whitespace-pre-wrap rounded-md border border-ink-100 bg-brand-50 p-4 font-body text-sm text-ink-900">
        {text}
      </pre>
      <div className="flex flex-wrap gap-2">
        {hasPhone ? (
          <Button onClick={share}>Share on WhatsApp</Button>
        ) : (
          <Button variant="secondary" onClick={copyText}>
            {copied ? 'Copied' : 'Copy receipt text'}
          </Button>
        )}
        {hasPhone && (
          <Button variant="secondary" onClick={copyText}>
            {copied ? 'Copied' : 'Copy text'}
          </Button>
        )}
      </div>
      {!hasPhone && (
        <p className="text-xs text-ink-500">
          No phone number on file — copy the receipt and share it manually.
        </p>
      )}
    </div>
  );
}
