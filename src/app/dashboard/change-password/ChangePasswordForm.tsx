"use client";

import { useActionState } from "react";
import { changePasswordAction } from "./actions";
import styles from "@/app/login/page.module.css";

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState(changePasswordAction, {
    error: null,
  });
  return (
    <form action={action} className={styles.form}>
      <label htmlFor="currentPassword">現在のパスワード</label>
      <input
        id="currentPassword"
        name="currentPassword"
        type="password"
        autoComplete="current-password"
        required
      />
      <label htmlFor="newPassword">新しいパスワード</label>
      <input
        id="newPassword"
        name="newPassword"
        type="password"
        autoComplete="new-password"
        minLength={8}
        maxLength={1024}
        pattern={"[\\x21-\\x7E]+"}
        title="半角英数字と記号を入力してください。"
        aria-describedby="new-password-hint"
        required
      />
      <p id="new-password-hint">半角英数字と記号で8文字以上、1024文字以下</p>
      <label htmlFor="confirmation">新しいパスワード（確認）</label>
      <input
        id="confirmation"
        name="confirmation"
        type="password"
        autoComplete="new-password"
        minLength={8}
        maxLength={1024}
        pattern={"[\\x21-\\x7E]+"}
        title="半角英数字と記号を入力してください。"
        required
      />
      {state.error && (
        <p className={styles.error} role="alert">
          {state.error}
        </p>
      )}
      <button disabled={pending}>{pending ? "変更中…" : "変更する"}</button>
    </form>
  );
}
