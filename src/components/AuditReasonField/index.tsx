"use client";

import { useId } from "react";
import styles from "./AuditReasonField.module.css";

export function AuditReasonField({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <>
      <label htmlFor={id}>理由</label>
      <textarea
        id={id}
        name="reason"
        className={styles.input}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={3}
        maxLength={500}
        required
        disabled={disabled}
      />
    </>
  );
}
