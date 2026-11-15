"use client";

import { useActionState, useRef, useState } from "react";
import { AuditReasonField } from "@/components/AuditReasonField";
import { addManualVoteAction } from "@/app/dashboard/votes/manual/actions";
import { CLASS_LETTERS, GRADES } from "@/lib/class-name";
import styles from "@/components/CreateStudentButton/CreateStudentButton.module.css";

export function AddManualVoteButton() {
  const dialog = useRef<HTMLDialogElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className={styles.createButton}
        onClick={() => {
          setIsOpen(true);
          dialog.current?.showModal();
        }}
      >
        投票を追加
      </button>
      <dialog
        ref={dialog}
        className={styles.dialog}
        aria-labelledby="add-manual-vote-title"
        onClose={() => setIsOpen(false)}
        onCancel={(event) => {
          if (dialog.current?.querySelector('button[type="submit"]:disabled'))
            event.preventDefault();
        }}
      >
        {isOpen && <VoteForm close={() => dialog.current?.close()} />}
      </dialog>
    </>
  );
}

function VoteForm({ close }: { close: () => void }) {
  const [formVersion, setFormVersion] = useState(0);
  const [reason, setReason] = useState("");
  const [grade, setGrade] = useState("");
  const [first, setFirst] = useState("");
  const [second, setSecond] = useState("");
  const [state, action, pending] = useActionState(
    async (
      previous: { error: string | null; success: boolean },
      data: FormData,
    ) => {
      const result = await addManualVoteAction(previous, data);
      if (result.success) {
        setGrade("");
        setFirst("");
        setSecond("");
        setReason("");
      }
      setFormVersion((version) => version + 1);
      return result;
    },
    { error: null, success: false },
  );
  return (
    <form key={formVersion} action={action} className={styles.form}>
      <h2 id="add-manual-vote-title">投票を追加</h2>
      <p className={styles.hint}>
        生徒に紐づけずに追加します。同じ生徒の重複投票は確認できません。
      </p>
      <label htmlFor="manual-grade">投票先の学年</label>
      <select
        id="manual-grade"
        name="grade"
        value={grade}
        onChange={(event) => setGrade(event.target.value)}
        required
      >
        <option value="" disabled>
          選択してください
        </option>
        {GRADES.map((grade) => (
          <option key={grade} value={grade}>
            {grade}年
          </option>
        ))}
      </select>
      <label htmlFor="manual-first">第一希望</label>
      <select
        id="manual-first"
        name="firstClass"
        value={first}
        onChange={(event) => setFirst(event.target.value)}
        required
      >
        <option value="" disabled>
          選択してください
        </option>
        {CLASS_LETTERS.map((letter) => (
          <option key={letter} value={letter}>
            {letter}組
          </option>
        ))}
      </select>
      <label htmlFor="manual-second">第二希望</label>
      <select
        id="manual-second"
        name="secondClass"
        value={second}
        onChange={(event) => setSecond(event.target.value)}
        required
      >
        <option value="" disabled>
          選択してください
        </option>
        {CLASS_LETTERS.map((letter) => (
          <option key={letter} value={letter}>
            {letter}組
          </option>
        ))}
      </select>
      <AuditReasonField
        value={reason}
        onChange={setReason}
        disabled={pending}
      />
      {state.error && (
        <p className={styles.error} role="alert">
          {state.error}
        </p>
      )}
      {state.success && <p role="status">投票を追加しました。</p>}
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.cancel}
          onClick={close}
          disabled={pending}
        >
          閉じる
        </button>
        <button type="submit" className={styles.submit} disabled={pending}>
          {pending ? "追加中…" : "追加"}
        </button>
      </div>
    </form>
  );
}
