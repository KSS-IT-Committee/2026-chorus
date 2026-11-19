"use client";

import { useState } from "react";
import PullDown from "@/components/PullDown";
import styles from "./page.module.css";

export default function Selectors({
  grades,
  classes,
  initialGrade,
  initialClass,
}: {
  grades: readonly number[];
  classes: readonly string[];
  initialGrade: string;
  initialClass: string;
}) {
  const [grade, setGrade] = useState(initialGrade);
  const [className, setClassName] = useState(initialClass);

  return (
    <form className={styles.selectContainer} action="/verify" method="get">
      <input type="hidden" name="grade" value={grade} />
      <input type="hidden" name="class" value={className} />
      <PullDown
        label="学年"
        value={grade}
        options={grades.map((item) => ({
          value: String(item),
          label: `${item}年`,
        }))}
        onChange={setGrade}
      />
      <PullDown
        label="クラス"
        value={className}
        options={classes.map((item) => ({ value: item, label: `${item}組` }))}
        onChange={setClassName}
      />
      <button className={styles.button} type="submit">
        OK
      </button>
    </form>
  );
}
