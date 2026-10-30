import { useRef } from 'react';
import { AssetImage } from './AssetImage';
export function IconBadge({
  imageKey,
  label,
  showLabel = true,
}: {
  imageKey: string | null;
  label: string;
  showLabel?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  return (
    <span className="icon-with-label">
      <button
        className="icon-badge"
        aria-label={label}
        title={label}
        onClick={() => dialog.current?.showModal()}
      >
        <AssetImage imageKey={imageKey} name={label} />
      </button>
      {showLabel && <span>{label}</span>}
      <dialog
        ref={dialog}
        aria-label={label}
        onClick={(e) => {
          if (e.target === e.currentTarget) dialog.current?.close();
        }}
      >
        <h2>{label}</h2>
        <button autoFocus onClick={() => dialog.current?.close()}>
          閉じる
        </button>
      </dialog>
    </span>
  );
}
