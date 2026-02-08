import asyncio
import argparse
import json
import logging
import math
import os
import re
from datetime import datetime, timezone
from html import unescape
from typing import Any, Dict, List, Optional, Tuple

import httpx
from dotenv import load_dotenv


logger = logging.getLogger(__name__)


PAIN_KEYWORDS = {
    "pain", "problem", "struggle", "hard", "difficult", "broken", "frustrating",
    "friction", "annoying", "slow", "expensive", "manual", "waste", "inefficient",
    "workaround", "clunky", "hate", "stuck"
}

INTENT_KEYWORDS = {
    "looking for", "need", "wish", "trying to find", "any tool", "recommend",
    "does anyone use", "what do you use", "searching for", "help with"
}

BUYING_KEYWORDS = {
    "would pay", "willing to pay", "budget", "pricing", "price", "subscription",
    "paid", "buy", "purchase", "cost", "invoice"
}

SWITCH_KEYWORDS = {
    "alternative", "switch", "migrate", "replace", "competitor", "leaving", "churn"
}


def _to_iso(ts: Optional[float]) -> Optional[str]:
    if ts is None:
        return None
    try:
        return datetime.fromtimestamp(float(ts), tz=timezone.utc).isoformat()
    except (TypeError, ValueError, OSError):
        return None


def _safe_int(value: Any, default: int = 0) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _strip_html(text: str) -> str:
    if not text:
        return ""
    no_tags = re.sub(r"<[^>]+>", " ", text)
    return " ".join(unescape(no_tags).split())


def _compact(text: str) -> str:
    return " ".join((text or "").split())


def _contains_any_phrase(text: str, phrases: set[str]) -> int:
    lower = text.lower()
    return sum(1 for phrase in phrases if phrase in lower)


def _snippet(text: str, max_len: int = 180) -> str:
    clean = _compact(text)
    if len(clean) <= max_len:
        return clean
    return f"{clean[: max_len - 3]}..."


