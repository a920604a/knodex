import httpx

from app.config import settings

EMBED_MODEL = "@cf/baai/bge-small-en-v1.5"
LLM_MODEL = "@cf/meta/llama-3.1-8b-instruct"

_BASE = "https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/run/{model}"


def _url(model: str) -> str:
    return _BASE.format(account_id=settings.cf_account_id, model=model)


def _headers() -> dict:
    if not settings.cf_api_token:
        raise RuntimeError("CLOUDFLARE_API_TOKEN is not configured — set it in .env")
    return {"Authorization": f"Bearer {settings.cf_api_token}"}


async def embed(text: str) -> list[float]:
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            _url(EMBED_MODEL),
            headers=_headers(),
            json={"text": [text]},
        )
        resp.raise_for_status()
        data = resp.json()
        return data["result"]["data"][0]


async def generate(prompt: str, max_tokens: int = 1024) -> tuple[str, int]:
    """Returns (answer_text, tokens_used)."""
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            _url(LLM_MODEL),
            headers=_headers(),
            json={
                "messages": [
                    {"role": "system", "content": "你是一個知識助手，根據提供的資料回答問題。如果資料不足，請說明。"},
                    {"role": "user", "content": prompt},
                ],
                "max_tokens": max_tokens,
            },
        )
        resp.raise_for_status()
        data = resp.json()
        answer = data["result"]["response"]
        tokens = data.get("result", {}).get("usage", {}).get("total_tokens", 0)
        return answer, tokens
