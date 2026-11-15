import { PARTS } from "@/db/schema";
import { isClassLetter, isGrade } from "@/lib/class-name";

export function parseStudentCsv(text: string) {
  const rows: { values: string[]; line: number }[] = [];
  let line = 1;
  let rowLine = 1;
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let closed = false;
  const input = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (quoted) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
          closed = true;
        }
      } else {
        if (char === "\n" || (char === "\r" && input[i + 1] !== "\n")) line++;
        field += char;
      }
    } else if (char === '"' && !field && !closed) {
      quoted = true;
    } else if (char === "," || char === "\n" || char === "\r") {
      row.push(field.trim());
      field = "";
      closed = false;
      if (char !== ",") {
        if (char === "\r" && input[i + 1] === "\n") i++;
        if (row.some(Boolean)) rows.push({ values: row, line: rowLine });
        row = [];
        line++;
        rowLine = line;
      }
    } else {
      if (closed || char === '"')
        throw new Error("CSVの引用符が正しくありません。");
      field += char;
    }
  }
  if (quoted) throw new Error("CSVの引用符が正しくありません。");
  row.push(field.trim());
  if (row.some(Boolean)) rows.push({ values: row, line: rowLine });
  if (rows.shift()?.values.join(",") !== "grade,class,attendanceNumber,part") {
    throw new Error("CSVの見出しを確認してください。");
  }
  if (!rows.length) throw new Error("生徒のデータがありません。");
  if (rows.length > 480) throw new Error("一度に登録できるのは480人までです。");
  const ids = new Set<string>();
  return rows.map(({ values, line }) => {
    const [gradeText, classLetter, numberText, partText] = values;
    const grade = /^[1-3]$/.test(gradeText ?? "") ? Number(gradeText) : 0;
    const number = /^[0-9]+$/.test(numberText ?? "") ? Number(numberText) : 0;
    const part = PARTS.find((value) => value === partText);
    if (
      values.length !== 4 ||
      !isGrade(grade) ||
      !isClassLetter(classLetter) ||
      !Number.isInteger(number) ||
      number < 1 ||
      number > 40 ||
      !part
    ) {
      throw new Error(
        `${line}行目の学年、クラス、出席番号またはパートを確認してください。`,
      );
    }
    const id = `${grade}${classLetter}${number}`;
    if (ids.has(id))
      throw new Error(`${line}行目の生徒がCSV内で重複しています。`);
    ids.add(id);
    return {
      id,
      grade,
      class: classLetter,
      attendanceNumber: number,
      part,
    };
  });
}
