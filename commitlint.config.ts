import type { Rule, UserConfig } from "@commitlint/types";

// 後から読み返したときに意味が伝わらない subject を拒否する
const vaguePatterns: { pattern: RegExp; reason: string }[] = [
  {
    // 学習の進め方の番号は、リポジトリの履歴だけを見ても意味が分からない
    pattern: /step\s*\d+/i,
    reason: "「Step N」のような作業手順の番号ではなく、何を変えたかを書いてください",
  },
  {
    pattern:
      /^(wip|fix|fixes|update|updates|change|changes|修正|バグ修正|不具合修正|対応|更新|変更|調整|微修正|いろいろ|色々)(のみ|だけ|など)?$/i,
    reason: "何を・なぜ変えたのかが分かるように具体的に書いてください",
  },
];

const subjectNotVague: Rule = (parsed) => {
  const subject = parsed.subject?.trim() ?? "";
  const hit = vaguePatterns.find(({ pattern }) => pattern.test(subject));
  return hit ? [false, hit.reason] : [true];
};

const config: UserConfig = {
  extends: ["@commitlint/config-conventional"],
  plugins: [{ rules: { "subject-not-vague": subjectNotVague } }],
  rules: {
    // 日本語の subject を書くので、英語の大文字・小文字ルールは使わない
    "subject-case": [0],
    "subject-min-length": [2, "always", 6],
    "subject-not-vague": [2, "always"],
    // 本文には、そのコミットを実施した理由・背景などの意思決定を書く
    "body-empty": [2, "never"],
    "body-min-length": [2, "always", 20],
  },
};

export default config;
