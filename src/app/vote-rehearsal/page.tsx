"use client";

import { useState, type SubmitEvent } from "react";
import Link from "next/link";
import InformationNote from "@/components/InformationNote";
import PullDown from "@/components/PullDown";
import StepHeading from "@/components/StepHeading";
import VoteConfirmation from "@/components/VoteConfirmation";
import VoteProgressBar from "@/components/VoteProgressBar";
import styles from "./page.module.css";

const grades = ["1", "2", "3"] as const;
const classes = ["A", "B", "C", "D"] as const;
const parts = ["ソプラノ", "アルト", "テノール", "バス"] as const;

type Grade = (typeof grades)[number];
type ClassName = (typeof classes)[number];
type Vote = {
  requestId: string;
  attendanceNumber: number;
  targetClass: ClassName;
  secondTargetClass: ClassName;
};

export default function VoteRehearsalPage() {
  const [grade, setGrade] = useState<Grade | "">(""); // 学年
  const [className, setClassName] = useState<ClassName | "">(""); // クラス
  const [part, setPart] = useState<(typeof parts)[number] | "">(""); // パート
  const [memberCount, setMemberCount] = useState(""); // 人数
  const [step, setStep] = useState<"setup" | "voting" | "finished">("setup"); // 投票状態管理
  const [attendanceNumber, setAttendanceNumber] = useState(""); // 出席番号
  const [targetClass, setTargetClass] = useState<ClassName | "">(""); // 1番目の投票先
  const [secondTargetClass, setSecondTargetClass] = useState<ClassName | "">(
    "",
  ); // 2番目の投票先
  const [pendingVote, setPendingVote] = useState<Vote | null>(null); // 投票内容の一時保存
  const [votes, setVotes] = useState<Vote[]>([]); // 投票内容の保存
  const [voteError, setVoteError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const count = Number(memberCount);
  const validCount = Number.isInteger(count) && count >= 1 && count <= 40;
  const validAttendanceNumber =
    attendanceNumber !== "" &&
    Number.isInteger(Number(attendanceNumber)) &&
    Number(attendanceNumber) >= 1 &&
    Number(attendanceNumber) <= 40;
  const canStart = Boolean(grade && className && part && validCount);
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
    setStep("voting");
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
    if (!pendingVote || !grade || !className || isSubmitting) return;

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
            ? "この学年・クラス・出席番号は名簿に見つかりません。入力内容を確認してください。"
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

      const updatedVotes = [...votes, pendingVote];
      setVotes(updatedVotes);
      setAttendanceNumber("");
      setTargetClass("");
      setSecondTargetClass("");
      setPendingVote(null);

      if (updatedVotes.length >= count) {
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
            {step === "setup" && (
              <StepHeading
                step="01"
                title="投票者情報を入力"
                description="投票する人数を入力してください。"
              />
            )}

            {step === "voting" && (
              <StepHeading
                step="02"
                title="投票内容を入力"
                description="送信後に取り消すことはできません。"
              />
            )}

            {step === "finished" && (
              <StepHeading
                step="03"
                title="投票が完了しました"
                description="ご協力ありがとうございました。"
              />
            )}

            {step === "setup" && (
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
                      options={parts.map((item) => ({
                        value: item,
                        label: item,
                      }))}
                      onChange={setPart}
                    />

                    <label className={styles.field}>
                      <span className={styles.labelText}>投票する人数</span>
                      <span className={styles.numberInputWrap}>
                        <input
                          required
                          type="number"
                          min="1"
                          max="40"
                          step="1"
                          inputMode="numeric"
                          value={memberCount}
                          onChange={(event) =>
                            setMemberCount(event.target.value)
                          }
                          aria-describedby="member-count-help"
                        />
                        <span className={styles.inputSuffix}>人</span>
                      </span>
                      <span id="member-count-help" className={styles.fieldHint}>
                        1〜40人
                      </span>
                    </label>
                  </div>
                </fieldset>

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

            {step === "voting" && grade && className && (
              <div className={styles.form}>
                <div className={styles.summary}>
                  <span className={styles.summaryLabel}>投票者</span>
                  <strong>
                    {grade}年{className}組・{part}
                  </strong>
                  <span className={styles.summaryCount}>全{count}人</span>
                </div>

                <VoteProgressBar completed={votes.length} total={count} />

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

            {step === "finished" && (
              <div className={styles.finished}>
                <p className={styles.finishedMessage}>
                  {grade}年{className}組・{part}
                  <br />
                  <strong>{votes.length}</strong>人分の投票が完了しました。
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
