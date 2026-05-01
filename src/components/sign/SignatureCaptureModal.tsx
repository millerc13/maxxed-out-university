'use client';

import { useEffect, useRef, useState } from 'react';

export interface CapturedSignature {
  typedName: string;
  pngDataUrl: string;
  mode: 'typed' | 'drawn';
}

interface Props {
  open: boolean;
  initialName: string;
  recipientEmail: string;
  // When true, modal shows an "I agree to all terms above" checkbox
  // before the Adopt button is enabled. Adopting then both records
  // the signature AND submits the agreement (the modal is the entire
  // signing experience). When false, the modal just captures —
  // caller is responsible for the agreement step.
  requireAgreement?: boolean;
  // Optional: external "submitting" state from the parent so the
  // adopt button shows a Signing… label and disables while the POST
  // is in flight after onAdopt is called.
  submitting?: boolean;
  onCancel: () => void;
  onAdopt: (sig: CapturedSignature) => void;
}

type Tab = 'type' | 'draw';

// DocuSign-style "Adopt your signature" modal. Two tabs (Type / Draw),
// live preview as the user types, finger/mouse canvas with Clear
// button. Returns either a stylized PNG of the typed name OR a PNG of
// the drawn strokes. The "typed" mode is itself rendered to PNG so
// the final canonical signature is always an image — same render
// path on the live page and in the PDF.
export function SignatureCaptureModal({
  open,
  initialName,
  recipientEmail,
  requireAgreement = false,
  submitting = false,
  onCancel,
  onAdopt,
}: Props) {
  const [tab, setTab] = useState<Tab>('type');
  const [typedName, setTypedName] = useState(initialName);
  const [drawnEmpty, setDrawnEmpty] = useState(true);
  const [agreed, setAgreed] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (open) {
      setTab('type');
      setTypedName(initialName);
      setDrawnEmpty(true);
      setAgreed(false);
    }
  }, [open, initialName]);

  // Lock body scroll while open + close on Escape.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onCancel]);

  // Set up canvas DPR scaling so strokes don't look pixellated on
  // high-density screens. Re-runs whenever the draw tab activates
  // (the canvas is unmounted/remounted between tabs in the markup).
  useEffect(() => {
    if (!open || tab !== 'draw') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0f172a';
  }, [open, tab]);

  // Render the typed-mode preview to its own offscreen-style canvas so
  // we can produce the same PNG that gets stored. Updates live as the
  // user types.
  useEffect(() => {
    if (!open || tab !== 'type') return;
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(dpr, dpr);
    ctx.fillStyle = '#0f172a';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.font = '700 64px "Caveat", cursive';
    const text = typedName.trim() || 'Type your name';
    const pale = !typedName.trim();
    ctx.globalAlpha = pale ? 0.25 : 1;
    ctx.fillText(text, rect.width / 2, rect.height / 2);
    ctx.globalAlpha = 1;
  }, [open, tab, typedName]);

  function pointFromEvent(
    e: React.PointerEvent<HTMLCanvasElement>,
  ): { x: number; y: number } {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    lastPointRef.current = pointFromEvent(e);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const p = pointFromEvent(e);
    const last = lastPointRef.current;
    if (last) {
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }
    lastPointRef.current = p;
    if (drawnEmpty) setDrawnEmpty(false);
  }

  function handlePointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    drawingRef.current = false;
    lastPointRef.current = null;
    const canvas = canvasRef.current;
    if (canvas && canvas.hasPointerCapture(e.pointerId)) {
      canvas.releasePointerCapture(e.pointerId);
    }
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setDrawnEmpty(true);
  }

  function adopt() {
    if (tab === 'type') {
      const name = typedName.trim();
      if (name.length < 2) return;
      const canvas = previewCanvasRef.current;
      if (!canvas) return;
      const png = canvas.toDataURL('image/png');
      onAdopt({ typedName: name, pngDataUrl: png, mode: 'typed' });
    } else {
      if (drawnEmpty) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const png = canvas.toDataURL('image/png');
      const name = typedName.trim();
      if (name.length < 2) {
        // Drawn signature still requires a typed name for the audit
        // record — flip to the type tab so the user supplies one.
        setTab('type');
        return;
      }
      onAdopt({ typedName: name, pngDataUrl: png, mode: 'drawn' });
    }
  }

  if (!open) return null;

  const trimmed = typedName.trim();
  const sigReady =
    tab === 'type' ? trimmed.length >= 2 : !drawnEmpty && trimmed.length >= 2;
  const canAdopt = sigReady && (!requireAgreement || agreed) && !submitting;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="sigmodal-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-0 sm:px-4"
      onClick={onCancel}
    >
      <div
        className="bg-white w-full sm:max-w-xl rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="px-5 py-4 sm:px-6 sm:py-5 border-b border-gray-100 flex items-start justify-between gap-3">
          <div>
            <h2
              id="sigmodal-title"
              className="text-base sm:text-lg font-bold text-gray-900"
            >
              Adopt your signature
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Signing as {recipientEmail}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            className="text-gray-400 hover:text-gray-600 p-1 -m-1"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </header>

        <div className="px-5 sm:px-6 pt-4 border-b border-gray-100">
          <div className="inline-flex rounded-lg bg-gray-100 p-1">
            <TabButton active={tab === 'type'} onClick={() => setTab('type')}>
              Type
            </TabButton>
            <TabButton active={tab === 'draw'} onClick={() => setTab('draw')}>
              Draw
            </TabButton>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 space-y-4">
          {tab === 'type' && (
            <>
              <label className="block">
                <span className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                  Full legal name
                </span>
                <input
                  type="text"
                  value={typedName}
                  onChange={(e) => setTypedName(e.target.value)}
                  placeholder="First Last"
                  autoFocus
                  className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-maxxed-blue focus:border-maxxed-blue"
                />
              </label>
              <div className="block">
                <span className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                  Preview
                </span>
                <div className="relative rounded-xl border border-gray-200 bg-gray-50 h-32 sm:h-36 flex items-center justify-center overflow-hidden">
                  <canvas
                    ref={previewCanvasRef}
                    className="w-full h-full"
                    style={{ width: '100%', height: '100%' }}
                  />
                </div>
                <p className="text-[11px] text-gray-400 mt-1.5">
                  This will be the signature on your agreement.
                </p>
              </div>
            </>
          )}
          {tab === 'draw' && (
            <>
              <div>
                <span className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                  Draw signature
                </span>
                <div className="relative rounded-xl border-2 border-dashed border-gray-300 bg-white h-44 sm:h-48 overflow-hidden touch-none select-none">
                  <canvas
                    ref={canvasRef}
                    className="w-full h-full block touch-none"
                    style={{ width: '100%', height: '100%', touchAction: 'none' }}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerLeave={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                  />
                  {drawnEmpty && (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-gray-300 text-sm">
                      Sign here with your finger or mouse
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between mt-2">
                  <button
                    type="button"
                    onClick={clearCanvas}
                    className="text-sm font-semibold text-gray-500 hover:text-gray-700"
                  >
                    Clear
                  </button>
                  <p className="text-[11px] text-gray-400">
                    Use a finger on mobile or a mouse on desktop.
                  </p>
                </div>
              </div>
              <label className="block">
                <span className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                  Full legal name (for the audit record)
                </span>
                <input
                  type="text"
                  value={typedName}
                  onChange={(e) => setTypedName(e.target.value)}
                  placeholder="First Last"
                  className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-maxxed-blue focus:border-maxxed-blue"
                />
              </label>
            </>
          )}
        </div>

        <footer className="px-5 sm:px-6 py-4 border-t border-gray-100 bg-gray-50 space-y-3">
          {requireAgreement && (
            <label className="flex items-start gap-2.5 text-xs sm:text-sm text-gray-700 cursor-pointer leading-snug">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                disabled={submitting}
                className="mt-0.5 w-4 h-4 accent-maxxed-blue cursor-pointer shrink-0"
              />
              <span>
                I have read and agree to the terms of this agreement above.
                I understand that adopting this signature is legally
                binding and equivalent to a handwritten signature.
              </span>
            </label>
          )}
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={submitting}
              className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={adopt}
              disabled={!canAdopt}
              className="inline-flex items-center justify-center rounded-lg bg-maxxed-blue px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting
                ? 'Signing…'
                : requireAgreement
                ? 'Adopt and sign agreement'
                : 'Adopt and sign'}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ' +
        (active
          ? 'bg-white text-gray-900 shadow-sm'
          : 'text-gray-500 hover:text-gray-700')
      }
    >
      {children}
    </button>
  );
}
