import path from "node:path";
import { CfnOutput, Duration, Stack, type StackProps } from "aws-cdk-lib";
import { FunctionUrlAuthType, Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction, OutputFormat } from "aws-cdk-lib/aws-lambda-nodejs";
import type { Construct } from "constructs";

// Lambda の中で kuromoji の辞書を置く場所（デプロイパッケージは /var/task に展開される）
const DICT_DIR = "/var/task/dict";

export class NiteruLabStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const api = new NodejsFunction(this, "ApiFunction", {
      entry: path.join(import.meta.dirname, "../../src/lambda.ts"),
      handler: "handler",
      runtime: Runtime.NODEJS_24_X,
      // 辞書（約 18MB）の読み込みがあるため、CPU の割り当ても増えるよう多めにする
      memorySize: 1024,
      timeout: Duration.seconds(10),
      environment: { KUROMOJI_DIC_PATH: DICT_DIR },
      bundling: {
        // src/lambda.ts は top-level await と import.meta を使うため ESM で出力する
        format: OutputFormat.ESM,
        target: "node24",
        mainFields: ["module", "main"],
        // kuromoji など CommonJS の依存が require を使えるようにする
        banner:
          "import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);",
        commandHooks: {
          beforeBundling: () => [],
          beforeInstall: () => [],
          // esbuild は辞書ファイルを含めないので、バンドルの横にコピーする
          afterBundling: (inputDir, outputDir) => [
            `cp -rL ${inputDir}/node_modules/kuromoji/dict ${outputDir}/dict`,
          ],
        },
      },
    });

    // 非公開の API にするため、IAM 認証（SigV4 の署名）を必須にする
    const url = api.addFunctionUrl({ authType: FunctionUrlAuthType.AWS_IAM });

    new CfnOutput(this, "FunctionUrl", { value: url.url });
  }
}
