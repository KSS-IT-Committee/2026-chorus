import Link from "next/link";
import { unauthorized } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import styles from "@/app/login/page.module.css";
import navigationStyles from "../students/page.module.css";
import { ChangePasswordForm } from "./ChangePasswordForm";

export const instant = false;

export default async function ChangePasswordPage() {
  if (!(await getCurrentUser())) unauthorized();
  return (
    <main className={styles.page}>
      <Link href="/dashboard" className={navigationStyles.back}>
        ← 合唱委員ページ
      </Link>
      <section className={styles.panel}>
        <h1>パスワード変更</h1>
        <p>パスワードを忘れてしまった場合、admin権限を持つメンバーにリセットを依頼してください。</p>
        <ChangePasswordForm />
      </section>
    </main>
  );
}
