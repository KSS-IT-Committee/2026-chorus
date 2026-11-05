"use client";

import { useState, useTransition, type SubmitEvent } from "react";
import Link from "next/link";
import InformationNote from "@/components/InformationNote";
import PullDown from "@/components/PullDown";
import StepHeading from "@/components/StepHeading";
import VoteConfirmation from "@/components/VoteConfirmation";
import VoteProgressBar from "@/components/VoteProgressBar";
import { checkVoteAccessCode, submitRehearsalVote } from "./actions";
import styles from "./page.module.css";

const grades = ["1", "2", "3"] as const;
const classes = ["A", "B", "C", "D"] as const;
const parts = ["ソプラノ", "アルト", "テノール", "バス"] as const;

type Grade = (typeof grades)[number];
type ClassName = (typeof classes)[number];
type Vote = {
  attendanceNumber: number;
  targetClass: ClassName;
  secondTargetClass: ClassName;
};

export default function VoteRehearsalPage() {
  const [grade, setGrade] = useState<Grade | "">(""); // 学年
  const [className, setClassName] = useState<ClassName | "">(""); // クラス
  const [part, setPart] = useState<(typeof parts)[number] | "">(""); // パート
  const [memberCount, setMemberCount] = useState(""); // 人数
  const [accessCode, setAccessCode] = useState(""); // 投票コード
  const [setupError, setSetupError] = useState(""); // 投票コードのエラー
  const [step, setStep] = useState<"setup" | "voting" | "finished">("setup"); // 投票状態管理
  const [attendanceNumber, setAttendanceNumber] = useState(""); // 出席番号
  const [targetClass, setTargetClass] = useState<ClassName | "">(""); // 1番目の投票先
  const [secondTargetClass, setSecondTargetClass] = useState<ClassName | "">(
    "",
  ); // 2番目の投票先
  const [pendingVote, setPendingVote] = useState<Vote | null>(null); // 投票内容の一時保存
  const [votes, setVotes] = useState<Vote[]>([]); // 投票内容の保存
  const [errorMessage, setErrorMessage] = useState(""); // 送信エラー
  const [isSubmitting, startSubmitting] = useTransition(); // 送信中

  const count = Number(memberCount);
  const validCount = Number.isInteger(count) && count >= 1 && count <= 40;
  const validAttendanceNumber =
    attendanceNumber !== "" &&
    Number.isInteger(Number(attendanceNumber)) &&
    Number(attendanceNumber) >= 1 &&
    Number(attendanceNumber) <= 40;
  // 同じ端末で同じ出席番号が二度投票しないようにする(サーバー側でも弾く)
  const isDuplicateAttendanceNumber =
    validAttendanceNumber &&
    votes.some((vote) => vote.attendanceNumber === Number(attendanceNumber));
  const canStart = Boolean(
    grade && className && part && validCount && accessCode.trim(),
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
    if (!canStart || isSubmitting) return;

    startSubmitting(async () => {
      const result = await checkVoteAccessCode(accessCode);
      if (!result.ok) {
        setSetupError(result.message);
        return;
      }
      setSetupError("");
      setStep("voting");
    });
  }

  function submitVote(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      !validAttendanceNumber ||
      isDuplicateAttendanceNumber ||
      !targetClass ||
      !secondTargetClass ||
      targetClass === secondTargetClass
    ) {
      return;
    }

    setErrorMessage("");
    setPendingVote({
      attendanceNumber: Number(attendanceNumber),
      targetClass,
      secondTargetClass,
    });
  }

  function confirmVote() {
    if (!pendingVote || !grade || !className || isSubmitting) return;
    const vote = pendingVote;

    startSubmitting(async () => {
      const result = await submitRehearsalVote(accessCode, {
        grade: Number(grade),
        classLetter: className,
        attendanceNumber: vote.attendanceNumber,
        firstClass: vote.targetClass,
        secondClass: vote.secondTargetClass,
      });

      setPendingVote(null);
      if (!result.ok) {
        setErrorMessage(result.message);
        return;
      }

      const updatedVotes = [...votes, vote];
      setVotes(updatedVotes);
      setErrorMessage("");
      setAttendanceNumber("");
      setTargetClass("");
      setSecondTargetClass("");

      if (updatedVotes.length >= count) {
        setStep("finished");
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

                    <label className={styles.field}>
                      <span className={styles.labelText}>投票コード</span>
                      <span className={styles.numberInputWrap}>
                        <input
                          required
                          type="password"
                          autoComplete="off"
                          value={accessCode}
                          onChange={(event) => {
                            setAccessCode(event.target.value);
                            setSetupError("");
                          }}
                          aria-describedby="access-code-help"
                        />
                      </span>
                      <span id="access-code-help" className={styles.fieldHint}>
                        合唱委員から伝えられたコード
                      </span>
                    </label>
                  </div>
                </fieldset>

                {setupError && (
                  <InformationNote variant="warning">
                    {setupError}
                  </InformationNote>
                )}

                <InformationNote>
                  投票内容は1人ずつ送信・保存されます。
                </InformationNote>

                <button
                  className={styles.primaryButton}
                  type="submit"
                  disabled={!canStart || isSubmitting}
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
                        onChange={(event) => {
                          setAttendanceNumber(event.target.value);
                          setErrorMessage("");
                        }}
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

                  {isDuplicateAttendanceNumber && (
                    <InformationNote variant="warning">
                      {attendanceNumber}番はこの端末ですでに投票済みです。
                    </InformationNote>
                  )}

                  {errorMessage && (
                    <InformationNote variant="warning">
                      {errorMessage}
                    </InformationNote>
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
                      !validAttendanceNumber ||
                      isDuplicateAttendanceNumber ||
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
          onCancel={() => setPendingVote(null)}
          onConfirm={confirmVote}
          isSubmitting={isSubmitting}
        />
      )}
    </main>
  );
}
