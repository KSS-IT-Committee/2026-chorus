"use client";

import { useActionState, useRef, useState } from "react";
import {
  importStudentsAction,
  type ImportStudentsState,
} from "@/app/dashboard/students/actions";
import importStyles from "./ImportStudentsButton.module.css";
import styles from "@/components/CreateStudentButton/CreateStudentButton.module.css";

export function ImportStudentsButton() {
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
        CSVをインポート
      </button>
      <dialog
        ref={dialog}
        className={styles.dialog}
        aria-labelledby="import-students-title"
        onClose={() => setIsOpen(false)}
        onCancel={(event) => {
          if (dialog.current?.querySelector('button[type="submit"]:disabled'))
            event.preventDefault();
        }}
      >
        {isOpen && <ImportForm close={() => dialog.current?.close()} />}
      </dialog>
    </>
  );
}

function ImportForm({ close }: { close: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [state, action, pending] = useActionState(
    async (previous: ImportStudentsState, data: FormData) => {
      if (file) data.set("file", file);
      const result = await importStudentsAction(previous, data);
      setPreviewFile(
        data.get("intent") === "preview" && result.token ? file : null,
      );
      return result;
    },
    {
      error: null,
      success: false,
      count: 0,
      newCount: 0,
      updates: [],
      token: "",
    },
  );
  const preview = Boolean(file && previewFile === file && state.token);
  return (
    <form action={action} className={styles.form}>
      <h2 id="import-students-title">CSVをインポート</h2>
      {preview ? (
        <>
          <p>{state.newCount}人を新規登録します。</p>
          {state.updates.length > 0 ? (
            <>
              <p>{state.updates.length}人のパートを更新します。</p>
              <ul className={importStyles.updates}>
                {state.updates.map((student) => (
                  <li key={student.id}>
                    <span>{student.id}</span>
                    <span>
                      {student.currentPart} → {student.part}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p>更新される生徒はいません。</p>
          )}
          <input type="hidden" name="token" value={state.token} />
        </>
      ) : (
        <>
          <p className={styles.hint}>
            UTF-8形式。学年、クラス、出席番号、パートを入力してください。出席番号は1〜40、パートは
            Soprano・Alto・Tenor・Bass のいずれかです。クラスは大文字で入力してください。
          </p>
          <a
            href="data:text/csv;charset=utf-8,grade%2Cclass%2CattendanceNumber%2Cpart%0A"
            download="students-template.csv"
            className={styles.hint}
            style={{ textDecoration: "underline" }}
          >
            CSVのテンプレートをダウンロード
          </a>
          <label htmlFor="students-csv">CSVファイル</label>
          <input
            id="students-csv"
            name="file"
            type="file"
            accept=".csv,text/csv"
            required
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </>
      )}
      {state.error && (
        <p className={styles.error} role="alert">
          {state.error}
        </p>
      )}
      {state.success && (
        <p role="status">{state.count}人を登録・更新しました。</p>
      )}
      <div className={styles.actions}>
        {preview ? (
          <>
            <button
              type="button"
              className={styles.cancel}
              onClick={() => {
                setFile(null);
                setPreviewFile(null);
              }}
              disabled={pending}
            >
              戻る
            </button>
            <button
              type="submit"
              name="intent"
              value="import"
              className={styles.submit}
              disabled={pending}
            >
              {pending ? "登録中…" : "登録・更新"}
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className={styles.cancel}
              onClick={close}
              disabled={pending}
            >
              閉じる
            </button>
            <button
              type="submit"
              name="intent"
              value="preview"
              className={styles.submit}
              disabled={pending}
            >
              {pending ? "確認中…" : "内容を確認"}
            </button>
          </>
        )}
      </div>
    </form>
  );
}
