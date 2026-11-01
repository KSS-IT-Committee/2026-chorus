import type { ReactNode } from "react";
import styles from "./index.module.css";

type InformationNoteProps = {
  children: ReactNode;
  variant?: "info" | "warning";
};

export default function InformationNote({
  children,
  variant = "info",
}: InformationNoteProps) {
  const className =
    variant === "warning"
      ? `${styles.note} ${styles.warning}`
      : styles.note;

  return (
    <div className={className} role="note">
      <span className={styles.icon} aria-hidden="true">
        {variant === "warning" ? "!" : "i"}
      </span>
      <p>{children}</p>
    </div>
  );
}