class SocialSignalsService:
    def __init__(
        self,
        *,
        x_bearer_token: Optional[str] = None,
        reddit_user_agent: str = "startup-signal-research/1.0",
        timeout_seconds: float = 25.0,
        default_limit_per_source: int = 25,
        include_hacker_news: bool = True
    ) -> None:
        self.x_bearer_token = x_bearer_token
        self.reddit_user_agent = reddit_user_agent
        self.timeout_seconds = timeout_seconds
        self.default_limit_per_source = max(1, min(100, default_limit_per_source))
        self.include_hacker_news = include_hacker_news

    @classmethod
    def from_env(cls) -> "SocialSignalsService":
        raw_limit = os.getenv("SOCIAL_SIGNAL_LIMIT_PER_SOURCE", "25")
        try:
            limit = int(raw_limit)
        except ValueError:
            limit = 25

        include_hn_raw = os.getenv("SOCIAL_SIGNAL_INCLUDE_HN", "true").strip().lower()
        include_hn = include_hn_raw not in {"false", "0", "no"}

        return cls(
            x_bearer_token=os.getenv("X_BEARER_TOKEN"),
            reddit_user_agent=os.getenv("REDDIT_USER_AGENT", "startup-signal-research/1.0"),
            timeout_seconds=float(os.getenv("SOCIAL_SIGNAL_TIMEOUT_SECONDS", "25")),
            default_limit_per_source=limit,
            include_hacker_news=include_hn
        )

    async def search_reddit_posts(self, space_query: str, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        take = max(1, min(100, limit or self.default_limit_per_source))
        logger.info("social_signals.reddit.search.start limit=%s", take)
        params = {
            "q": space_query,
            "sort": "top",
            "t": "year",
            "limit": take,
            "type": "link,sr"
        }
        headers = {"User-Agent": self.reddit_user_agent}

        async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
            response = await client.get("https://www.reddit.com/search.json", params=params, headers=headers)
            response.raise_for_status()
            payload = response.json()

        if isinstance(payload, dict):
            children = payload.get("data", {}).get("children", [])
        elif isinstance(payload, list):
            children = []
            for item in payload:
                if isinstance(item, dict):
                    children.extend(item.get("data", {}).get("children", []))
            logger.warning("social_signals.reddit.search.payload_list items=%s", len(payload))
        else:
            children = []
            logger.warning("social_signals.reddit.search.payload_unexpected type=%s", type(payload).__name__)

        results: List[Dict[str, Any]] = []
        for child in children:
            data = child.get("data", {})
            text = _compact(f"{data.get('title', '')} {data.get('selftext', '')}")
            permalink = data.get("permalink")
            url = f"https://www.reddit.com{permalink}" if permalink else data.get("url")

            upvotes = _safe_int(data.get("ups"))
            comments = _safe_int(data.get("num_comments"))
            engagement = upvotes + comments

            results.append({
                "source": "reddit",
                "id": data.get("id"),
                "title": _compact(data.get("title", "")),
                "text": text,
                "url": url,
                "author": data.get("author"),
                "community": data.get("subreddit_name_prefixed"),
                "created_at": _to_iso(data.get("created_utc")),
                "engagement": engagement,
                "upvotes": upvotes,
                "comments": comments
            })
        logger.info("social_signals.reddit.search.done count=%s", len(results))
        return results

    async def search_x_posts(self, space_query: str, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        if not self.x_bearer_token:
            logger.warning("social_signals.x.search.disabled reason=missing_x_bearer_token")
            return []

        take = max(10, min(100, limit or self.default_limit_per_source))
        logger.info("social_signals.x.search.start limit=%s", take)
        headers = {"Authorization": f"Bearer {self.x_bearer_token}"}
        query = f"({space_query}) -is:retweet lang:en"
        params = {
            "query": query,
            "max_results": min(100, take),
            "tweet.fields": "created_at,public_metrics,lang,author_id",
            "expansions": "author_id",
            "user.fields": "username,name"
        }

        async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
            response = await client.get(
                "https://api.twitter.com/2/tweets/search/recent",
                params=params,
                headers=headers
            )
            response.raise_for_status()
            payload = response.json()

        users = {
            user.get("id"): user
            for user in payload.get("includes", {}).get("users", [])
            if isinstance(user, dict)
        }

        results: List[Dict[str, Any]] = []
        for item in payload.get("data", []):
            metrics = item.get("public_metrics", {}) or {}
            author_id = item.get("author_id")
            user = users.get(author_id, {})
            username = user.get("username")
            if username:
                url = f"https://x.com/{username}/status/{item.get('id')}"
            else:
                url = f"https://x.com/i/web/status/{item.get('id')}"

            likes = _safe_int(metrics.get("like_count"))
            replies = _safe_int(metrics.get("reply_count"))
            reposts = _safe_int(metrics.get("retweet_count"))
            quotes = _safe_int(metrics.get("quote_count"))
            engagement = likes + replies + reposts + quotes

            text = _compact(item.get("text", ""))
            results.append({
                "source": "x",
                "id": item.get("id"),
                "title": None,
                "text": text,
                "url": url,
                "author": username or user.get("name") or author_id,
                "community": "x",
                "created_at": item.get("created_at"),
                "engagement": engagement,
                "likes": likes,
                "replies": replies,
                "reposts": reposts,
                "quotes": quotes
            })

        logger.info("social_signals.x.search.done count=%s", len(results[:take]))
        return results[:take]

    async def search_hacker_news_posts(self, space_query: str, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        take = max(1, min(100, limit or self.default_limit_per_source))
        logger.info("social_signals.hn.search.start limit=%s", take)
        params = {
            "query": space_query,
            "tags": "story,comment",
            "hitsPerPage": take
        }

        async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
            response = await client.get("https://hn.algolia.com/api/v1/search", params=params)
            response.raise_for_status()
            payload = response.json()

        results: List[Dict[str, Any]] = []
        for hit in payload.get("hits", []):
            text = _strip_html(hit.get("comment_text") or hit.get("story_text") or "")
            title = _compact(hit.get("title") or hit.get("story_title") or "")
            if not text and title:
                text = title

            points = _safe_int(hit.get("points"))
            num_comments = _safe_int(hit.get("num_comments"))
            engagement = points + num_comments
            url = hit.get("url") or hit.get("story_url")
            if not url and hit.get("objectID"):
                url = f"https://news.ycombinator.com/item?id={hit.get('objectID')}"

            results.append({
                "source": "hackernews",
                "id": hit.get("objectID"),
                "title": title or None,
                "text": _compact(text),
                "url": url,
                "author": hit.get("author"),
                "community": "hackernews",
                "created_at": hit.get("created_at"),
                "engagement": engagement,
                "points": points,
                "comments": num_comments
            })
        logger.info("social_signals.hn.search.done count=%s", len(results))
        return results

    def _score_post_signal(self, post: Dict[str, Any]) -> Dict[str, Any]:
        text = f"{post.get('title') or ''} {post.get('text') or ''}".strip()
        pain_hits = _contains_any_phrase(text, PAIN_KEYWORDS)
        intent_hits = _contains_any_phrase(text, INTENT_KEYWORDS)
        buying_hits = _contains_any_phrase(text, BUYING_KEYWORDS)
        switch_hits = _contains_any_phrase(text, SWITCH_KEYWORDS)

        engagement = _safe_int(post.get("engagement"))
        engagement_boost = min(0.25, math.log1p(max(0, engagement)) / 18)

        raw_score = (
            (0.35 * min(1.0, pain_hits / 2))
            + (0.25 * min(1.0, intent_hits / 2))
            + (0.25 * min(1.0, buying_hits / 1))
            + (0.15 * min(1.0, switch_hits / 1))
            + engagement_boost
        )
        score = min(1.0, raw_score)

        labels: List[str] = []
        if pain_hits > 0:
            labels.append("pain")
        if intent_hits > 0:
            labels.append("intent")
        if buying_hits > 0:
            labels.append("buying")
        if switch_hits > 0:
            labels.append("switch")

        return {
            **post,
            "signal_score": round(score, 4),
            "signal_labels": labels,
            "pain_hits": pain_hits,
            "intent_hits": intent_hits,
            "buying_hits": buying_hits,
            "switch_hits": switch_hits
        }

    def _aggregate_pmf_signals(self, scored_posts: List[Dict[str, Any]], statuses: Dict[str, str]) -> Dict[str, Any]:
        if not scored_posts:
            return {
                "pmf_signal_score": 0,
                "signal_level": "insufficient_data",
                "summary": "No social signal posts were collected.",
                "counts": {
                    "total_posts": 0,
                    "pain_posts": 0,
                    "intent_posts": 0,
                    "buying_posts": 0,
                    "switch_posts": 0
                },
                "source_status": statuses,
                "top_pain_snippets": []
            }

        total = len(scored_posts)
        pain_posts = sum(1 for post in scored_posts if post["pain_hits"] > 0)
        intent_posts = sum(1 for post in scored_posts if post["intent_hits"] > 0)
        buying_posts = sum(1 for post in scored_posts if post["buying_hits"] > 0)
        switch_posts = sum(1 for post in scored_posts if post["switch_hits"] > 0)
        avg_signal = sum(post["signal_score"] for post in scored_posts) / total

        coverage = sum(1 for status in statuses.values() if status == "completed") / max(1, len(statuses))
        confidence = min(1.0, (total / 40)) * coverage

        pmf_score = int(round(100 * (0.7 * avg_signal + 0.3 * confidence)))

        if pmf_score >= 70:
            level = "strong"
        elif pmf_score >= 45:
            level = "moderate"
        else:
            level = "weak"

        top_pain_posts = sorted(
            (post for post in scored_posts if post["pain_hits"] > 0),
            key=lambda post: (post["signal_score"], _safe_int(post.get("engagement"))),
            reverse=True
        )[:8]

        top_pain_snippets = [
            {
                "source": post.get("source"),
                "url": post.get("url"),
                "snippet": _snippet(post.get("text", "")),
                "signal_score": post.get("signal_score")
            }
            for post in top_pain_posts
            if post.get("text")
        ]

        summary = (
            f"Collected {total} posts with {pain_posts} pain mentions, "
            f"{intent_posts} solution-intent mentions, and {buying_posts} buying signals."
        )

        return {
            "pmf_signal_score": pmf_score,
            "signal_level": level,
            "summary": summary,
            "counts": {
                "total_posts": total,
                "pain_posts": pain_posts,
                "intent_posts": intent_posts,
                "buying_posts": buying_posts,
                "switch_posts": switch_posts
            },
            "source_status": statuses,
            "top_pain_snippets": top_pain_snippets
        }

    async def collect_customer_voice_signals(
        self,
        space_query: str,
        *,
        limit_per_source: Optional[int] = None,
        include_hacker_news: Optional[bool] = None
    ) -> Dict[str, Any]:
        take = max(1, min(100, limit_per_source or self.default_limit_per_source))
        use_hn = self.include_hacker_news if include_hacker_news is None else include_hacker_news
        logger.info("social_signals.collect.start limit_per_source=%s include_hn=%s", take, use_hn)

        tasks: List[Tuple[str, asyncio.Future]] = [
            ("reddit", asyncio.create_task(self.search_reddit_posts(space_query, take))),
            ("x", asyncio.create_task(self.search_x_posts(space_query, take)))
        ]
        if use_hn:
            tasks.append(("hackernews", asyncio.create_task(self.search_hacker_news_posts(space_query, take))))

        statuses: Dict[str, str] = {}
        all_posts: List[Dict[str, Any]] = []
        errors: Dict[str, str] = {}

        for source, task in tasks:
            try:
                posts = await task
                if source == "x" and not self.x_bearer_token:
                    statuses[source] = "disabled"
                else:
                    statuses[source] = "completed"
                all_posts.extend(posts)
            except Exception as exc:
                statuses[source] = "error"
                errors[source] = str(exc)
                logger.exception("social_signals.collect.source_failed source=%s", source)

        scored_posts = [self._score_post_signal(post) for post in all_posts]
        scored_posts.sort(
            key=lambda post: (post["signal_score"], _safe_int(post.get("engagement"))),
            reverse=True
        )

        insights = self._aggregate_pmf_signals(scored_posts, statuses)
        logger.info(
            "social_signals.collect.done posts=%s score=%s level=%s",
            len(scored_posts),
            insights.get("pmf_signal_score"),
            insights.get("signal_level")
        )
        return {
            "space_query": space_query,
            "posts": scored_posts,
            "insights": insights,
            "errors": errors or None
        }

    async def summarize_customer_voice_signals(
        self,
        space_query: str,
        *,
        limit_per_source: Optional[int] = None,
        include_hacker_news: Optional[bool] = None
    ) -> str:
        result = await self.collect_customer_voice_signals(
            space_query,
            limit_per_source=limit_per_source,
            include_hacker_news=include_hacker_news
        )
        insights = result.get("insights", {}) or {}
        counts = insights.get("counts", {}) or {}
        source_status = insights.get("source_status", {}) or {}
        errors = result.get("errors") or {}

        score = insights.get("pmf_signal_score", 0)
        level = insights.get("signal_level", "insufficient_data")

        status_summary = ", ".join(f"{source}:{status}" for source, status in source_status.items())
        if not status_summary:
            status_summary = "no_sources"

        top_snippets = insights.get("top_pain_snippets", []) or []
        top_references = []
        for item in top_snippets[:3]:
            snippet = _snippet(item.get("snippet", ""), max_len=120)
            if snippet:
                top_references.append(snippet)
        top_references_text = " | ".join(top_references) if top_references else "No clear high-confidence pain snippets captured."

        if level == "insufficient_data":
            summary = (
                "Customer-voice PMF signal is insufficient because social data collection returned too few results; "
                f"source status: {status_summary}."
            )
            logger.info("social_signals.summary.done level=%s score=%s", level, score)
            return summary

        base_summary = (
            f"Customer-voice PMF signal is {level} ({score}/100) from {counts.get('total_posts', 0)} posts, "
            f"with {counts.get('pain_posts', 0)} pain mentions, {counts.get('intent_posts', 0)} solution-intent mentions, "
            f"and {counts.get('buying_posts', 0)} buying signals; source status: {status_summary}."
        )

        if errors:
            error_summary = "; ".join(f"{source}: {error}" for source, error in errors.items())
            summary = f"{base_summary} Source errors: {error_summary}. Top pain references: {top_references_text}"
            logger.info("social_signals.summary.done level=%s score=%s has_errors=true", level, score)
            return summary

        summary = f"{base_summary} Top pain references: {top_references_text}"
        logger.info("social_signals.summary.done level=%s score=%s has_errors=false", level, score)
        return summary


def _configure_logging(level_name: str) -> None:
    level = getattr(logging, level_name.upper(), logging.INFO)
    logging.basicConfig(
        level=level,
        format="%(asctime)s %(levelname)s [%(name)s] %(message)s"
    )


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="social_signal",
        description="Run social signal collection for a startup idea."
    )
    parser.add_argument("idea", help="Startup idea text to analyze.")
    parser.add_argument("--limit-per-source", type=int, default=None, help="Override per-source result limit.")
    parser.add_argument("--summary-only", action="store_true", help="Output only summarized PMF signal text.")
    parser.add_argument("--exclude-hn", action="store_true", help="Exclude Hacker News from collection.")
    parser.add_argument("--log-level", default="INFO", help="Logging level (DEBUG, INFO, WARNING, ERROR).")
    return parser


def cli_main() -> int:
    parser = _build_parser()
    args = parser.parse_args()

    _configure_logging(args.log_level)
    load_dotenv()

    service = SocialSignalsService.from_env()
    include_hn = not args.exclude_hn
    try:
        if args.summary_only:
            result = asyncio.run(
                service.summarize_customer_voice_signals(
                    args.idea,
                    limit_per_source=args.limit_per_source,
                    include_hacker_news=include_hn
                )
            )
            print(result)
        else:
            result = asyncio.run(
                service.collect_customer_voice_signals(
                    args.idea,
                    limit_per_source=args.limit_per_source,
                    include_hacker_news=include_hn
                )
            )
            print(json.dumps(result, indent=2, ensure_ascii=True))
    except Exception:
        logger.exception("social_signals.cli.failed")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(cli_main())
