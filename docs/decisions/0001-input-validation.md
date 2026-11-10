# 0001. 入力検証は zod で書き、OpenAPI と zod-validator は使わない

- 状態：採用
- 日付：2026-11-10

## 背景

入力検証を手書きの条件分岐から zod のスキーマに置き換えた。Hono には zod と組み合わせるミドルウェア（`@hono/zod-validator`）があり、OpenAPI の仕様書を生成する `@hono/zod-openapi` もある。どこまで採用するかを決める必要があった。

## 判断

- 入力検証は zod のスキーマで書き、検証する関数（`parseTokenizeRequest` など）を unit テストする
- `@hono/zod-validator` は使わない
- OpenAPI の仕様書は作らない
- API の仕様の正はテストとする（`test/integration/app.test.ts` が HTTP の振る舞い、`test/unit/validation.test.ts` が入力の条件）。README の「API」節はその要約

ボディを持つエンドポイントを追加するときは、Hono 組み込みの `validator()` に移る。その際、content-type が JSON でないリクエストと壊れた JSON の扱い、`onError` で返すエラーの形を先にテストで決める。

## 検討した案

### `@hono/zod-validator`

- 利点：ハンドラーで `c.req.valid("json")` に型が付く。Hono RPC（`hc` クライアント）の型推論が効く。`@hono/zod-openapi` に移りやすい
- 採用しない理由：
  - API の利用者は IAM 認証の非公開 Function URL を呼ぶ CLI と e2e テストだけで、TypeScript のクライアントがない。RPC の型推論が活きない
  - ハンドラーでの型付けは Hono 組み込みの `validator()` でも得られる
  - 依存はすべてチェックサムで固定し Dependabot で監視する方針のため、得られるものが同じなら依存を増やさない
- 補足：最初は「壊れた JSON に英語のメッセージを返すなど挙動が変わる」ことを見送る理由に挙げたが、`onError` で揃えられるため根拠にならないと分かり、上記の理由に改めた

### OpenAPI の仕様書

- 利点：API の仕様を構造化された形で残せる。Swagger UI やクライアントの生成に使える
- 採用しない理由：
  - 仕様書を読む人やツールがいない（別のリポジトリやチームのクライアント、コード生成、API を試す UI のいずれもない）
  - 学習の主目的（AWS CDK と GitHub Actions）に含まれない
  - 手書きするとコードと二重管理になり、生成するとルート定義が冗長になる。API の規模（エンドポイント 2〜3 個）では、コードとテストを読むほうが早い

## 見直すきっかけ

- TypeScript のクライアントから Hono RPC で API を呼ぶ
- OpenAPI の仕様書が必要になる（API を外部に公開する、など）
- ボディを持つエンドポイントが 3 つ以上になり、検証とエラーの形の重複が目立つ
