"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createMemberAction } from "@/app/dashboard/members/actions";
import styles from "./CreateMemberButton.module.css";

export function CreateMemberButton() {
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
        アカウントを作成
      </button>
      <dialog
        ref={dialog}
        className={styles.dialog}
        aria-labelledby="create-member-title"
        onClose={() => setIsOpen(false)}
        onCancel={(event) => {
          if (dialog.current?.querySelector('button[type="submit"]:disabled')) {
            event.preventDefault();
          }
        }}
      >
        {isOpen && <CreateMemberForm close={() => dialog.current?.close()} />}
      </dialog>
    </>
  );
}

function CreateMemberForm({ close }: { close: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [permission, setPermission] = useState("member");
  const [state, action, pending] = useActionState(createMemberAction, {
    error: null,
    success: false,
  });

  useEffect(() => {
    if (state.success) close();
  }, [state.success, close]);

  return (
    <form action={action} className={styles.form}>
      <h2 id="create-member-title">アカウントを作成</h2>
      <label>本名などは用いないでください。"3C41"のような形式が推奨です</label>
      <label htmlFor="member-username">ユーザー名</label>
      <input
        id="member-username"
        name="username"
        value={username}
        onChange={(event) => setUsername(event.target.value)}
        autoComplete="off"
        maxLength={32}
        required
        autoFocus
      />
      <label htmlFor="member-password">初期パスワード</label>
      <input
        id="member-password"
        name="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        type="password"
        autoComplete="new-password"
        minLength={8}
        required
        aria-describedby="password-hint"
      />
      <p id="password-hint" className={styles.hint}>
        8文字以上、1024バイト以下
      </p>
      <label htmlFor="member-permission">権限</label>
      <select
        id="member-permission"
        name="permission"
        value={permission}
        onChange={(event) => setPermission(event.target.value)}
      >
        <option value="member">member</option>
        <option value="editor">editor</option>
        <option value="operator">operator</option>
        <option value="admin">admin</option>
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
