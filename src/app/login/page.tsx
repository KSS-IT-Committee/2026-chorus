import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { LoginForm } from "./LoginForm";
import styles from "./page.module.css";

export const instant = false;

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/dashboard");
  return (
    <main className={styles.page}>
      <section className={styles.panel}>
        <h1>合唱委員ログイン</h1>
        <LoginForm />
      </section>
    </main>
  );
}
