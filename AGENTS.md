This project is a health/running AI assistant. Prioritize safety, privacy, and deterministic training logic.

Rules:
- Do not invent health data.
- Do not fine-tune on user health or Strava data.
- Do not log secrets, tokens, or full health payloads.
- Training decisions must use training engine outputs, not only LLM text generation.
- Use OpenRouter only for reasoning, explanation, and conversational interface.
- Store Strava tokens encrypted.
- Use Europe/Helsinki as default timezone.
- Keep MVP deployable on 2 CPU / 4 GB RAM VPS.
