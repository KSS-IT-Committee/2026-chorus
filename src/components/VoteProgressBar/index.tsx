import styles from "./index.module.css";

type VoteProgressBarProps = {
  completed: number;
  total: number;
};

export default function VoteProgressBar({
  completed,
  total,
}: VoteProgressBarProps) {
  const currentVoter = completed + 1;
  const progress =
    total > 1 ? (completed / (total - 1)) * 100 : 0;

  return (
    <section className={styles.section} aria-label="投票の進み具合">
      <div className={styles.text}>
        <span>投票の進み具合</span>
        <strong>
          {currentVoter}
          <span> / {total}人</span>
        </strong>
      </div>
      <div
        className={styles.track}
        role="progressbar"
        aria-label="投票の進み具合"
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={currentVoter}
        aria-valuetext={`${currentVoter}人目に投票中、全${total}人中${completed}人投票済み`}
      >
        <span
          className={styles.bar}
          style={{ width: `${progress}%` }}
        />
        <span className={styles.markers} aria-hidden="true">
          {Array.from({ length: total }, (_, index) => (
            <span
              key={index}
              className={`${styles.dot} ${
                index < completed
                  ? styles.completedDot
                  : index === completed
                    ? styles.currentDot
                    : ""
              }`}
            />
          ))}
        </span>
      </div>
    </section>
  );
}
