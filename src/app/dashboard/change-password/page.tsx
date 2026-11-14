import Link from "next/link";
import { unauthorized } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import styles from "@/app/login/page.module.css";
import { ChangePasswordForm } from "./ChangePasswordForm";

export const instant = false;

export default async function ChangePasswordPage() {
  if (!(await getCurrentUser())) unauthorized();
  return (
    <main className={styles.page}>
      <section className={styles.panel}>
        <h1>パスワード変更</h1>
        <ChangePasswordForm />
        <Link href="/dashboard">ダッシュボードに戻る</Link>
      </section>
    </main>
  );
}
