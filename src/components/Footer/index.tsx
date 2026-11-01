import styles from "./Footer.module.css";

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerTheme}>
        <span>合唱発表会2026</span>
      </div>
      <div>
        <span>© 2026 東京都立小石川中等教育学校</span>
        <span>合唱委員会・IT委員会</span>
      </div>
    </footer>
  );
}