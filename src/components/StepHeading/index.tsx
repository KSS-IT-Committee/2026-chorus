import styles from "./index.module.css";

type StepHeadingProps = {
  step: string;
  title: string;
  description: string;
};

export default function StepHeading({
  step,
  title,
  description,
}: StepHeadingProps) {
  return (
    <div className={styles.heading}>
      <span className={styles.stepNumber}>{step}</span>
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
    </div>
  );
}
