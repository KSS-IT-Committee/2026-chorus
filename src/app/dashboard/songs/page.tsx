import Link from "next/link";
import styles from "./page.module.css";

import { AuthGuard } from "@/components/Authguard";

export const instant = false;

export default function VoteResultsPage() {
  return (
    <main className={styles.main}>
      <AuthGuard minimumPermission="member">
        <SongContent />
      </AuthGuard>
    </main>
  );
}

async function SongContent() {
  return (
    <>
      <h1 className={styles.title}>合唱曲編集</h1>
      <h2>製作中です。</h2>
    </>
  )
}