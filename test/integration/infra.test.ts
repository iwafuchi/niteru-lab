import { App } from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import { beforeAll, describe, test } from "vitest";
import { NiteruLabStack } from "../../infra/lib/niteru-lab-stack";

// CloudFormation テンプレートを生成して、インフラの仕様を確認する。
// Floci は IAM 認証を検証しないため、認証の設定はここで守る
describe("NiteruLabStack", () => {
  let template: Template;

  beforeAll(() => {
    const app = new App();
    const stack = new NiteruLabStack(app, "Test", {
      env: { account: "000000000000", region: "ap-northeast-1" },
    });
    template = Template.fromStack(stack);
  });

  test("Lambda は Node.js 24 で動き、辞書の場所を環境変数で渡す", () => {
    template.hasResourceProperties("AWS::Lambda::Function", {
      Runtime: "nodejs24.x",
      Handler: "index.handler",
      Environment: { Variables: { KUROMOJI_DIC_PATH: "/var/task/dict" } },
    });
  });

  test("Function URL は IAM 認証を必須にし、誰でも呼べる状態にしない", () => {
    template.resourceCountIs("AWS::Lambda::Url", 1);
    template.hasResourceProperties("AWS::Lambda::Url", { AuthType: "AWS_IAM" });
    template.resourcePropertiesCountIs("AWS::Lambda::Permission", { Principal: "*" }, 0);
  });

  test("Function URL を出力する", () => {
    template.hasOutput("FunctionUrl", { Value: Match.anyValue() });
  });
});
