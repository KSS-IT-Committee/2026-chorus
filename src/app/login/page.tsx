import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { LoginForm } from "./LoginForm";
import styles from "./page.module.css";

export const instant = false;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ passwordChanged?: string }>;
}) {
  if (await getCurrentUser()) redirect("/dashboard");
  const { passwordChanged } = await searchParams;
  return (
    <main className={styles.page}>
      <section className={styles.panel}>
        <h1>合唱委員ログイン</h1>
        {passwordChanged === "1" && (
          <p>
            パスワードを変更しました。新しいパスワードでログインしてください。
          </p>
        )}
        <LoginForm />
      </section>
    </main>
  );
}
