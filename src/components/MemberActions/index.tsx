"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { PERMISSION } from "@/db/schema";
import { updateMemberAction } from "@/app/dashboard/members/[username]/actions";
import styles from "./MemberActions.module.css";
import dialogStyles from "@/components/CreateMemberButton/CreateMemberButton.module.css";

type Operation = "password" | "permission" | "delete";

type Props = {
  username: string;
  permission: (typeof PERMISSION)[number];
};

export function MemberActions({ username, permission }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [operation, setOperation] = useState<Operation | null>(null);
  const [message, setMessage] = useState("");
  const router = useRouter();

  function open(next: Operation) {
    setMessage("");
    setOperation(next);
    dialog.current?.showModal();
  }

  return (
    <>
      <div className={styles.actions}>
        <button type="button" onClick={() => open("password")}>
          パスワードをリセット
        </button>
        <button type="button" onClick={() => open("permission")}>
          権限を変更
        </button>
        <button
          type="button"
          className={styles.danger}
          onClick={() => open("delete")}
        >
          アカウントを削除
        </button>
      </div>
      {message && (
        <p className={styles.status} role="status">
          {message}
        </p>
      )}
      <dialog
        ref={dialog}
        className={dialogStyles.dialog}
        aria-labelledby="member-action-title"
        onClose={() => setOperation(null)}
        onCancel={(event) => {
          if (dialog.current?.querySelector('button[type="submit"]:disabled'))
            event.preventDefault();
        }}
      >
        {operation && (
          <MemberActionForm
            username={username}
            permission={permission}
            operation={operation}
            close={() => dialog.current?.close()}
            complete={(text) => {
              setMessage(text);
              router.refresh();
            }}
          />
        )}
      </dialog>
    </>
  );
}

function MemberActionForm({
  username,
  permission,
  operation,
  close,
  complete,
}: Props & {
  operation: Operation;
  close: () => void;
  complete: (text: string) => void;
}) {
  const [state, action, pending] = useActionState(updateMemberAction, {
    error: null,
    success: false,
  });
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [selected, setSelected] = useState(permission);
  const titles = {
    password: "パスワードをリセット",
    permission: "権限を変更",
    delete: "アカウントを削除",
  };

  useEffect(() => {
    if (state.success) {
      close();
      complete(
        operation === "password"
          ? "パスワードをリセットしました。"
          : "権限を変更しました。",
      );
    }
  }, [state.success, close, complete, operation]);

  return (
    <form action={action} className={dialogStyles.form}>
      <h2 id="member-action-title">{titles[operation]}</h2>
      <p className={styles.target}>{username}</p>
      <input type="hidden" name="username" value={username} />
      <input type="hidden" name="operation" value={operation} />
      {operation === "password" && (
        <>
          <p className={styles.dialogText}>
            新しいパスワードを設定します。対象アカウントはログアウトされます。
          </p>
          <label htmlFor="reset-password">新しいパスワード</label>
          <input
            id="reset-password"
            name="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={8}
            maxLength={1024}
            pattern={"[\\x21-\\x7E]+"}
            title="半角英数字と記号を入力してください。"
            aria-describedby="reset-password-hint"
            required
            autoFocus
          />
          <p id="reset-password-hint" className={dialogStyles.hint}>
            半角英数字と記号、8文字以上1024文字以下
          </p>
          <label htmlFor="reset-confirmation">新しいパスワード（確認）</label>
          <input
            id="reset-confirmation"
            name="confirmation"
            type="password"
            autoComplete="new-password"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            minLength={8}
            maxLength={1024}
            pattern={"[\\x21-\\x7E]+"}
            title="半角英数字と記号を入力してください。"
            required
          />
        </>
      )}
      {operation === "permission" && (
        <>
          <label htmlFor="member-permission-change">新しい権限</label>
          <select
            id="member-permission-change"
            name="permission"
            value={selected}
            onChange={(event) =>
              setSelected(event.target.value as Props["permission"])
            }
            autoFocus
          >
            <option value="member">member</option>
            <option value="editor">editor</option>
            <option value="operator">operator</option>
            <option value="admin">admin</option>
          </select>
        </>
      )}
      {operation === "delete" && (
        <p className={styles.dialogText}>
          このアカウントを削除します。元に戻すことはできません。
        </p>
      )}
      {state.error && (
        <p className={dialogStyles.error} role="alert">
          {state.error}
        </p>
      )}
      <div className={dialogStyles.actions}>
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
          className={
            operation === "delete" ? styles.dangerSubmit : dialogStyles.submit
          }
          disabled={pending}
        >
          {pending
            ? "処理中…"
            : operation === "delete"
              ? "削除"
              : operation === "password"
                ? "リセット"
                : "変更"}
        </button>
      </div>
    </form>
  );
}
