# qwen_client.py
import json
import logging
import os
import re
from typing import List, Dict, Any, AsyncGenerator, Optional
from openai import AsyncOpenAI, AuthenticationError, PermissionDeniedError
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_not_exception_type
from app.config import settings

logger = logging.getLogger("app.services.qwen_client")

# Retrying an auth/permission failure just burns time before the inevitable fallback,
# so those are treated as terminal; everything else (network, rate limit, 5xx) retries.
_NON_RETRYABLE = (AuthenticationError, PermissionDeniedError)

_JSON_FENCE_RE = re.compile(r"^```(?:json)?\s*|\s*```$", re.IGNORECASE)


def _strip_json_fences(content: str) -> str:
    """Removes markdown code fences that models sometimes wrap JSON in."""
    text = (content or "").strip()
    if text.startswith("```"):
        text = _JSON_FENCE_RE.sub("", text).strip()
    return text

class QwenClient:
    """Wrapper around the Qwen Cloud OpenAI-compatible API."""
    
    def __init__(self):
        # We fetch API key from environment, fallback to setting if not set
        api_key = os.getenv("DASHSCOPE_API_KEY") or settings.DASHSCOPE_API_KEY
        base_url = settings.QWEN_BASE_URL
        
        if not api_key:
            logger.warning("DASHSCOPE_API_KEY is not set. API calls will fail, falling back to mock data.")
            api_key = "dummy-api-key-for-fallback"
            
        self.client = AsyncOpenAI(
            api_key=api_key,
            base_url=base_url
        )
        
        # Token usage trackers
        self.total_input_tokens = 0
        self.total_output_tokens = 0

    def get_token_usage(self) -> Dict[str, int]:
        """Returns cumulative token usage metrics."""
        return {
            "input_tokens": self.total_input_tokens,
            "output_tokens": self.total_output_tokens,
            "total_tokens": self.total_input_tokens + self.total_output_tokens
        }

    def _track_usage(self, usage: Any):
        """Helper to track token usage from API responses."""
        if usage:
            self.total_input_tokens += getattr(usage, "prompt_tokens", 0)
            self.total_output_tokens += getattr(usage, "completion_tokens", 0)

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_not_exception_type(_NON_RETRYABLE),
        reraise=True
    )
    async def chat(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        temperature: float = 0.0,
        json_mode: bool = False
    ) -> str:
        """General text completion endpoint with optional JSON mode."""
        model_id = model or settings.QWEN_PLUS_MODEL
        logger.info(f"Calling Qwen model {model_id} (JSON mode: {json_mode})")
        
        kwargs = {
            "model": model_id,
            "messages": messages,
            "temperature": temperature
        }
        
        if json_mode:
            kwargs["response_format"] = {"type": "json_object"}

        try:
            response = await self.client.chat.completions.create(**kwargs)
            self._track_usage(response.usage)
            return response.choices[0].message.content
        except Exception as e:
            logger.error(f"Error calling Qwen API: {e}")
            raise

    async def chat_json(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None
    ) -> Dict[str, Any]:
        """Convenience method that calls Qwen in JSON mode and parses the result."""
        content = await self.chat(messages, model=model, json_mode=True)
        cleaned = _strip_json_fences(content)
        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            # Last resort: pull the first balanced-looking JSON object out of the text.
            match = re.search(r"\{.*\}", cleaned, re.DOTALL)
            if match:
                try:
                    return json.loads(match.group(0))
                except json.JSONDecodeError:
                    pass
            logger.error(f"Failed to parse JSON response from Qwen. Raw content: {content}")
            raise ValueError(f"Qwen response was not valid JSON: {content}")

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_not_exception_type(_NON_RETRYABLE),
        reraise=True
    )
    async def chat_with_tools(
        self,
        messages: List[Dict[str, str]],
        tools: List[Dict[str, Any]],
        model: Optional[str] = None,
        tool_choice: str = "auto"
    ) -> Any:
        """Calls Qwen with function calling configuration."""
        model_id = model or settings.QWEN_MAX_MODEL  # Tools work best on max
        logger.info(f"Calling Qwen model {model_id} with tools")
        
        try:
            response = await self.client.chat.completions.create(
                model=model_id,
                messages=messages,
                tools=tools,
                tool_choice=tool_choice,
                temperature=0.0
            )
            self._track_usage(response.usage)
            return response.choices[0].message
        except Exception as e:
            logger.error(f"Error calling Qwen API with tools: {e}")
            raise

    async def stream_chat(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        temperature: float = 0.0
    ) -> AsyncGenerator[str, None]:
        """Streams responses token by token."""
        model_id = model or settings.QWEN_PLUS_MODEL
        logger.info(f"Streaming Qwen model {model_id}")
        
        try:
            stream = await self.client.chat.completions.create(
                model=model_id,
                messages=messages,
                temperature=temperature,
                stream=True
            )
            async for chunk in stream:
                if chunk.choices and chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
        except Exception as e:
            logger.error(f"Error in Qwen stream: {e}")
            raise

# Global singleton client
qwen_client = QwenClient()
