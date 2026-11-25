import { useRef } from 'react';
import { TreasureSettingsFields } from './TreasureSettingsFields';

export function TreasureSettingsDialog() {
  const dialog = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button type="button" className="button" onClick={() => dialog.current?.showModal()}>
        ⚙ お宝設定
      </button>
      <dialog
        ref={dialog}
        className="treasure-dialog"
        aria-labelledby="treasure-title"
        onCancel={() => {
          if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) dialog.current?.close();
        }}
      >
        <div className="section-heading treasure-heading">
          <h2 id="treasure-title">お宝設定</h2>
          <button
            type="button"
            autoFocus
            aria-label="お宝設定を閉じる"
            onClick={() => dialog.current?.close()}
          >
            ×
          </button>
        </div>
        <TreasureSettingsFields />
      </dialog>
    </>
  );
}
