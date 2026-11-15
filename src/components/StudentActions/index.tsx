"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { PARTS } from "@/db/schema";
import { formatStudentId } from "@/lib/student-id";
import { updateStudentAction } from "@/app/dashboard/students/actions";
import dialogStyles from "@/components/CreateStudentButton/CreateStudentButton.module.css";
import styles from "./StudentActions.module.css";

type Props = { id: string; part: (typeof PARTS)[number] };

export function StudentActions({ id, part }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={styles.edit}
        aria-label={`${formatStudentId(id)}を編集`}
        onClick={() => {
          setIsOpen(true);
          dialog.current?.showModal();
        }}
      >
        <svg
          aria-hidden="true"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z" />
        </svg>
      </button>
      <dialog
        ref={dialog}
        className={dialogStyles.dialog}
        aria-label={`${formatStudentId(id)}の編集`}
        onClose={() => setIsOpen(false)}
        onCancel={(event) => {
          if (dialog.current?.querySelector('button[type="submit"]:disabled'))
            event.preventDefault();
        }}
      >
        {isOpen && (
          <StudentForm
            id={id}
            part={part}
            close={() => dialog.current?.close()}
          />
        )}
      </dialog>
    </>
  );
}

function StudentForm({ id, part, close }: Props & { close: () => void }) {
  const [state, action, pending] = useActionState(updateStudentAction, {
    error: null,
    success: false,
  });
  const [confirmDelete, setConfirmDelete] = useState(false);
  useEffect(() => {
    if (state.success) close();
  }, [state.success, close]);

  return (
    <form action={action} className={dialogStyles.form}>
      <h2>{formatStudentId(id)}</h2>
      <input type="hidden" name="id" value={id} />
      {confirmDelete ? (
        <p>この生徒を削除します。元に戻すことはできません。</p>
      ) : (
        <>
          <label htmlFor={`student-part-${id}`}>パート</label>
          <select
            id={`student-part-${id}`}
            name="part"
            defaultValue={part}
            autoFocus
          >
            {PARTS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </>
      )}
      {state.error && (
        <p className={dialogStyles.error} role="alert">
          {state.error}
        </p>
      )}
      <div className={dialogStyles.actions}>
        {confirmDelete ? (
          <>
            <button
              type="button"
              className={dialogStyles.cancel}
              onClick={() => setConfirmDelete(false)}
              disabled={pending}
            >
              戻る
            </button>
            <button
              type="submit"
              name="operation"
              value="delete"
              className={styles.danger}
              disabled={pending}
            >
              {pending ? "削除中…" : "削除する"}
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className={styles.delete}
              onClick={() => setConfirmDelete(true)}
              disabled={pending}
            >
              削除
            </button>
            <button
              type="button"
              className={dialogStyles.cancel}
              onClick={close}
              disabled={pending}
            >
              キャンセル
            </button>
            <button
              type="submit"
              name="operation"
              value="update"
              className={dialogStyles.submit}
              disabled={pending}
            >
              {pending ? "保存中…" : "保存"}
            </button>
          </>
        )}
      </div>
    </form>
  );
}
