import { getCurrentUser } from "@/lib/session";
import { logoutAction } from "@/app/login/actions";
import { AuthGuard } from "@/components/Authguard";
import loginStyles from "@/app/login/page.module.css";
import styles from "./page.module.css";

export const instant = false;

export default function DashboardPage() {
  return (
    <main className={styles.main}>
      <AuthGuard>
        <DashboardContent />
      </AuthGuard>
    </main>
  );
}

async function DashboardContent() {
  const user = await getCurrentUser();
  if (!user) return null;
  return (
    <>
      <h1>Dashboard</h1>
      <p>{user.username}</p>
      <form className={loginStyles.form} action={logoutAction}>
        <button>ログアウト</button>
      </form>
    </>
  );
}
