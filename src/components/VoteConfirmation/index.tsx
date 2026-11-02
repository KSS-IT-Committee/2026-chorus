import styles from "./index.module.css";

type VoteConfirmationProps = {
  grade: string;
  attendanceNumber: number;
  targetClass: string;
  secondTargetClass: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function VoteConfirmation({
  grade,
  attendanceNumber,
  targetClass,
  secondTargetClass,
  onCancel,
  onConfirm,
}: VoteConfirmationProps) {
  return (
    <div className={styles.overlay}>
      <section
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-description"
      >
        <p className={styles.eyebrow}>最終確認</p>
        <h2 id="confirm-title" className={styles.title}>
          この内容で投票しますか？
        </h2>
        <p id="confirm-description" className={styles.description}>
          投票後は取り消すことができません。
        </p>
        <dl className={styles.summary}>
          <div>
            <dt>出席番号:</dt>
            <dd>{attendanceNumber}番</dd>
          </div>
          <div>
            <dt>1番に投票したいクラス:</dt>
            <dd>
              {grade}年{targetClass}組
            </dd>
          </div>
          <div>
            <dt>2番に投票したいクラス:</dt>
            <dd>
              {grade}年{secondTargetClass}組
            </dd>
          </div>
        </dl>
        <div className={styles.actions}>
          <button
            className={styles.cancel}
            type="button"
            onClick={onCancel}
          >
            戻って修正する
          </button>
          <button
            className={styles.confirm}
            type="button"
            autoFocus
            onClick={onConfirm}
          >
            投票を確定する
          </button>
        </div>
      </section>
    </div>
  );
}
