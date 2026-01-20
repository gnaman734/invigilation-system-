import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

const TRANSITION_MS = 180;

function getFocusableElements(container) {
  if (!container) {
    return [];
  }

  return Array.from(
    container.querySelectorAll(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  );
}

export default function Modal({ isOpen, onClose, title, children }) {
  const [isRendered, setIsRendered] = useState(isOpen);
  const dialogRef = useRef(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      return;
    }

    const timeoutId = window.setTimeout(() => setIsRendered(false), TRANSITION_MS);
    return () => window.clearTimeout(timeoutId);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    document.body.classList.add('overflow-hidden');
    const preferredTarget = dialogRef.current?.querySelector(
      '[autofocus], input:not([disabled]), select:not([disabled]), textarea:not([disabled])'
    );
    const focusable = getFocusableElements(dialogRef.current);
    const initialTarget = preferredTarget ?? focusable[0] ?? null;

    if (initialTarget) {
      initialTarget.focus();
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current?.();
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const items = getFocusableElements(dialogRef.current);
      if (items.length === 0) {
        event.preventDefault();
        return;
      }

      const first = items[0];
      const last = items[items.length - 1];
      const activeElement = document.activeElement;

      if (event.shiftKey && activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.classList.remove('overflow-hidden');
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  if (!isRendered) {
    return null;
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-colors duration-200 ${
        isOpen ? 'bg-slate-900/50' : 'bg-slate-900/0'
      }`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`h-[100dvh] w-full rounded-none border border-gray-100 bg-white p-5 shadow-xl transition-all duration-150 ease-in-out sm:h-auto sm:max-w-lg sm:rounded-2xl sm:p-6 ${
          isOpen ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-2 scale-95 opacity-0'
        }`}
      >
        <div className="mb-4 flex items-start justify-between gap-3 border-b border-gray-100 pb-3">
          <h2 className="text-lg font-semibold text-[#1A1A2E]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-500 transition hover:bg-gray-100 hover:text-gray-800"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}
