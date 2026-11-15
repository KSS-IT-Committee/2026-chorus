"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { changeVoteAction } from "@/app/dashboard/votes/students/actions";
import styles from "@/components/CreateStudentButton/CreateStudentButton.module.css";
import memberStyles from "@/components/MemberActions/MemberActions.module.css";
import buttonStyles from "./VoteActions.module.css";

type Props = {
  studentId: string;
  voteId: number;
  grade: number;
  invalid: boolean;
};

export function VoteActions({ studentId, voteId, grade, invalid }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className={buttonStyles.button}
        aria-label={`${grade}年への投票を操作`}
        onClick={() => {
          setOpen(true);
          dialog.current?.showModal();
        }}
      >
        操作
      </button>
      <dialog
        ref={dialog}
        className={styles.dialog}
        aria-labelledby={`vote-action-title-${grade}`}
        onClose={() => setOpen(false)}
        onCancel={(event) => {
          if (dialog.current?.querySelector('button[type="submit"]:disabled'))
            event.preventDefault();
        }}
      >
        {open && (
          <VoteForm
            studentId={studentId}
            voteId={voteId}
            grade={grade}
            invalid={invalid}
            close={() => dialog.current?.close()}
          />
        )}
      </dialog>
    </>
  );
}

function VoteForm({
  studentId,
  voteId,
  grade,
  invalid,
  close,
}: Props & { close: () => void }) {
  const [operation, setOperation] = useState<"delete" | "invalidate" | null>(
    null,
  );
  const [state, action, pending] = useActionState(changeVoteAction, {
    error: null,
    success: false,
  });
  useEffect(() => {
    if (state.success) close();
  }, [state.success, close]);
  return (
    <form action={action} className={styles.form}>
      <h2 id={`vote-action-title-${grade}`}>{grade}年への投票</h2>
      <input type="hidden" name="studentId" value={studentId} />
      <input type="hidden" name="voteId" value={voteId} />
      {operation ? (
        <>
          <p>
            {operation === "delete"
              ? "この投票を削除します。元に戻すことはできません。"
              : "この投票を無効票にします。"}
          </p>
          <input type="hidden" name="operation" value={operation} />
        </>
      ) : (
        <p>操作を選択してください。</p>
      )}
      {state.error && (
        <p className={styles.error} role="alert">
          {state.error}
        </p>
      )}
      <div className={`${styles.actions} ${buttonStyles.actions}`}>
        {operation ? (
          <>
            <button
              type="button"
              className={styles.cancel}
              onClick={() => setOperation(null)}
              disabled={pending}
            >
              戻る
            </button>
            <button
              type="submit"
              className={memberStyles.dangerSubmit}
              disabled={pending}
            >
              {pending
                ? "処理中…"
                : operation === "delete"
                  ? "削除する"
                  : "無効票にする"}
            </button>
          </>
        ) : (
          <>
            <button type="button" className={styles.cancel} onClick={close}>
              閉じる
            </button>
            {!invalid && (
              <button
                type="button"
                className={styles.cancel}
                onClick={() => setOperation("invalidate")}
              >
                無効票にする
              </button>
            )}
            <button
              type="button"
              className={memberStyles.dangerSubmit}
              onClick={() => setOperation("delete")}
            >
              削除
            </button>
          </>
        )}
      </div>
    </form>
  );
}
