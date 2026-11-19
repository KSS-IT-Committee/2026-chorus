import styles from "./index.module.css";

type AbsenceCandidate = {
  attendanceNumber: number;
  voted: boolean;
};

type AbsenceSelectorProps = {
  students: readonly AbsenceCandidate[];
  selectedAttendanceNumbers: readonly number[];
  maxAbsentCount: number;
  onChange: (attendanceNumbers: number[]) => void;
};

export default function AbsenceSelector({
  students,
  selectedAttendanceNumbers,
  maxAbsentCount,
  onChange,
}: AbsenceSelectorProps) {
  const selectedAbsentSet = new Set(selectedAttendanceNumbers);
  const absentStudents = students.filter(
    (student) =>
      selectedAbsentSet.has(student.attendanceNumber) && !student.voted,
  );

  return (
    <fieldset className={styles.absentPicker}>
      <legend className={styles.labelText}>欠席者</legend>
      <p className={styles.fieldHint}>
        欠席者を選択してください。選択した人を除いた人数で投票を開始します。
      </p>
      {students.length > 0 ? (
        <div className={styles.absentOptions}>
          {students.map((student) => {
            const isSelected = selectedAbsentSet.has(student.attendanceNumber);
            const isAtLimit = absentStudents.length >= maxAbsentCount;
            return (
              <label
                key={student.attendanceNumber}
                className={
                  student.voted
                    ? `${styles.absentOption} ${styles.disabledOption}`
                    : styles.absentOption
                }
              >
                <input
                  type="checkbox"
                  checked={isSelected && !student.voted}
                  disabled={student.voted || (!isSelected && isAtLimit)}
                  onChange={(event) => {
                    if (event.target.checked) {
                      onChange([
                        ...absentStudents.map(
                          (candidate) => candidate.attendanceNumber,
                        ),
                        student.attendanceNumber,
                      ]);
                    } else {
                      onChange(
                        selectedAttendanceNumbers.filter(
                          (number) => number !== student.attendanceNumber,
                        ),
                      );
                    }
                  }}
                />
                <span>{student.attendanceNumber}番</span>
                {student.voted && (
                  <span className={styles.votedLabel}>投票済み</span>
                )}
              </label>
            );
          })}
        </div>
      ) : (
        <p className={styles.fieldHint}>このパートの名簿登録者はいません。</p>
      )}
      <p className={styles.fieldHint}>
        欠席 {absentStudents.length}人・投票予定{" "}
        {students.length - absentStudents.length}人
      </p>
    </fieldset>
  );
}
