import { Hono } from "hono";
import { tokenize } from "./tokenizer";
import { parseTokenizeRequest } from "./validation";

export const app = new Hono();

app.get("/health", (c) => c.json({ status: "ok" }));

app.post("/tokenize", async (c) => {
  const body: unknown = await c.req.json().catch(() => undefined);
  const input = parseTokenizeRequest(body);
  if (!input.ok) {
    return c.json({ error: input.error }, 400);
  }

  const tokens = await tokenize(input.text);
  return c.json({
    text: input.text,
    reading: tokens.map((t) => t.reading).join(""),
    tokens,
  });
});
