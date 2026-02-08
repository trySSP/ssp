import asyncio
import argparse
import json
import logging
import os
import time
from typing import Any, Dict, List, Tuple

import httpx
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from dotenv import load_dotenv


logger = logging.getLogger(__name__)


EXA_ENRICHMENTS: List[Tuple[str, str]] = [
    ("company_differentiator", "Company differentiator and unique value proposition in one sentence."),
    ("funding", "Latest known total funding and most recent funding stage."),
    ("revenue", "Estimated annual revenue or revenue range in USD. Return Unknown if unavailable."),
    ("employees", "Approximate employee count."),
    ("founded_year", "Year company started or founded."),
    ("target_customer", "Primary target customer segment."),
    ("headquarters", "Headquarters location as city and country.")
]

IDEA_SUMMARY_PROMPT = ChatPromptTemplate.from_messages([
    (
        "system",
        """
You convert a startup idea into one short search sentence.

Rules:
- Return exactly one sentence
- Keep it under 24 words
- Include product + target customer + problem
- Do not include quotes, labels, or numbering
"""
    ),
    ("human", "{idea}")
])


def _clamp_competitor_limit(value: int, default: int = 25) -> int:
    return max(1, min(50, value or default))


class CompanySearchService:
    def __init__(
        self,
        *,
        openai_api_key: str,
        exa_api_key: str | None,
        exa_base_url: str = "https://api.exa.ai",
        summarizer_model: str = "gpt-4o-mini",
        competitor_limit: int = 25
    ) -> None:
        self.exa_api_key = exa_api_key
        self.exa_base_url = exa_base_url
        self.competitor_limit = _clamp_competitor_limit(competitor_limit)
        self.summary_llm = ChatOpenAI(
            model=summarizer_model,
            api_key=openai_api_key,
            temperature=0
        )

    @classmethod
    def from_env(cls, openai_api_key: str) -> "CompanySearchService":
        raw_limit = os.getenv("EXA_COMPETITOR_LIMIT", "25")
        try:
            competitor_limit = int(raw_limit)
        except ValueError:
            competitor_limit = 25

        return cls(
            openai_api_key=openai_api_key,
            exa_api_key=os.getenv("EXA_API_KEY"),
            exa_base_url=os.getenv("EXA_BASE_URL", "https://api.exa.ai"),
            summarizer_model=os.getenv("OPENAI_SUMMARIZER_MODEL", "gpt-4o-mini"),
            competitor_limit=competitor_limit
        )

    async def summarize_idea_for_company_search(self, idea: str) -> str:
        logger.info("company_search.summarize.start chars=%s", len(idea or ""))
        chain = IDEA_SUMMARY_PROMPT | self.summary_llm | StrOutputParser()
        summary = (await chain.ainvoke({"idea": idea})).strip()
        summary = " ".join(summary.split())
        if summary and summary[-1] not in ".!?":
            summary += "."
        logger.info("company_search.summarize.done chars=%s", len(summary))
        return summary

    def _get_exa_headers(self) -> Dict[str, str]:
        if not self.exa_api_key:
            raise RuntimeError("EXA_API_KEY not set")
        return {
            "x-api-key": self.exa_api_key,
            "Content-Type": "application/json"
        }

    def _stringify(self, value: Any) -> str:
        if value is None:
            return ""
        if isinstance(value, str):
            return " ".join(value.split())
        if isinstance(value, list):
            return " | ".join(part for part in (self._stringify(v) for v in value) if part)
        if isinstance(value, dict):
            for key in ("text", "value", "answer", "summary", "output"):
                if key in value and value[key]:
                    return self._stringify(value[key])
            for key in ("result", "results"):
                if key in value and value[key]:
                    return self._stringify(value[key])
            return ""
        return str(value)

    def _normalize_url(self, url: str) -> str:
        normalized = (url or "").strip()
        if not normalized:
            return ""
        if normalized.startswith("http://") or normalized.startswith("https://"):
            return normalized
        return f"https://{normalized}"

    def _extract_company_name(self, item: Dict[str, Any]) -> str:
        properties = item.get("properties") if isinstance(item.get("properties"), dict) else {}
        company_obj = properties.get("company") if isinstance(properties.get("company"), dict) else {}
        return (
            self._stringify(company_obj.get("name"))
            or self._stringify(properties.get("name"))
            or self._stringify(item.get("title"))
            or "Unknown"
        )

    def _extract_company_description(self, item: Dict[str, Any]) -> str:
        properties = item.get("properties") if isinstance(item.get("properties"), dict) else {}
        return (
            self._stringify(properties.get("description"))
            or self._stringify(properties.get("summary"))
            or self._stringify(item.get("snippet"))
            or "Unknown"
        )

    def _extract_website(self, item: Dict[str, Any]) -> str:
        properties = item.get("properties") if isinstance(item.get("properties"), dict) else {}
        domain = self._stringify(properties.get("domain"))
        return (
            self._normalize_url(self._stringify(item.get("url")))
            or self._normalize_url(self._stringify(properties.get("website")))
            or self._normalize_url(domain)
            or "Unknown"
        )

    def _extract_enrichment_values(self, item: Dict[str, Any]) -> Dict[str, str]:
        raw_enrichments = item.get("enrichments")
        if isinstance(raw_enrichments, dict):
            enrichments = raw_enrichments.get("data") if isinstance(raw_enrichments.get("data"), list) else list(raw_enrichments.values())
        elif isinstance(raw_enrichments, list):
            enrichments = raw_enrichments
        else:
            enrichments = []

        values: Dict[str, str] = {}
        for index, (field_name, _) in enumerate(EXA_ENRICHMENTS):
            value = self._stringify(enrichments[index]) if index < len(enrichments) else ""
            values[field_name] = value or "Unknown"
        return values

    async def _create_company_webset(self, client: httpx.AsyncClient, search_sentence: str, limit: int) -> str:
        logger.info("company_search.webset.create.start limit=%s", limit)
        payload = {
            "search": {
                "query": f"Find direct competitors for this startup idea: {search_sentence}",
                "count": limit,
                "entity": {"type": "company"}
            },
            "enrichments": [
                {"description": description, "format": "text"}
                for _, description in EXA_ENRICHMENTS
            ]
        }

        response = await client.post(
            f"{self.exa_base_url}/websets/v0/websets",
            json=payload,
            headers=self._get_exa_headers()
        )
        response.raise_for_status()
        data = response.json()

        webset_id = data.get("id") or data.get("websetId")
        if not webset_id:
            webset = data.get("webset") if isinstance(data.get("webset"), dict) else {}
            webset_id = webset.get("id")
        if not webset_id:
            raise RuntimeError("Exa response did not include a webset id")
        logger.info("company_search.webset.create.done webset_id=%s", webset_id)
        return webset_id

    async def _wait_for_webset_idle(self, client: httpx.AsyncClient, webset_id: str, timeout_seconds: int = 90) -> None:
        deadline = time.monotonic() + timeout_seconds
        logger.info("company_search.webset.wait.start webset_id=%s timeout=%s", webset_id, timeout_seconds)
        while time.monotonic() < deadline:
            response = await client.get(
                f"{self.exa_base_url}/websets/v0/websets/{webset_id}",
                headers=self._get_exa_headers()
            )
            response.raise_for_status()
            data = response.json()

            status = self._stringify(data.get("status")).lower()
            if not status:
                webset = data.get("webset") if isinstance(data.get("webset"), dict) else {}
                status = self._stringify(webset.get("status")).lower()

            if status in {"idle", "done", "completed"}:
                logger.info("company_search.webset.wait.done webset_id=%s status=%s", webset_id, status)
                return
            if status in {"failed", "error", "cancelled"}:
                raise RuntimeError(f"Exa webset finished with status: {status}")

            logger.debug("company_search.webset.wait.poll webset_id=%s status=%s", webset_id, status or "unknown")
            await asyncio.sleep(2)

        raise TimeoutError("Timed out while waiting for Exa webset to complete")

    async def _fetch_webset_items(self, client: httpx.AsyncClient, webset_id: str, limit: int) -> List[Dict[str, Any]]:
        logger.info("company_search.items.fetch.start webset_id=%s limit=%s", webset_id, limit)
        items: List[Dict[str, Any]] = []
        offset = 0

        while len(items) < limit:
            response = await client.get(
                f"{self.exa_base_url}/websets/v0/websets/{webset_id}/items",
                params={"limit": min(100, limit - len(items)), "offset": offset},
                headers=self._get_exa_headers()
            )
            response.raise_for_status()
            data = response.json()

            batch = data.get("data") if isinstance(data.get("data"), list) else data.get("items")
            if not isinstance(batch, list) or not batch:
                break

            for item in batch:
                if isinstance(item, dict):
                    items.append(item)
                    if len(items) >= limit:
                        break

            next_offset = data.get("nextOffset")
            if next_offset is None:
                break
            offset = int(next_offset)

        logger.info("company_search.items.fetch.done webset_id=%s count=%s", webset_id, len(items[:limit]))
        return items[:limit]

    def _format_competitor(self, item: Dict[str, Any], rank: int) -> Dict[str, Any]:
        enrichment_values = self._extract_enrichment_values(item)
        return {
            "rank": rank,
            "company_name": self._extract_company_name(item),
            "website": self._extract_website(item),
            "description": self._extract_company_description(item),
            "company_differentiator": enrichment_values["company_differentiator"],
            "funding": enrichment_values["funding"],
            "revenue": enrichment_values["revenue"],
            "employees": enrichment_values["employees"],
            "founded_year": enrichment_values["founded_year"],
            "target_customer": enrichment_values["target_customer"],
            "headquarters": enrichment_values["headquarters"]
        }

    async def find_top_competitors_for_idea(self, idea: str, limit: int | None = None) -> Dict[str, Any]:
        safe_limit = _clamp_competitor_limit(limit or self.competitor_limit)
        start_time = time.monotonic()
        logger.info("company_search.run.start limit=%s exa_enabled=%s", safe_limit, bool(self.exa_api_key))
        search_sentence = await self.summarize_idea_for_company_search(idea)

        if not self.exa_api_key:
            logger.warning("company_search.run.disabled reason=missing_exa_api_key")
            return {
                "status": "disabled",
                "search_sentence": search_sentence,
                "competitors": [],
                "error": "EXA_API_KEY not configured"
            }

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                webset_id = await self._create_company_webset(client, search_sentence, safe_limit)
                await self._wait_for_webset_idle(client, webset_id)
                items = await self._fetch_webset_items(client, webset_id, safe_limit)
        except Exception:
            logger.exception("company_search.run.failed")
            raise

        competitors = [self._format_competitor(item, index + 1) for index, item in enumerate(items)]
        elapsed = round(time.monotonic() - start_time, 3)
        logger.info(
            "company_search.run.done competitors=%s elapsed_seconds=%s",
            len(competitors),
            elapsed
        )
        return {
            "status": "completed",
            "search_sentence": search_sentence,
            "webset_id": webset_id,
            "competitors": competitors
        }


def _configure_logging(level_name: str) -> None:
    level = getattr(logging, level_name.upper(), logging.INFO)
    logging.basicConfig(
        level=level,
        format="%(asctime)s %(levelname)s [%(name)s] %(message)s"
    )


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="company_search",
        description="Run competitor discovery for a startup idea."
    )
    parser.add_argument("idea", help="Startup idea text to analyze.")
    parser.add_argument("--limit", type=int, default=None, help="Override competitor result limit.")
    parser.add_argument("--log-level", default="INFO", help="Logging level (DEBUG, INFO, WARNING, ERROR).")
    return parser


def cli_main() -> int:
    parser = _build_parser()
    args = parser.parse_args()

    _configure_logging(args.log_level)
    load_dotenv()

    openai_api_key = os.getenv("OPENAI_API_KEY")
    if not openai_api_key:
        logger.error("OPENAI_API_KEY is required to run company_search CLI")
        return 1

    service = CompanySearchService.from_env(openai_api_key)
    try:
        result = asyncio.run(service.find_top_competitors_for_idea(args.idea, limit=args.limit))
    except Exception:
        logger.exception("company_search.cli.failed")
        return 1

    print(json.dumps(result, indent=2, ensure_ascii=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(cli_main())
