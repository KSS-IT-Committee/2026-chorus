import styles from "./index.module.css";

type PullDownProps<T extends string> = {
  label: string;
  value: T | "";
  options: readonly {
    value: T;
    label: string;
  }[];
  placeholder?: string;
  onChange: (value: T | "") => void;
};

export default function PullDown<T extends string>({
  label,
  value,
  options,
  placeholder = "選択してください",
  onChange,
}: PullDownProps<T>) {
  return (
    <label className={styles.field}>
      <span className={styles.labelText}>{label}</span>
      <span className={styles.selectWrap}>
        <select
          required
          value={value}
          onChange={(event) => {
            const selectedValue = event.currentTarget.value;
            if (selectedValue === "") {
              onChange("");
              return;
            }

            const option = options.find(
              (candidate) => candidate.value === selectedValue,
            );
            if (option) onChange(option.value);
          }}
        >
          <option value="">{placeholder}</option>
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
