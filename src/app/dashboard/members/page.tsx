import styles from "./page.module.css";
import { AuthGuard } from "@/components/Authguard";
import { getCurrentUser } from "@/lib/session";

export const instant = false;

export default function MembersPage() {
  return (
    <main className={styles.main}>
      <AuthGuard>
        <MembersContent />
      </AuthGuard>
    </main>
  );
}

async function MembersContent() {
  const user = await getCurrentUser();
  if (!user) return null;
  return (
    <>
      <h1 className={styles.title}>委員アカウント管理</h1>
      <p>このページでは、委員アカウントの管理を行うことができます。</p>
      <br />
      <h2 className={styles.subtitle}>権限について</h2>
      <p>委員アカウントには以下の権限があります。</p>
      <ul>
        <li>
          <strong>admin</strong>：全ての操作が可能です。委員アカウントの作成・削除も可能です。
        </li>
        <li>
          <strong>operator</strong>：editorの権限に加え、特定の投票の削除等が可能です。
        </li>
        <li>
          <strong>editor</strong>：memberの権限に加え、曲目登録、生徒名簿登録が可能です。
        </li>
        <li>
          <strong>member</strong>：投票結果の閲覧、操作履歴の閲覧が可能です。
        </li>
      </ul>
      <br />
      <p>権限の変更は、管理者(admin)のみが行うことができます。</p>
      <br />
      <p>委員アカウントの作成・削除は、管理者(admin)のみが行うことができます。</p>
    </>
  );
}
