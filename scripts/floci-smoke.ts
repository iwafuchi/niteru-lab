// Floci を起動してデプロイし、API が応答することと、余計なコンテナが起動しないことを確かめる
// （pnpm floci:smoke）。Docker を使うため pnpm check には含めない
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { isDeepStrictEqual } from "node:util";
import { z } from "zod";

interface SmokeRequest {
  method: string;
  path: string;
  body?: unknown;
}
interface SmokeResponse {
  status: number;
  body: unknown;
}
interface ResponseCheck {
  request: SmokeRequest;
  expected: SmokeResponse;
  actual: SmokeResponse;
}
interface FlociContainer {
  name: string;
  service: string;
}

/** デプロイした API に送るリクエスト。仕様の正は test/integration/app.test.ts で、ここは代表だけ */
const CHECKS: { request: SmokeRequest; expected: SmokeResponse }[] = [
  {
    request: { method: "GET", path: "health" },
    expected: { status: 200, body: { status: "ok" } },
  },
  {
    // 辞書が Lambda に含まれていないと失敗する
    request: { method: "POST", path: "tokenize", body: { text: "夜に駆ける" } },
    expected: {
      status: 200,
      body: {
        text: "夜に駆ける",
        reading: "ヨルニカケル",
        tokens: [
          { surface: "夜", reading: "ヨル", pos: "名詞" },
          { surface: "に", reading: "ニ", pos: "助詞" },
          { surface: "駆ける", reading: "カケル", pos: "動詞" },
        ],
      },
    },
  },
  {
    request: { method: "POST", path: "tokenize", body: { text: " " } },
    expected: {
      status: 400,
      body: { error: "text には文字か数字を 1 文字以上含めてください" },
    },
  },
];

const outputsSchema = z.record(z.string(), z.record(z.string(), z.string()));

/** cdk deploy --outputs-file の内容から Function URL を返す。Floci 以外の URL なら失敗する */
export function functionUrlOf(outputs: unknown): URL {
  const urls = Object.values(outputsSchema.parse(outputs)).flatMap((stack) =>
    stack["FunctionUrl"] === undefined ? [] : [stack["FunctionUrl"]],
  );
  const [first] = urls;
  if (first === undefined || urls.length !== 1) {
    throw new Error(`出力の FunctionUrl が 1 つではない: ${urls.length} 個`);
  }
  const url = new URL(first);
  if (url.protocol !== "http:" || !url.hostname.endsWith(".localhost") || url.port !== "4566") {
    throw new Error(`Floci の URL ではない: ${first}`);
  }
  return url;
}

export function findResponseViolations(checks: ResponseCheck[]): string[] {
  if (checks.length === 0) return ["API の応答を 1 つも確かめていない"];
  return checks.flatMap(({ request, expected, actual }) =>
    isDeepStrictEqual(actual, expected)
      ? []
      : [
          `${request.method} /${request.path} の応答が違う: 期待 ${JSON.stringify(expected)} / 実際 ${JSON.stringify(actual)}`,
        ],
  );
}

/** docker ps の出力（名前とサービスのラベルをタブで区切った行）を読む */
export function parseContainers(stdout: string): FlociContainer[] {
  return lines(stdout).map((line) => {
    const [name = "", service = ""] = line.split("\t");
    return { name, service };
  });
}

/**
 * このアプリが使うのは Lambda だけなので、ほかのコンテナはすべて違反にする。ECR だけを名指しに
 * しないのは、Floci の更新で別のコンテナが起動し始めても気づけるようにするため（docs/decisions/0003）
 */
export function findContainerViolations(containers: FlociContainer[]): string[] {
  const violations = containers
    .filter((c) => c.service !== "lambda")
    .map(
      (c) =>
        `Floci が Lambda 以外のコンテナを起動した: ${c.name}（${c.service === "" ? "ラベルなし" : c.service}）`,
    );
  if (!containers.some((c) => c.service === "lambda")) {
    violations.push("Lambda のコンテナが見つからない");
  }
  return violations;
}

export function findLeftoverViolations(leftover: {
  containers: string[];
  networks: string[];
  volumes: string[];
}): string[] {
  return [
    ...leftover.containers.map((name) => `停止した後にコンテナが残っている: ${name}`),
    ...leftover.networks.map((name) => `停止した後にネットワークが残っている: ${name}`),
    ...leftover.volumes.map((name) => `停止した後にボリュームが残っている: ${name}`),
  ];
}

function lines(stdout: string): string[] {
  return stdout.split("\n").filter((line) => line !== "");
}

