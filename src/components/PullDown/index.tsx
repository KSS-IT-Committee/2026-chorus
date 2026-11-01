import styles from "./index.module.css";

type PullDownProps = {
  label: string;
  value: string;
  options: readonly {
    value: string;
    label: string;
  }[];
  placeholder?: string;
  onChange: (value: string) => void;
};

export default function PullDown({
  label,
  value,
  options,
  placeholder = "選択してください",
  onChange,
}: PullDownProps) {
  return (
    <label className={styles.field}>
      <span className={styles.labelText}>{label}</span>
      <span className={styles.selectWrap}>
        <select
          required
          value={value}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">
            {placeholder}
          </option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </span>
    </label>
  );
}