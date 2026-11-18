import Link from "next/link";

import styles from "./page.module.css";

// Only facts we know go here. Date, venue and programme are deliberately
// left out until the 合唱委員会 confirms them.
const LINKS = [
  {
    href: "/vote-rehearsal",
    title: "リハーサル投票",
    description: "リハーサル当日に使う投票ページです。",
  },
  {
    href: "/verify",
    title: "生徒情報",
    description: "登録されている生徒情報の確認ができます。ここに登録されていなかった場合、当日投票できません。委員にお問い合わせください。",
  },
] as const;

export default function Home() {
  return (
    <main className={styles.page}>
      <section className={styles.hero} aria-labelledby="top-title">
        <p className={styles.eyebrow}>東京都立小石川中等教育学校</p>
        <h1 id="top-title" className={styles.title}>
          合唱発表会
          <span className={styles.year}>2026</span>
        </h1>
        <p className={styles.lead}>
          1〜3年生の各クラスによる合唱の発表会です。
        </p>
      </section>

      <section className={styles.links} aria-label="ページ一覧">
        {LINKS.map((link) => (
          <Link key={link.href} href={link.href} className={styles.card}>
            <span className={styles.cardTitle}>
              {link.title}
              <span aria-hidden="true"> →</span>
            </span>
            <span className={styles.cardDescription}>{link.description}</span>
          </Link>
        ))}
      </section>
    </main>
  );
}
