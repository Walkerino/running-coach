import { z } from "zod";

import { env } from "../config/env.js";

export type LlmMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

const openRouterResponseSchema = z
  .object({
    choices: z.array(
      z
        .object({
          message: z
            .object({
              content: z.string().optional(),
            })
            .optional(),
        })
        .passthrough(),
    ),
  })
  .passthrough();

const openRouterErrorSchema = z
  .object({
    error: z
      .object({
        message: z.string().optional(),
      })
      .optional(),
  })
  .passthrough();

async function getErrorDetail(response: Response) {
  try {
    const parsed = openRouterErrorSchema.parse(await response.json());
    return parsed.error?.message ?? response.statusText;
  } catch {
    return response.statusText;
  }
}

export async function chatWithOpenRouter(messages: LlmMessage[]) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.OPENROUTER_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${env.OPENROUTER_BASE_URL.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: env.OPENROUTER_MODEL,
        messages,
        max_tokens: env.OPENROUTER_MAX_TOKENS,
        temperature: 0.2,
        stream: false,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`OpenRouter returned HTTP ${response.status}: ${await getErrorDetail(response)}`);
    }

    const parsed = openRouterResponseSchema.parse(await response.json());
    const content = parsed.choices[0]?.message?.content?.trim() ?? "";
    if (!content) {
      throw new Error("OpenRouter returned an empty response");
    }

    return content;
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown error";
    throw new Error(
      `OpenRouter request failed for model ${env.OPENROUTER_MODEL} at ${env.OPENROUTER_BASE_URL}. ` +
        "Ensure OPENROUTER_API_KEY is set and the model is available for the account. " +
        `Details: ${detail}`,
    );
  } finally {
    clearTimeout(timeout);
  }
}
