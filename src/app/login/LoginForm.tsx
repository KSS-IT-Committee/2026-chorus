"use client";

import { useActionState } from "react";
import { loginAction } from "./actions";
import styles from "./page.module.css";

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, { error: null });
  return (
    <form action={action} className={styles.form}>
      <label htmlFor="username">ユーザー名</label>
      <input
        id="username"
        name="username"
        autoComplete="username"
        maxLength={32}
        required
      />
      <label htmlFor="password">パスワード</label>
      <input
        id="password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
      />
      {state.error && (
        <p className={styles.error} role="alert">
          {state.error}
        </p>
      )}
      <button disabled={pending}>{pending ? "ログイン中…" : "ログイン"}</button>
    </form>
  );
}
