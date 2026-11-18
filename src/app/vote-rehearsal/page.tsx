"use client";

import {
  Suspense,
  startTransition,
  useEffect,
  useMemo,
  useState,
  type SubmitEvent,
} from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import AbsenceSelector from "@/components/AbsenceSelector";
import InformationNote from "@/components/InformationNote";
import PullDown from "@/components/PullDown";
import StepHeading from "@/components/StepHeading";
import VoteConfirmation from "@/components/VoteConfirmation";
import VoteProgressBar from "@/components/VoteProgressBar";
import styles from "./page.module.css";
import { submitRehearsalVote } from "./actions";

const grades = ["1", "2", "3"] as const;
const classes = ["A", "B", "C", "D"] as const;
const parts = [
  { value: "Soprano", label: "ソプラノ" },
  { value: "Alto", label: "アルト" },
  { value: "Tenor", label: "テノール" },
  { value: "Bass", label: "バス" },
] as const;

type Grade = (typeof grades)[number];
type ClassName = (typeof classes)[number];
type Part = (typeof parts)[number]["value"];
type VotePageStep = "setup" | "voting" | "finished";
type VoteGroup = {
  grade: Grade;
  className: ClassName;
  part: Part;
};
type VoteProgressResponse = {
  registeredCount: number;
  votedCount: number;
  absentCount: number;
  students: {
    attendanceNumber: number;
    voted: boolean;
  }[];
};
type Vote = {
  requestId: string;
  attendanceNumber: number;
  choices: { grade: number; firstClass: ClassName; secondClass: ClassName }[];
};

function isVoteProgress(value: unknown): value is VoteProgressResponse {
  if (typeof value !== "object" || value === null) return false;
  return (
    "registeredCount" in value &&
    typeof value.registeredCount === "number" &&
    Number.isInteger(value.registeredCount) &&
    "votedCount" in value &&
    typeof value.votedCount === "number" &&
    Number.isInteger(value.votedCount) &&
    "absentCount" in value &&
    typeof value.absentCount === "number" &&
    Number.isInteger(value.absentCount) &&
    "students" in value &&
    Array.isArray(value.students) &&
    value.votedCount <= value.registeredCount &&
    value.absentCount === value.registeredCount - value.votedCount &&
    value.students.length === value.registeredCount &&
    value.students.every(
      (student) =>
        typeof student === "object" &&
        student !== null &&
        "attendanceNumber" in student &&
        typeof student.attendanceNumber === "number" &&
        Number.isInteger(student.attendanceNumber) &&
        "voted" in student &&
        typeof student.voted === "boolean",
    )
  );
}

export default function VoteRehearsalPage() {
  return (
    <Suspense fallback={<main className={styles.page} />}>
      <VoteRehearsalContent />
    </Suspense>
  );
}

