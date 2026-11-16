"use client";

import { Suspense, useEffect, useState, type SubmitEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import InformationNote from "@/components/InformationNote";
import PullDown from "@/components/PullDown";
import StepHeading from "@/components/StepHeading";
import VoteConfirmation from "@/components/VoteConfirmation";
import VoteProgressBar from "@/components/VoteProgressBar";
import styles from "./page.module.css";

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
};
type Vote = {
  requestId: string;
  attendanceNumber: number;
  targetClass: ClassName;
  secondTargetClass: ClassName;
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
    value.votedCount <= value.registeredCount &&
    value.absentCount === value.registeredCount - value.votedCount
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
  const restoredCount = searchParams.get("count") ?? "";
  const restoredStep = searchParams.get("step");
  const validRestoredCount =
    /^[1-9]\d*$/.test(restoredCount) && Number(restoredCount) <= 40;
  const hasRestoredConfig = Boolean(
    restoredGrade && restoredClass && restoredPart && validRestoredCount,
  );
  const [grade, setGrade] = useState<Grade | "">(restoredGrade ?? ""); // 学年
  const [className, setClassName] = useState<ClassName | "">(
    restoredClass ?? "",
  ); // クラス
  const [part, setPart] = useState<Part | "">(restoredPart?.value ?? ""); // パート
  const [memberCount, setMemberCount] = useState(
    hasRestoredConfig ? restoredCount : "",
  ); // 人数
  const [step, setStep] = useState<VotePageStep>(
    hasRestoredConfig &&
      (restoredStep === "voting" || restoredStep === "finished")
      ? restoredStep
      : "setup",
  ); // 投票状態管理
  const [attendanceNumber, setAttendanceNumber] = useState(""); // 出席番号
  const [targetClass, setTargetClass] = useState<ClassName | "">(""); // 1番目の投票先
  const [secondTargetClass, setSecondTargetClass] = useState<ClassName | "">(
    "",
  ); // 2番目の投票先
  const [pendingVote, setPendingVote] = useState<Vote | null>(null); // 投票内容の一時保存
  const [votedCount, setVotedCount] = useState(0);
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
        setVotedCount(result.votedCount);
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

  const count = Number(memberCount);
  const hasCurrentRoster = Boolean(
    rosterProgress &&
    grade &&
    className &&
    part &&
    rosterProgress.grade === grade &&
    rosterProgress.className === className &&
    rosterProgress.part === part,
  );
  const currentRosterError =
    rosterError?.grade === grade &&
    rosterError.className === className &&
    rosterError.part === part
      ? rosterError.message
      : null;
  const isLoadingRoster = Boolean(
    grade && className && part && !hasCurrentRoster && !currentRosterError,
  );

  const validCount =
    Number.isInteger(count) &&
    count >= 1 &&
    hasCurrentRoster &&
    rosterProgress !== null &&
    count <= rosterProgress.registeredCount &&
    count >= rosterProgress.votedCount;
  const hasInvalidResumedCount =
    step !== "setup" &&
    hasCurrentRoster &&
    rosterProgress !== null &&
    (count > rosterProgress.registeredCount ||
      count < rosterProgress.votedCount ||
      !Number.isInteger(count) ||
      count < 1);
  const visibleStep = hasInvalidResumedCount
    ? "setup"
    : step === "voting" &&
        hasCurrentRoster &&
        rosterProgress !== null &&
        rosterProgress.votedCount >= count
      ? "finished"
      : step;
  const memberCountError =
    hasCurrentRoster &&
    rosterProgress &&
    memberCount !== "" &&
    (count > rosterProgress.registeredCount ||
      count < rosterProgress.votedCount)
      ? "投票済み人数以上、名簿の登録人数以下を入力してください。"
      : null;

  useEffect(() => {
    const url = new URL(window.location.href);
    const values: Record<string, string> = {
      grade,
      className,
      part,
      count: memberCount,
      step: visibleStep,
    };
    for (const [key, value] of Object.entries(values)) {
      if (value) url.searchParams.set(key, value);
      else url.searchParams.delete(key);
    }
    const updatedUrl = `${url.pathname}${url.search}${url.hash}`;
    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (currentUrl !== updatedUrl) {
      window.history.replaceState(null, "", updatedUrl);
    }
  }, [className, grade, memberCount, part, visibleStep]);

  const validAttendanceNumber =
    attendanceNumber !== "" &&
    Number.isInteger(Number(attendanceNumber)) &&
    Number(attendanceNumber) >= 1 &&
    Number(attendanceNumber) <= 40;
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
  const targetClassOptions = classes
    .filter((item) => item !== className)
    .map((item) => ({
      value: item,
      label: `${grade}年${item}組`,
    }));
  const secondTargetClassOptions = targetClassOptions.filter(
    (item) => item.value !== targetClass,
  );

  function startVoting(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canStart) return;
    setStep(votedCount >= count ? "finished" : "voting");
  }

  function submitVote(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      !validAttendanceNumber ||
      !targetClass ||
      !secondTargetClass ||
      targetClass === secondTargetClass
    ) {
      return;
    }

    setPendingVote({
      requestId: crypto.randomUUID(),
      attendanceNumber: Number(attendanceNumber),
      targetClass,
      secondTargetClass,
    });
    setVoteError(null);
  }

  async function confirmVote() {
    if (!pendingVote || !grade || !className || !part || isSubmitting) return;

    setIsSubmitting(true);
    setVoteError(null);
    try {
      const response = await fetch("/api/votes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: pendingVote.requestId,
          grade,
          className,
          part,
          attendanceNumber: pendingVote.attendanceNumber,
          firstClass: pendingVote.targetClass,
          secondClass: pendingVote.secondTargetClass,
        }),
      });
      const result: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const errorCode =
          typeof result === "object" &&
          result !== null &&
          "error" in result &&
          typeof result.error === "string"
            ? result.error
            : "";
        setVoteError(
          errorCode === "STUDENT_NOT_FOUND"
            ? "この学年・クラス・パートに該当する出席番号は名簿に見つかりません。入力内容を確認してください。"
            : errorCode === "ALREADY_VOTED"
              ? "この生徒の投票はすでに登録されています。委員に確認してください。"
              : errorCode === "INVALID_VOTE"
                ? "投票内容を確認してください。"
                : errorCode === "IDEMPOTENCY_CONFLICT"
                  ? "送信IDと投票内容が一致しません。最初からやり直してください。"
                  : "投票を保存できませんでした。時間をおいて再度お試しください。",
        );
        return;
      }

      const updatedVotedCount = votedCount + 1;
      setVotedCount(updatedVotedCount);
      setRosterProgress((current) =>
        current
          ? {
              ...current,
              votedCount: updatedVotedCount,
              absentCount: current.registeredCount - updatedVotedCount,
            }
          : current,
      );
      setAttendanceNumber("");
      setTargetClass("");
      setSecondTargetClass("");
      setPendingVote(null);

      if (updatedVotedCount >= count) {
        setStep("finished");
      }
    } catch {
      setVoteError("通信に失敗しました。接続を確認して再度お試しください。");
    } finally {
      setIsSubmitting(false);
    }
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
                description="投票する人数を入力してください。"
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
                      onChange={setGrade}
                    />
                    <PullDown
                      label="クラス"
                      value={className}
                      options={classOptions}
                      onChange={setClassName}
                    />
                    <PullDown
                      label="パート"
                      value={part}
                      options={parts}
                      onChange={setPart}
                    />

                    <label className={styles.field}>
                      <span className={styles.labelText}>投票する人数</span>
                      <span className={styles.numberInputWrap}>
                        <input
                          required
                          type="number"
                          min="1"
                          max={rosterProgress?.registeredCount ?? 40}
                          step="1"
                          inputMode="numeric"
                          value={memberCount}
                          onChange={(event) => {
                            setMemberCount(event.target.value);
                            setStep("setup");
                          }}
                          disabled={isLoadingRoster}
                          aria-describedby="member-count-help"
                        />
                        <span className={styles.inputSuffix}>人</span>
                      </span>
                      <span id="member-count-help" className={styles.fieldHint}>
                        {hasCurrentRoster && rosterProgress
                          ? `1〜${rosterProgress.registeredCount}人`
                          : "パートを選ぶと名簿の人数が表示されます。"}
                      </span>
                    </label>
                  </div>
                </fieldset>

                {grade && className && part && (
                  <InformationNote>
                    {isLoadingRoster
                      ? "名簿を確認しています…"
                      : hasCurrentRoster && rosterProgress
                        ? `名簿登録 ${rosterProgress.registeredCount}人・投票済み ${rosterProgress.votedCount}人・未投票（DB上） ${rosterProgress.absentCount}人`
                        : (currentRosterError ??
                          "名簿の状況を確認できません。")}
                    {hasCurrentRoster && rosterProgress && (
                      <>
                        <br />
                        {validCount
                          ? `今回の投票予定 ${count}人・欠席見込み ${rosterProgress.registeredCount - count}人`
                          : "投票人数を入力すると欠席見込みを確認できます。"}
                      </>
                    )}
                  </InformationNote>
                )}
                {currentRosterError && <p role="alert">{currentRosterError}</p>}
                {memberCountError && <p role="alert">{memberCountError}</p>}

                <InformationNote>
                  投票を確定すると、名簿と照合したうえでデータベースに保存されます。
                </InformationNote>

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
                    全{count}人・欠席見込み
                    {rosterProgress
                      ? rosterProgress.registeredCount - count
                      : 0}
                    人・未投票（DB上）
                    {rosterProgress?.absentCount ?? 0}人
                  </span>
                </div>

                <VoteProgressBar completed={votedCount} total={count} />

                {currentRosterError && <p role="alert">{currentRosterError}</p>}

                <form className={styles.voteForm} onSubmit={submitVote}>
                  <label className={styles.field}>
                    <span className={styles.labelText}>出席番号</span>
                    <span className={styles.numberInputWrap}>
                      <input
                        required
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]{1,2}"
                        maxLength={2}
                        placeholder="1〜40で入力してください"
                        value={attendanceNumber}
                        onChange={(event) =>
                          setAttendanceNumber(event.target.value)
                        }
                      />
                      <span className={styles.inputSuffix}>番</span>
                    </span>
                  </label>

                  <PullDown
                    label="1番投票したいクラス"
                    value={targetClass}
                    options={targetClassOptions}
                    placeholder="クラスを選択してください"
                    onChange={(value) => {
                      setTargetClass(value);
                      if (value === secondTargetClass) {
                        setSecondTargetClass("");
                      }
                    }}
                  />

                  <PullDown
                    label="2番目に投票したいクラス"
                    value={secondTargetClass}
                    options={secondTargetClassOptions}
                    placeholder="クラスを選択してください"
                    onChange={setSecondTargetClass}
                  />

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
                      !targetClass ||
                      !secondTargetClass ||
                      targetClass === secondTargetClass
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
                      欠席見込み {rosterProgress.registeredCount - count}人
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
          grade={grade}
          attendanceNumber={pendingVote.attendanceNumber}
          targetClass={pendingVote.targetClass}
          secondTargetClass={pendingVote.secondTargetClass}
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
