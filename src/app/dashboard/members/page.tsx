import styles from "./page.module.css";
import { AuthGuard } from "@/components/Authguard";
import { getCurrentUser } from "@/lib/session";
import { getMembers } from "@/db/getMembers";
import Link from "next/link";
import { CreateMemberButton } from "@/components/CreateMemberButton";

export const instant = false;

export default function MembersPage() {
  return (
    <main className={styles.main}>
      <AuthGuard minimumPermission="admin">
        <MembersContent />
      </AuthGuard>
    </main>
  );
}

async function MembersContent() {
  const members = await getMembers();
  const user = await getCurrentUser();
  if (!user) return null;
  return (
    <>

      <h1 className={styles.title}>委員アカウント管理</h1>


      <div className={styles.content}>
        <section className={styles.membersListContainer}>
          <div className={styles.titleContainer}>
            <h2 className={styles.subtitle}>委員アカウント一覧</h2>
            <CreateMemberButton />
          </div>
          {members.length ? (
            <ul className={styles.pageList}>
              {members.map((member) => (
                <li key={member.username} className={styles.pageListItem}>
                  <Link
                    href={
                      "/dashboard/members/" +
                      encodeURIComponent(member.username)
                    }
                    className={styles.pageLink}
                  >
                    <span className={styles.username}>{member.username}</span>
                    <span className={styles.permission}>
                      {member.permission}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.empty}>委員アカウントはありません。</p>
          )}
        </section >
        <aside className={styles.roles}>
          <h2 className={styles.subtitle}>権限について</h2>
          <dl className={styles.roleList}>
            <div>
              <dt>admin</dt>
              <dd>
                全ての操作が可能です。委員アカウントの作成・削除も可能です。
              </dd>
            </div>
            <div>
              <dt>operator</dt>
              <dd>editor の権限に加え、特定の投票の削除等が可能です。</dd>
            </div>
            <div>
              <dt>editor</dt>
              <dd>member の権限に加え、曲目登録、生徒名簿登録が可能です。</dd>
            </div>
            <div>
              <dt>member</dt>
              <dd>投票結果と操作履歴を閲覧できます。</dd>
            </div>
          </dl>
          <p className={styles.roleNote}>
            権限の変更とアカウントの作成・削除は、管理者のみが行えます。
          </p>
        </aside>
      </div >
    </>
  );
}
