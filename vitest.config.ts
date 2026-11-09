import { defineConfig } from "vitest/config";

// テストピラミッドの層ごとに project を分け、層単位で実行できるようにする
//   unit        : 純粋な関数。I/O なしで速い。数を最も多くする
//   integration : 辞書の読み込みや HTTP 層など、部品を組み合わせた動作
//   e2e         : デプロイ済みの環境に対するテスト。pnpm test では実行しない
export default defineConfig({
  test: {
    environment: "node",
    passWithNoTests: true,
    projects: [
      {
        extends: true,
        test: { name: "unit", include: ["test/unit/**/*.test.ts"] },
      },
      {
        extends: true,
        test: {
          name: "integration",
          include: ["test/integration/**/*.test.ts"],
          // kuromoji の辞書読み込み（1 秒弱）を含むため長めにする
          testTimeout: 15_000,
          hookTimeout: 15_000,
        },
      },
      {
        extends: true,
        test: { name: "e2e", include: ["test/e2e/**/*.test.ts"], testTimeout: 30_000 },
      },
    ],
  },
});
