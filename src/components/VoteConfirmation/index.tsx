import { useEffect, useRef, type KeyboardEvent } from "react";
import styles from "./index.module.css";

type VoteConfirmationProps = {
  grade: string;
  attendanceNumber: number;
  targetClass: string;
  secondTargetClass: string;
  onCancel: () => void;
  onConfirm: () => void;
  isSubmitting?: boolean;
};

export default function VoteConfirmation({
  grade,
  attendanceNumber,
  targetClass,
  secondTargetClass,
  onCancel,
  onConfirm,
  isSubmitting = false,
}: VoteConfirmationProps) {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previousActiveElement = document.activeElement;
    cancelButtonRef.current?.focus();

    return () => {
      if (
        previousActiveElement instanceof HTMLElement &&
        previousActiveElement.isConnected
      ) {
        previousActiveElement.focus();
      }
    };
  }, []);

  function handleDialogKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      if (!isSubmitting) onCancel();
      return;
    }

    if (event.key !== "Tab") return;

    const focusableElements = event.currentTarget.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (!firstElement || !lastElement) {
      event.preventDefault();
    } else if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  }

  return (
    <div className={styles.overlay}>
      <section
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-description"
        onKeyDown={handleDialogKeyDown}
      >
        <p className={styles.eyebrow}>最終確認</p>
        <h2 id="confirm-title" className={styles.title}>
          この内容で投票しますか？
        </h2>
        <p id="confirm-description" className={styles.description}>
          投票後は取り消すことができません。
        </p>
        <dl className={styles.summary}>
          <div>
            <dt>出席番号:</dt>
            <dd>{attendanceNumber}番</dd>
          </div>
          <div>
            <dt>1番に投票したいクラス:</dt>
            <dd>
              {grade}年{targetClass}組
            </dd>
          </div>
          <div>
            <dt>2番に投票したいクラス:</dt>
            <dd>
              {grade}年{secondTargetClass}組
            </dd>
          </div>
        </dl>
        <div className={styles.actions}>
          <button
            className={styles.cancel}
            type="button"
            ref={cancelButtonRef}
            onClick={onCancel}
            disabled={isSubmitting}
          >
            戻って修正する
          </button>
          <button
            className={styles.confirm}
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            aria-busy={isSubmitting}
          >
            {isSubmitting ? "送信中…" : "投票を確定する"}
          </button>
        </div>
      </section>
    </div>
  );
}
