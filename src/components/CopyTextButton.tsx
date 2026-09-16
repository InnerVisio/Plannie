import React, { useEffect, useRef, useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface CopyTextButtonProps {
  text: string;
  label?: string;
}

export default function CopyTextButton({ text, label = 'Kopírovat' }: CopyTextButtonProps) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  const handleCopy = async () => {
    const value = text.trim();
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard rejects on non-HTTPS origins and when permission is denied
      window.prompt('Zkopírujte popisek ručně:', value);
    }
  };

  if (!text.trim()) return null;

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={label}
      aria-label={label}
      className="text-xs font-bold text-secondary hover:text-primary flex items-center gap-1.5 shrink-0 transition-colors"
    >
      {copied ? (
        <>
          <Check className="w-3.5 h-3.5" style={{ color: 'var(--status-approved-fg)' }} />
          <span style={{ color: 'var(--status-approved-fg)' }}>Zkopírováno</span>
        </>
      ) : (
        <>
          <Copy className="w-3.5 h-3.5" />
          {label}
        </>
      )}
    </button>
  );
}
