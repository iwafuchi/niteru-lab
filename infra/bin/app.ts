import { App } from "aws-cdk-lib";
import { NiteruLabStack } from "../lib/niteru-lab-stack";

const app = new App();

// デプロイ先は context の target で選ぶ（例：cdk deploy -c target=local）。
// 今は Floci（ローカルの AWS エミュレーター）だけを用意し、本物の AWS 向けの
// スタックは、アカウントと認証の準備ができてから追加する
const target: unknown = app.node.tryGetContext("target");
if (target !== "local") {
  throw new Error(`未対応のデプロイ先です: ${String(target)}。pnpm cdk:local から実行してください`);
}

new NiteruLabStack(app, "NiteruLab-Local", {
  // Floci のアカウント（既定値）と、compose.yaml で指定したリージョン。
  // 本物の AWS で使う予定の東京リージョンにそろえる
  env: { account: "000000000000", region: "ap-northeast-1" },
});
