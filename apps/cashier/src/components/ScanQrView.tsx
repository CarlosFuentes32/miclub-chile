import type { IScannerControls } from "@zxing/browser";
import { Keyboard, ScanLine } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";

export function ScanQrView({
  onDetected,
}: {
  onDetected: (payload: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null),
    controlsRef = useRef<IScannerControls | null>(null);
  const [manual, setManual] = useState(false),
    [code, setCode] = useState(""),
    [cameraError, setCameraError] = useState(""),
    [manualError, setManualError] = useState("");

  useEffect(() => {
    if (manual) return;
    let active = true;
    (async () => {
      try {
        const { BrowserQRCodeReader } = await import("@zxing/browser");
        if (!active) return;
        const reader = new BrowserQRCodeReader();
        controlsRef.current = await reader.decodeFromVideoDevice(
          undefined,
          videoRef.current!,
          (result) => {
            if (result && active) {
              controlsRef.current?.stop();
              onDetected(result.getText());
            }
          },
        );
      } catch {
        if (active) {
          setCameraError(
            "No pudimos acceder a la cámara. Ingresa el código manual.",
          );
          setManual(true);
        }
      }
    })();
    return () => {
      active = false;
      controlsRef.current?.stop();
    };
  }, [manual, onDetected]);

  function submit(e: FormEvent) {
    e.preventDefault();
    const trimmed = code.trim();
    if (trimmed.length < 10) {
      setManualError("Ingresa el código completo del QR del cliente.");
      return;
    }
    setManualError("");
    onDetected(trimmed);
  }

  return (
    <section>
      <div className="overflow-hidden rounded-3xl bg-slate-950">
        {!manual ? (
          <div className="relative aspect-square">
            <video
              ref={videoRef}
              muted
              playsInline
              className="h-full w-full object-cover"
            />
            <div className="pointer-events-none absolute inset-10 rounded-3xl border-4 border-cyan-400">
              <span className="absolute -left-1 -top-1 h-8 w-8 rounded-tl-2xl border-l-4 border-t-4 border-white" />
              <span className="absolute -bottom-1 -right-1 h-8 w-8 rounded-br-2xl border-b-4 border-r-4 border-white" />
            </div>
            <p className="absolute inset-x-0 bottom-5 text-center text-sm font-bold text-white">
              Apunta al QR del cliente
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="p-6">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-cyan-400 text-slate-950">
              <Keyboard />
            </span>
            <label className="mt-5 block text-center text-sm font-bold text-white">
              Código manual
              <input
                autoFocus
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.trim());
                  setManualError("");
                }}
                placeholder="Pega el código del QR"
                className="mt-3 w-full rounded-2xl bg-white p-4 text-center text-base font-black tracking-wide text-slate-950 outline-none"
              />
            </label>
            {cameraError && (
              <p className="mt-3 text-center text-sm text-violet-200">
                {cameraError}
              </p>
            )}
            {manualError && (
              <p className="mt-3 rounded-2xl bg-red-50 p-3 text-center text-sm font-semibold text-red-700">
                {manualError}
              </p>
            )}
            <button className="mt-4 w-full rounded-2xl bg-cyan-400 py-4 font-black text-slate-950">
              Buscar cliente
            </button>
          </form>
        )}
      </div>
      <button
        type="button"
        onClick={() => {
          setManual((v) => !v);
          setManualError("");
        }}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold text-slate-600"
      >
        {manual ? (
          <>
            <ScanLine size={18} /> Usar cámara
          </>
        ) : (
          <>
            <Keyboard size={18} /> Ingresar código manual
          </>
        )}
      </button>
    </section>
  );
}
