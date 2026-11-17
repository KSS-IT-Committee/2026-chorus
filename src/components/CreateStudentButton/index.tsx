"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { PARTS } from "@/db/schema";
import { createStudentAction } from "@/app/dashboard/students/actions";

import styles from "./CreateStudentButton.module.css";

export function CreateStudentButton({
  grade,
  class: className,
}: {
  grade: string;
  class: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  function openDialog() {
    setIsOpen(true);
    dialog.current?.showModal();
  }

  return (
    <>
      <button
        type="button"
        className={styles.createButton}
        onClick={openDialog}
      >
        生徒を登録
      </button>
      <dialog
        ref={dialog}
        className={styles.dialog}
        aria-labelledby="create-student-title"
        onClose={() => setIsOpen(false)}
        onCancel={(event) => {
          if (dialog.current?.querySelector('button[type="submit"]:disabled')) {
            event.preventDefault();
          }
        }}
      >
        {isOpen && (
          <CreateStudentForm
            close={() => dialog.current?.close()}
            grade={grade}
            className={className}
          />
        )}
      </dialog>
    </>
  );
}

function CreateStudentForm({
  close,
  grade,
  className,
}: {
  close: () => void;
  grade: string;
  className: string;
}) {
  const [attendanceNumber, setAttendanceNumber] = useState("");
  const [part, setPart] = useState("Soprano");
  const [state, action, pending] = useActionState(createStudentAction, {
    error: null,
    success: false,
  });

  useEffect(() => {
    if (state.success) close();
  }, [state.success, close]);

  return (
    <form action={action} className={styles.form}>
      <h2 id="create-student-title">生徒を登録</h2>
      <p>
        {grade}年{className}組
      </p>
      <input type="hidden" name="grade" value={grade} />
      <input type="hidden" name="class" value={className} />
      <label htmlFor="student-attendance-number">出席番号</label>
      <input
        id="student-attendance-number"
        name="attendanceNumber"
        type="number"
        min="1"
        max="40"
        step="1"
        value={attendanceNumber}
        onChange={(event) => setAttendanceNumber(event.target.value)}
        required
      />
      <label htmlFor="student-part">所属パート</label>
      <select
        id="student-part"
        name="part"
        value={part}
        onChange={(event) => setPart(event.target.value)}
      >
        {PARTS.map((part) => (
          <option key={part} value={part}>
            {part}
          </option>
        ))}
      </select>

      {state.error && (
        <p className={styles.error} role="alert">
          {state.error}
        </p>
      )}
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.cancel}
          onClick={close}
          disabled={pending}
        >
          キャンセル
        </button>
        <button type="submit" className={styles.submit} disabled={pending}>
          {pending ? "作成中…" : "作成"}
        </button>
      </div>
    </form>
  );
}