function VoteRehearsalContent() {
  const searchParams = useSearchParams();
  const restoredGrade = grades.find(
    (item) => item === searchParams.get("grade"),
  );
  const restoredClass = classes.find(
    (item) => item === searchParams.get("className"),
  );
  const restoredPart = parts.find(
    (item) => item.value === searchParams.get("part"),
  );
  const restoredStep = searchParams.get("step");
  const hasRestoredConfig = Boolean(
    restoredGrade && restoredClass && restoredPart,
  );
  const [grade, setGrade] = useState<Grade | "">(restoredGrade ?? ""); // 学年
  const [className, setClassName] = useState<ClassName | "">(
    restoredClass ?? "",
  ); // クラス
  const [part, setPart] = useState<Part | "">(restoredPart?.value ?? ""); // パート
  const [absentAttendanceNumbers, setAbsentAttendanceNumbers] = useState(
    searchParams
      .getAll("absent")
      .filter((value) => /^[1-9]\d*$/.test(value))
      .map(Number),
  );
  const [step, setStep] = useState<VotePageStep>(
    hasRestoredConfig &&
      (restoredStep === "voting" || restoredStep === "finished")
      ? restoredStep
      : "setup",
  ); // 投票状態管理
  const [attendanceNumber, setAttendanceNumber] = useState(""); // 出席番号
  const [choice, setChoice] = useState<{
    firstClass?: ClassName | "";
    secondClass?: ClassName | "";
  }>({});
  const [pendingVote, setPendingVote] = useState<Vote | null>(null); // 投票内容の一時保存
  const [rosterProgress, setRosterProgress] = useState<
    (VoteProgressResponse & VoteGroup) | null
  >(null);
  const [rosterError, setRosterError] = useState<
    (VoteGroup & { message: string }) | null
  >(null);
  const [voteError, setVoteError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!grade || !className || !part) return;

    const controller = new AbortController();
    const query = new URLSearchParams({ grade, className, part });
    const group = { grade, className, part };

    async function loadRoster() {
      try {
        const response = await fetch(`/api/votes?${query}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const result: unknown = await response.json().catch(() => null);
        if (!response.ok || !isVoteProgress(result)) {
          throw new Error("投票状況を取得できませんでした。");
        }

        setRosterProgress({ ...result, ...group });
        setRosterError(null);
      } catch {
        if (!controller.signal.aborted) {
          setRosterError({
            ...group,
            message:
              "名簿の投票状況を取得できませんでした。再読み込みしてください。",
          });
        }
      }
    }

    void loadRoster();
    return () => controller.abort();
  }, [className, grade, part]);

  const currentRoster =
    rosterProgress &&
    grade &&
    className &&
    part &&
    rosterProgress.grade === grade &&
    rosterProgress.className === className &&
    rosterProgress.part === part
      ? rosterProgress
      : null;
  const votedCount = currentRoster?.votedCount ?? 0;
  const hasCurrentRoster = currentRoster !== null;
  const currentRosterError =
    rosterError?.grade === grade &&
    rosterError.className === className &&
    rosterError.part === part
      ? rosterError.message
      : null;
  const isLoadingRoster = Boolean(
    grade && className && part && !hasCurrentRoster && !currentRosterError,
  );

  const absentStudents = useMemo(
    () =>
      rosterProgress?.students.filter(
        (student) =>
          absentAttendanceNumbers.includes(student.attendanceNumber) &&
          !student.voted,
      ) ?? [],
    [absentAttendanceNumbers, rosterProgress],
  );
  const count = currentRoster
    ? currentRoster.registeredCount - absentStudents.length
    : 0;
  const maxAbsentCount = currentRoster
    ? currentRoster.registeredCount - Math.max(currentRoster.votedCount, 1)
    : 0;
  const validCount =
    currentRoster !== null &&
    count >= 1 &&
    count >= currentRoster.votedCount &&
    absentStudents.length <= maxAbsentCount;
  const hasInvalidResumedConfig =
    step !== "setup" && hasCurrentRoster && !validCount;
  const visibleStep = hasInvalidResumedConfig
    ? "setup"
    : step === "voting" &&
        currentRoster !== null &&
        currentRoster.votedCount >= count
      ? "finished"
      : step;

  useEffect(() => {
    const url = new URL(window.location.href);
    const values: Record<string, string> = {
      grade,
      className,
      part,
      step: visibleStep,
    };
    for (const [key, value] of Object.entries(values)) {
      if (value) url.searchParams.set(key, value);
      else url.searchParams.delete(key);
    }
    url.searchParams.delete("count");
    url.searchParams.delete("absent");
    if (hasCurrentRoster) {
      for (const student of absentStudents) {
        url.searchParams.append("absent", String(student.attendanceNumber));
      }
    }
    const updatedUrl = `${url.pathname}${url.search}${url.hash}`;
    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (currentUrl !== updatedUrl) {
      window.history.replaceState(null, "", updatedUrl);
    }
  }, [absentStudents, className, grade, hasCurrentRoster, part, visibleStep]);

  const canStart = Boolean(
    grade &&
    className &&
    part &&
    validCount &&
    !isLoadingRoster &&
    !currentRosterError,
  );
  const classOptions = classes.map((item) => ({
    value: item,
    label: `${item}組`,
  }));
  const attendanceNumberOptions =
    currentRoster?.students
      .filter(
        (student) =>
          !student.voted &&
          !absentAttendanceNumbers.includes(student.attendanceNumber),
      )
      .map((student) => ({
        value: String(student.attendanceNumber),
        label: `${student.attendanceNumber}番`,
      })) ?? [];
  const validAttendanceNumber = attendanceNumberOptions.some(
    (option) => option.value === attendanceNumber,
  );

  const options = classOptions.filter(({ value }) => value !== className);
  const { firstClass, secondClass } = choice;
  const validChoices = firstClass && secondClass && firstClass !== secondClass;

  function startVoting(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canStart) return;
    setStep(votedCount >= count ? "finished" : "voting");
  }

  function setVoteGroupValue<T extends Grade | ClassName | Part>(
    setter: (value: T | "") => void,
    value: T | "",
  ) {
    setter(value);
    setAbsentAttendanceNumbers([]);
    setAttendanceNumber("");
    setChoice({});
    setStep("setup");
  }

  function submitVote(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!grade || !validAttendanceNumber || !validChoices) return;

    setPendingVote({
      requestId: crypto.randomUUID(),
      attendanceNumber: Number(attendanceNumber),
      choices: [{ grade: Number(grade), firstClass, secondClass }],
    });
    setVoteError(null);
  }

  function confirmVote() {
    if (!pendingVote || !grade || !className || !part || isSubmitting) return;

    setIsSubmitting(true);
    setVoteError(null);
    startTransition(async () => {
      try {
        const result = await submitRehearsalVote({
          ...pendingVote,
          grade,
          className,
          part,
        });
        if (result.progress) {
          setRosterProgress({ ...result.progress, grade, className, part });
        }
        if (result.error) {
          setVoteError(result.error);
          return;
        }
        setAttendanceNumber("");
        setChoice({});
        setPendingVote(null);
      } catch {
        setVoteError("通信に失敗しました。もう一度送信してください。");
      } finally {
        setIsSubmitting(false);
      }
    });
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.card} aria-labelledby="page-title">
          <div className={styles.cardTop}>
            <h1 id="page-title" className={styles.title}>
              リハーサル用投票ページ
            </h1>
          </div>

          <div className={styles.cardBody}>
            {visibleStep === "setup" && (
              <StepHeading
                step="01"
                title="投票者情報を入力"
                description="学年・クラス・パートを選び、欠席者を選択してください。"
              />
            )}

            {visibleStep === "voting" && (
              <StepHeading
                step="02"
                title="投票内容を入力"
                description="送信後に取り消すことはできません。"
              />
            )}

            {visibleStep === "finished" && (
              <StepHeading
                step="03"
                title="投票が完了しました"
                description="ご協力ありがとうございました。"
              />
            )}

            {visibleStep === "setup" && (
              <form className={styles.form} onSubmit={startVoting}>
                <fieldset className={styles.fieldset}>
                  <legend className={styles.visuallyHidden}>投票者情報</legend>
                  <div className={styles.fieldGrid}>
                    <PullDown
                      label="学年"
                      value={grade}
                      options={grades.map((item) => ({
                        value: item,
                        label: `${item}年`,
                      }))}
                      onChange={(value) => setVoteGroupValue(setGrade, value)}
                    />
                    <PullDown
                      label="クラス"
                      value={className}
                      options={classOptions}
                      onChange={(value) =>
                        setVoteGroupValue(setClassName, value)
                      }
                    />
                    <PullDown
                      label="パート"
                      value={part}
                      options={parts}
                      onChange={(value) => setVoteGroupValue(setPart, value)}
                    />
                  </div>
                </fieldset>

                {grade &&
                  className &&
                  part &&
                  (isLoadingRoster ? (
                    <p>名簿を確認しています…</p>
                  ) : hasCurrentRoster && rosterProgress ? (
                    <AbsenceSelector
                      students={rosterProgress.students}
                      selectedAttendanceNumbers={absentAttendanceNumbers}
                      maxAbsentCount={maxAbsentCount}
                      onChange={(attendanceNumbers) => {
                        setAbsentAttendanceNumbers(attendanceNumbers);
                        setStep("setup");
                      }}
                    />
                  ) : (
                    <p>
                      {currentRosterError ?? "名簿の状況を確認できません。"}
                    </p>
                  ))}

                {grade && className && part && (
                  <InformationNote>
                    {isLoadingRoster
                      ? "名簿を確認しています…"
                      : hasCurrentRoster && rosterProgress
                        ? `名簿登録 ${rosterProgress.registeredCount}人・投票済み ${rosterProgress.votedCount}人・未投票 ${rosterProgress.absentCount}人`
                        : (currentRosterError ??
                          "名簿の状況を確認できません。")}
                    {hasCurrentRoster && rosterProgress && (
                      <>
                        <br />
                        {`今回の投票予定 ${count}人・欠席者 ${absentStudents.length}人`}
                      </>
                    )}
                  </InformationNote>
                )}
                {currentRosterError && <p role="alert">{currentRosterError}</p>}

                <button
                  className={styles.primaryButton}
                  type="submit"
                  disabled={!canStart}
                >
                  投票をはじめる
                  <span aria-hidden="true">→</span>
                </button>
              </form>
            )}

            {visibleStep === "voting" && grade && className && (
              <div className={styles.form}>
                <div className={styles.summary}>
                  <span className={styles.summaryLabel}>投票者</span>
                  <strong>
                    {grade}年{className}組・
                    {parts.find((item) => item.value === part)?.label}
                  </strong>
                  <span className={styles.summaryCount}>
                    全{count}人・欠席
                    {rosterProgress
                      ? rosterProgress.registeredCount - count
                      : 0}
                    人・未投票
                    {Math.max(count - votedCount, 0)}人
                  </span>
                </div>

                <VoteProgressBar completed={votedCount} total={count} />

                {currentRosterError && <p role="alert">{currentRosterError}</p>}

                <form className={styles.voteForm} onSubmit={submitVote}>
                  <PullDown
                    label="出席番号"
                    value={attendanceNumber}
                    options={attendanceNumberOptions}
                    placeholder="出席番号を選択してください"
                    onChange={(value) => {
                      setAttendanceNumber(value);
                      setChoice({});
                    }}
                  />

                  {validAttendanceNumber && (
                    <fieldset className={styles.ballot}>
                      <legend>{grade}年</legend>
                      <div className={styles.ballotFields}>
                        <PullDown
                          label="第1希望"
                          value={firstClass ?? ""}
                          options={options}
                          onChange={(value) =>
                            setChoice({
                              firstClass: value,
                              secondClass:
                                value === secondClass ? "" : secondClass,
                            })
                          }
                        />
                        <PullDown
                          label="第2希望"
                          value={secondClass ?? ""}
                          options={options.filter(
                            ({ value }) => value !== firstClass,
                          )}
                          onChange={(value) =>
                            setChoice({ firstClass, secondClass: value })
                          }
                        />
                      </div>
                    </fieldset>
                  )}

                  <InformationNote variant="warning">
                    この投票は取り消せません。
                    <br />
                    内容をよく確認してから送信してください。
                  </InformationNote>

                  <button
                    className={styles.primaryButton}
                    type="submit"
                    disabled={
                      !validCount ||
                      isLoadingRoster ||
                      Boolean(currentRosterError) ||
                      !validAttendanceNumber ||
                      !validChoices
                    }
                  >
                    この内容で投票する
                    <span aria-hidden="true">→</span>
                  </button>
                </form>
              </div>
            )}

            {visibleStep === "finished" && (
              <div className={styles.finished}>
                <p className={styles.finishedMessage}>
                  {grade}年{className}組・
                  {parts.find((item) => item.value === part)?.label}
                  <br />
                  <strong>{votedCount}</strong>人分の投票が完了しました。
                  {rosterProgress && (
                    <>
                      <br />
                      欠席 {rosterProgress.registeredCount - count}人
                    </>
                  )}
                </p>
                <Link className={styles.BackToTopButton} href="/">
                  Topページに戻る
                </Link>
              </div>
            )}
          </div>
        </section>
      </div>
      {pendingVote && grade && (
        <VoteConfirmation
          attendanceNumber={pendingVote.attendanceNumber}
          choices={pendingVote.choices}
          error={voteError}
          isSubmitting={isSubmitting}
          onCancel={() => {
            setPendingVote(null);
            setVoteError(null);
          }}
          onConfirm={confirmVote}
        />
      )}
    </main>
  );
}