/** コマンドを実行し、失敗したら例外にする。出力はそのまま表示する */
function run(command: string, args: string[]): void {
  console.log(`$ ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} ${args.join(" ")} が失敗しました`);
}

function docker(...args: string[]): string {
  const result = spawnSync("docker", args, { encoding: "utf8" });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`docker ${args.join(" ")}:\n${result.stderr}`);
  return result.stdout;
}

function flociContainers(): FlociContainer[] {
  return parseContainers(
    docker(
      "ps",
      "-a",
      "--filter",
      "label=floci=true",
      "--format",
      '{{.Names}}\t{{.Label "io.floci.service"}}',
    ),
  );
}

/** compose のコンテナと Floci が起動したコンテナ、compose のネットワークの名前 */
function findRemaining(): { containers: string[]; networks: string[] } {
  const project = z
    .object({ name: z.string() })
    .parse(JSON.parse(docker("compose", "config", "--format", "json"))).name;
  const ofProject = `label=com.docker.compose.project=${project}`;
  return {
    containers: [
      ...lines(docker("ps", "-a", "--filter", ofProject, "--format", "{{.Names}}")),
      ...flociContainers().map((c) => c.name),
    ],
    networks: lines(docker("network", "ls", "--filter", ofProject, "--format", "{{.Name}}")),
  };
}

/** 動いている Floci のコンテナが使っているボリュームの名前（匿名ボリュームは名前に手がかりがない） */
function volumesInUse(): string[] {
  const ids = lines(docker("compose", "ps", "-aq"));
  if (ids.length === 0) return [];
  const format = '{{range .Mounts}}{{if eq .Type "volume"}}{{println .Name}}{{end}}{{end}}';
  return lines(docker("inspect", "--format", format, ...ids));
}

async function send(base: URL, request: SmokeRequest): Promise<SmokeResponse> {
  const response = await fetch(new URL(request.path, base), {
    method: request.method,
    // 初回は Lambda のイメージの取得と辞書の読み込みがあるため長めにする
    signal: AbortSignal.timeout(120_000),
    ...(request.body === undefined
      ? {}
      : {
          headers: { "content-type": "application/json" },
          body: JSON.stringify(request.body),
        }),
  });
  const text = await response.text();
  try {
    return { status: response.status, body: JSON.parse(text) };
  } catch {
    // Lambda が起動に失敗したときなど、JSON でない応答も内容が分かるように残す
    return { status: response.status, body: text };
  }
}

async function deployAndCheck(workDir: string): Promise<string[]> {
  run("pnpm", ["cdk:local", "bootstrap"]);
  const outputsFile = path.join(workDir, "outputs.json");
  run("pnpm", [
    "cdk:local",
    "deploy",
    "--require-approval",
    "never",
    "--outputs-file",
    outputsFile,
  ]);
  const url = functionUrlOf(JSON.parse(readFileSync(outputsFile, "utf8")));

  const checks: ResponseCheck[] = [];
  for (const { request, expected } of CHECKS) {
    // oxlint-disable-next-line no-await-in-loop -- 同時に送ると Lambda のコンテナが増えるため、順に送る
    checks.push({ request, expected, actual: await send(url, request) });
  }
  return [...findResponseViolations(checks), ...findContainerViolations(flociContainers())];
}

async function main(): Promise<void> {
  const before = findRemaining();
  if (before.containers.length > 0) {
    // 最後に floci:down で消すため、作業中の環境を壊さないよう、動いていたら何もしない
    throw new Error(
      `Floci が動いています。pnpm floci:down で止めてから実行してください: ${before.containers.join(", ")}`,
    );
  }

  const workDir = mkdtempSync(path.join(tmpdir(), "floci-smoke-"));
  const violations: string[] = [];
  try {
    run("pnpm", ["floci:up"]);
    violations.push(...(await deployAndCheck(workDir)));
  } catch (error) {
    // 片付けも失敗したときに、もとの原因が隠れないよう先に表示する
    console.error(error);
    violations.push("動作確認が途中で失敗した（原因は上のエラー）");
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }

  const volumes = volumesInUse();
  run("pnpm", ["floci:down"]);
  const remainingVolumes = new Set(lines(docker("volume", "ls", "-q")));
  violations.push(
    ...findLeftoverViolations({
      ...findRemaining(),
      volumes: volumes.filter((name) => remainingVolumes.has(name)),
    }),
  );

  if (violations.length > 0) {
    console.error(
      ["Floci での動作確認に違反があります:", ...violations.map((v) => `- ${v}`)].join("\n"),
    );
    process.exitCode = 1;
    return;
  }
  console.log("Floci での動作確認に成功しました");
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
