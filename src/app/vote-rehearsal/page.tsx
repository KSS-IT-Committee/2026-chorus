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
  attendanceNumber: number;
  targetClass: string;
};

export default function VoteRehearsalPage() {
  const [grade, setGrade] = useState<Grade | "">(""); // 学年
  const [className, setClassName] = useState<ClassName | "">(""); // クラス
  const [part, setPart] = useState<(typeof parts)[number] | "">(""); // パート
  const [memberCount, setMemberCount] = useState(""); // 人数
  const [step, setStep] = useState<"setup" | "voting" | "finished">("setup"); // 投票状態管理
  const [attendanceNumber, setAttendanceNumber] = useState(""); // 出席番号
  const [targetClass, setTargetClass] = useState(""); // 投票先のクラス
  const [pendingVote, setPendingVote] = useState<Vote | null>(null); // 投票内容の一時保存
  const [votes, setVotes] = useState<Vote[]>([]); // 投票内容の保存

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

  function startVoting(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canStart) return;
    setStep("voting");
  }

  function submitVote(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validAttendanceNumber || !targetClass) return;

    setPendingVote({
      attendanceNumber: Number(attendanceNumber),
      targetClass,
    });
  }

  function confirmVote() {
    if (!pendingVote) return;

    const updatedVotes = [...votes, pendingVote];
    setVotes(updatedVotes);
    setAttendanceNumber("");
    setTargetClass("");
    setPendingVote(null);

    if (updatedVotes.length >= count) {
      setStep("finished");
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.card} aria-labelledby="page-title">
          <div className={styles.cardTop}>
            <h1 id="page-title" className={styles.title}>
              {step === "finished" ? (
                <>投票が完了しました</>
              ) : (
                <>投票（リハーサル）</>
              )}
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
              // 投票者情報入力画面
              <form className={styles.form} onSubmit={startVoting}>
                <fieldset className={styles.fieldset}>
                  <div className={styles.fieldGrid}>
                    <PullDown
                      label="学年"
                      value={grade}
                      options={grades.map((item) => ({
                        value: item,
                        label: `${item}年`,
                      }))}
                      onChange={(value) => setGrade(value as Grade | "")}
                    />
                    <PullDown
                      label="クラス"
                      value={className}
                      options={classOptions}
                      onChange={(value) =>
                        setClassName(value as ClassName | "")
                      }
                    />
                    <PullDown
                      label="パート"
                      value={part}
                      options={parts.map((item) => ({
                        value: item,
                        label: item,
                      }))}
                      onChange={(value) =>
                        setPart(value as (typeof parts)[number] | "")
                      }
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
                  入力内容は送信・保存されません。
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
              // 終了画面
              <div className={styles.form}>
                <div className={styles.summary}>
                  <span className={styles.summaryLabel}>投票者</span>
                  <strong>
                    {grade}年{className}組・{part}
                  </strong>
                  <span className={styles.summaryCount}>
                    全{count}人
                  </span>
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
                    label="投票したいクラス"
                    value={targetClass}
                    options={targetClassOptions}
                    placeholder="クラスを選択してください"
                    onChange={setTargetClass}
                  />

                  <InformationNote variant="warning">
                    この投票は取り消せません。
                    <br />
                    内容をよく確認してから送信してください。
                  </InformationNote>

                  <button
                    className={styles.primaryButton}
                    type="submit"
                    disabled={!validAttendanceNumber || !targetClass}
                  >
                    この内容で投票する
                    <span aria-hidden="true">→</span>
                  </button>
                </form>
              </div>
            )}
            
            {step === "finished" && (
              // 終了画面
              <div className={styles.finished}>
                <p className={styles.finishedMessage}>
                    {grade}年{className}組・{part}の投票
                  <br />
                  <strong>{votes.length}</strong>人分の練習が完了しました。
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
          onCancel={() => setPendingVote(null)}
          onConfirm={confirmVote}
        />
      )}
    </main>
  );
}
