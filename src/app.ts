import { Hono } from "hono";
import { tokenize } from "./tokenizer";

// 入力の上限。形態素解析のコストと Lambda の実行時間を抑えるため
const MAX_TEXT_LENGTH = 1000;

export const app = new Hono();

app.get("/health", (c) => c.json({ status: "ok" }));

app.post("/tokenize", async (c) => {
  const body: unknown = await c.req.json().catch(() => undefined);
  const text = isRecord(body) ? body.text : undefined;

  if (typeof text !== "string" || text.length === 0) {
    return c.json({ error: "text は空でない文字列で指定してください" }, 400);
  }
  if (text.length > MAX_TEXT_LENGTH) {
    return c.json({ error: `text は ${MAX_TEXT_LENGTH} 文字以内で指定してください` }, 400);
  }

  const tokens = await tokenize(text);
  return c.json({ text, reading: tokens.map((t) => t.reading).join(""), tokens });
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
