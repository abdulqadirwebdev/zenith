import { useEffect, useRef, type ReactNode } from "react";
import { motion } from "motion/react";
import { X, Orbit } from "lucide-react";
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    const previous = document.activeElement as HTMLElement;
    d?.showModal();
    return () => {
      d?.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      aria-label={title}
      ref={ref}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", damping: 28, stiffness: 320 }}
        className="modal-inner"
      >
        <header className="row between">
          <h2>{title}</h2>
          <button className="icon" aria-label="Close dialog" onClick={onClose}>
            <X size={20} />
          </button>
        </header>
        {children}
      </motion.div>
    </dialog>
  );
}
export function Empty({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <Orbit size={36} />
      <h3>{title}</h3>
      <p>{body}</p>
      {children}
    </div>
  );
}
export function PageHeading({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <header className="page-heading">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="row wrap">{children}</div>
    </header>
  );
}
export function Ring({
  progress,
  size = 180,
  children,
}: {
  progress: number;
  size?: number;
  children: ReactNode;
}) {
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg viewBox="0 0 200 200" aria-hidden="true">
        <circle className="ring-track" cx="100" cy="100" r="90" />
        <circle
          className="ring-value"
          cx="100"
          cy="100"
          r="90"
          strokeDasharray={565.49}
          strokeDashoffset={565.49 * (1 - Math.max(0, Math.min(1, progress)))}
        />
      </svg>
      <div className="ring-content">{children}</div>
    </div>
  );
}
export function Tabs({
  values,
  value,
  onChange,
}: {
  values: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="tabs" role="group">
      {values.map((v) => (
        <button
          key={v}
          className={value === v ? "selected" : ""}
          onClick={() => onChange(v)}
        >
          {v}
        </button>
      ))}
    </div>
  );
}
