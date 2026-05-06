import array
import asyncio
import json
import logging
import math
import os
import ssl
import certifi
from typing import Optional

from dotenv import load_dotenv

# Patch SSL before any network import
_orig_ssl = ssl.create_default_context
def _certifi_ssl(purpose=ssl.Purpose.SERVER_AUTH, **kwargs):
    if not kwargs.get("cafile") and not kwargs.get("capath") and not kwargs.get("cadata"):
        kwargs["cafile"] = certifi.where()
    return _orig_ssl(purpose, **kwargs)
ssl.create_default_context = _certifi_ssl

from livekit import agents, api, rtc
from livekit.agents import Agent, AgentSession, RoomInputOptions
from livekit.plugins import noise_cancellation, silero

from db import init_db, log_error, get_enabled_tools
from prompts import build_prompt
from tools import AppointmentTools

load_dotenv(".env", override=False)  # VPS env vars always take priority
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("outbound-agent")

# ── Import plugins ───────────────────────────────────────────────────────────
_openai_llm = None
_sarvam_stt = None
_sarvam_tts = None

try:
    from livekit.plugins import openai as _oai
    _openai_llm = _oai.LLM
    logger.info("Loaded livekit-plugins-openai")
except ImportError:
    logger.warning("livekit-plugins-openai not installed")

try:
    from livekit.plugins import sarvam as _sv
    _sarvam_stt = _sv.STT
    _sarvam_tts = _sv.TTS
    logger.info("Loaded livekit-plugins-sarvam (STT + TTS)")
except ImportError:
    logger.warning("livekit-plugins-sarvam not installed")


async def _log(level, msg, detail=""):
    if level == "info":      logger.info(msg)
    elif level == "warning": logger.warning(msg)
    else:                    logger.error(msg)
    try:
        await log_error("agent", msg, detail, level)
    except Exception:
        pass


def load_db_settings_to_env():
    """Load Supabase settings table into os.environ before worker starts."""
    url = os.getenv("SUPABASE_URL", "")
    key = os.getenv("SUPABASE_SERVICE_KEY", "")
    if not url or not key:
        return
    try:
        from supabase import create_client
        client = create_client(url, key)
        result = client.table("settings").select("key, value").execute()
        for row in (result.data or []):
            if row.get("value"):
                os.environ[row["key"]] = row["value"]
    except Exception as exc:
        logger.warning("Could not load settings from Supabase: %s", exc)


def _build_session(
    tools: list,
    system_prompt: str,
    vad_instance=None,
    voice_override: Optional[str] = None,
    model_override: Optional[str] = None,
) -> AgentSession:
    """Build AgentSession with OpenAI LLM + Sarvam STT/TTS pipeline."""
    openai_model = model_override or os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    sarvam_stt_model = os.getenv("SARVAM_STT_MODEL", "saaras:v3")
    sarvam_tts_model = os.getenv("SARVAM_TTS_MODEL", "bulbul:v3")
    sarvam_speaker = os.getenv("SARVAM_TTS_SPEAKER", "anushka")
    sarvam_language = os.getenv("SARVAM_LANGUAGE", "en-IN")

    # Use per-call override directly — avoids mutating global os.environ
    effective_speaker = voice_override or sarvam_speaker

    logger.info("SESSION MODE: Pipeline (Sarvam STT + OpenAI %s + Sarvam TTS voice=%s)", openai_model, effective_speaker)

    if _openai_llm is None:
        raise RuntimeError("livekit-plugins-openai not installed. Run: pip install livekit-plugins-openai")

    llm_instance = _openai_llm(model=openai_model)

    stt_instance = None
    if _sarvam_stt:
        stt_instance = _sarvam_stt(model=sarvam_stt_model, language=sarvam_language)
    else:
        logger.warning("Sarvam STT not available — no STT configured")

    tts_instance = None
    if _sarvam_tts:
        tts_instance = _sarvam_tts(model=sarvam_tts_model, speaker=effective_speaker, target_language_code=sarvam_language)
    else:
        logger.warning("Sarvam TTS not available — no TTS configured")

    # Tuned VAD — use pre-warmed instance or load with fast settings as fallback
    if vad_instance:
        vad = vad_instance
    else:
        vad = silero.VAD.load(
            min_silence_duration=0.4,
            activation_threshold=0.5,
            min_speech_duration=0.05,
            max_buffered_speech=45.0,
        )

    return AgentSession(
        stt=stt_instance, llm=llm_instance, tts=tts_instance,
        vad=vad, tools=tools,
        # Reduce perceived latency:
        #   min_endpointing_delay — wait at least this long after speech before sending to LLM
        #   allow_interruptions    — let the lead cut off the AI mid-sentence
        min_endpointing_delay=0.4,
        allow_interruptions=True,
    )


async def _play_hold_tone(ctx: agents.JobContext, duration_s: float = 2.0) -> None:
    """Publish a soft dual-tone hold signal into the LiveKit room immediately on pickup.

    Generates a 440Hz + 480Hz sine blend (classic telephone "please hold" tone)
    as raw 16-bit PCM and publishes it via a LiveKit LocalAudioTrack.  The track
    is unpublished automatically once the tone finishes.

    This runs concurrently with session.start() so the lead never hears dead silence
    while the AI pipeline initialises.
    """
    SAMPLE_RATE = 8000   # 8 kHz — matches telephony
    CHANNELS    = 1
    FRAME_MS    = 20     # 20 ms frames — standard VoIP packet size

    samples_per_frame = SAMPLE_RATE * FRAME_MS // 1000
    total_samples = int(SAMPLE_RATE * duration_s)

    source = rtc.AudioSource(sample_rate=SAMPLE_RATE, num_channels=CHANNELS)
    track  = rtc.LocalAudioTrack.create_audio_track("hold-tone", source)

    try:
        pub_opts = rtc.TrackPublishOptions(source=rtc.TrackSource.SOURCE_MICROPHONE)
        publication = await ctx.room.local_participant.publish_track(track, pub_opts)
        logger.info("🎵 Hold tone started")

        samples_sent = 0
        while samples_sent < total_samples:
            chunk = min(samples_per_frame, total_samples - samples_sent)
            buf = array.array("h")  # signed 16-bit integers
            for i in range(chunk):
                t = (samples_sent + i) / SAMPLE_RATE
                # Blend two sine waves at -12 dBFS to stay soft and non-intrusive
                val = (math.sin(2 * math.pi * 440 * t) +
                       math.sin(2 * math.pi * 480 * t)) * 0.25
                buf.append(int(val * 32767))
            frame = rtc.AudioFrame(
                data=buf.tobytes(),
                sample_rate=SAMPLE_RATE,
                num_channels=CHANNELS,
                samples_per_channel=chunk,
            )
            await source.capture_frame(frame)
            samples_sent += chunk

        logger.info("🎵 Hold tone finished")
    except Exception as exc:
        logger.warning("Hold tone failed (non-fatal): %s", exc)
    finally:
        try:
            await ctx.room.local_participant.unpublish_track(publication.sid)
        except Exception:
            pass


class OutboundAssistant(Agent):
    def __init__(self, instructions: str) -> None:
        super().__init__(instructions=instructions)


def prewarm(proc: agents.JobProcess) -> None:
    """Pre-warm expensive resources once per worker process.

    Called by LiveKit before the worker accepts its first job.
    Stored values in proc.userdata are reused across all jobs in this worker.

    Warms up:
    - Silero VAD  : eliminates 8–15s ONNX model load on first call
    - Sarvam TTS  : fires a dummy synthesis so the first real utterance isn't cold
    """
    # Tuned for lower latency:
    #   min_silence_duration  — how quickly silence triggers end-of-speech (default 600ms → 400ms)
    #   activation_threshold  — confidence needed to start speech (lower = faster)
    #   min_speech_duration   — minimum speech length before VAD fires (default 250ms → 50ms)
    #   max_buffered_speech   — cap buffered audio to reduce processing lag
    proc.userdata["vad"] = silero.VAD.load(
        min_silence_duration=0.4,
        activation_threshold=0.5,
        min_speech_duration=0.05,
        max_buffered_speech=45.0,
    )
    logger.info("✅ Silero VAD pre-warmed (low-latency config)")

    # Warm up Sarvam TTS — the first synthesis call is always 1-3s slower because
    # the plugin needs to establish its HTTP connection pool and JIT-compile codecs.
    # A no-op synthesis here pays that cost before any real call.
    if _sarvam_tts:
        try:
            sarvam_tts_model  = os.getenv("SARVAM_TTS_MODEL", "bulbul:v3")
            sarvam_speaker    = os.getenv("SARVAM_TTS_SPEAKER", "anushka")
            sarvam_language   = os.getenv("SARVAM_LANGUAGE", "en-IN")
            _warmup_tts = _sarvam_tts(
                model=sarvam_tts_model,
                speaker=sarvam_speaker,
                target_language_code=sarvam_language,
            )
            # Synthesize a single space — minimal tokens, just wakes the connection
            async for _ in _warmup_tts.synthesize(" "):
                break
            logger.info("✅ Sarvam TTS pre-warmed")
        except Exception as exc:
            logger.warning("Sarvam TTS warmup failed (non-fatal): %s", exc)


async def entrypoint(ctx: agents.JobContext) -> None:
    """
    Main entrypoint — called per job.

    DIAL-FIRST PATTERN:
    Dial via SIP BEFORE starting the AI session. wait_until_answered=True blocks
    until the call is actually picked up, preventing session timeout during ring.

    NO close_on_disconnect — SIP legs have brief audio dropouts.
    Watch participant_disconnected event for the specific SIP identity instead.
    """
    await _log("info", f"Job started — room: {ctx.room.name}")

    phone_number: Optional[str] = None
    lead_name = "there"
    business_name = "our company"
    service_type = "our service"
    custom_prompt: Optional[str] = None
    voice_override: Optional[str] = None
    model_override: Optional[str] = None
    tools_override: Optional[str] = None

    if ctx.job.metadata:
        try:
            data = json.loads(ctx.job.metadata)
            phone_number   = data.get("phone_number")
            lead_name      = data.get("lead_name", lead_name)
            business_name  = data.get("business_name", business_name)
            service_type   = data.get("service_type", service_type)
            custom_prompt  = data.get("system_prompt")
            voice_override = data.get("voice_override")
            model_override = data.get("model_override")
            tools_override = data.get("tools_override")
        except (json.JSONDecodeError, AttributeError):
            await _log("warning", "Invalid JSON in job metadata")

    await _log("info", f"Call job — phone={phone_number} lead={lead_name} biz={business_name}")

    system_prompt = build_prompt(lead_name=lead_name, business_name=business_name,
                                  service_type=service_type, custom_prompt=custom_prompt)
    tool_ctx = AppointmentTools(ctx, phone_number, lead_name)

    # NOTE: voice_override and model_override are passed directly into _build_session
    # instead of mutating os.environ, which would cause voice/model bleed between
    # concurrent calls running in the same worker process.

    if tools_override:
        try:
            enabled_tools = json.loads(tools_override)
        except Exception:
            enabled_tools = await get_enabled_tools()
    else:
        enabled_tools = await get_enabled_tools()

    # ── Connect to LiveKit room ──────────────────────────────────────────────
    await ctx.connect()
    await _log("info", f"Connected to LiveKit room: {ctx.room.name}")

    # ── Dial — MUST come before session.start() ──────────────────────────────
    if phone_number:
        trunk_id = os.getenv("OUTBOUND_TRUNK_ID")
        if not trunk_id:
            await _log("error", "OUTBOUND_TRUNK_ID not set — cannot place outbound call")
            ctx.shutdown()
            return
        await _log("info", f"Dialing {phone_number} via SIP trunk {trunk_id}")
        try:
            await ctx.api.sip.create_sip_participant(
                api.CreateSIPParticipantRequest(
                    room_name=ctx.room.name,
                    sip_trunk_id=trunk_id,
                    sip_call_to=phone_number,
                    participant_identity=f"sip_{phone_number}",
                    wait_until_answered=True,
                )
            )
        except Exception as exc:
            await _log("error", f"SIP dial FAILED for {phone_number}: {exc}")
            ctx.shutdown()
            return
        await _log("info", f"Call ANSWERED — {phone_number} picked up")

        # ── Hold tone — play immediately so lead hears something while session builds ──
        # Fires as a background task so session.start() runs concurrently.
        # By the time the 2s tone finishes, the AI is almost certainly ready.
        asyncio.create_task(_play_hold_tone(ctx))

    # ── Build and start AI session ───────────────────────────────────────────
    active_tools = tool_ctx.build_tool_list(enabled_tools)
    await _log("info", f"Tools loaded: {[t.__name__ for t in active_tools]}")
    vad = ctx.proc.userdata.get("vad")  # use pre-warmed VAD; fallback handled inside _build_session
    session = _build_session(
        tools=active_tools,
        system_prompt=system_prompt,
        vad_instance=vad,
        voice_override=voice_override,
        model_override=model_override,
    )

    await session.start(
        room=ctx.room,
        agent=OutboundAssistant(instructions=system_prompt),
        room_input_options=RoomInputOptions(noise_cancellation=noise_cancellation.BVCTelephony()),
    )
    await _log("info", "Agent session started — AI ready")

    # ── Optional S3 recording ────────────────────────────────────────────────
    if phone_number:
        _aws_key    = os.getenv("S3_ACCESS_KEY_ID") or os.getenv("AWS_ACCESS_KEY_ID", "")
        _aws_secret = os.getenv("S3_SECRET_ACCESS_KEY") or os.getenv("AWS_SECRET_ACCESS_KEY", "")
        _aws_bucket = os.getenv("S3_BUCKET") or os.getenv("AWS_BUCKET_NAME", "")
        _s3_endpoint = os.getenv("S3_ENDPOINT_URL", "")
        _s3_region  = os.getenv("S3_REGION", "ap-northeast-1")
        if _aws_key and _aws_secret and _aws_bucket:
            try:
                _recording_path = f"recordings/{ctx.room.name}.ogg"
                _egress_req = api.RoomCompositeEgressRequest(
                    room_name=ctx.room.name, audio_only=True,
                    file_outputs=[api.EncodedFileOutput(
                        file_type=api.EncodedFileType.OGG, filepath=_recording_path,
                        s3=api.S3Upload(access_key=_aws_key, secret=_aws_secret,
                                        bucket=_aws_bucket, region=_s3_region, endpoint=_s3_endpoint),
                    )],
                )
                _egress = await ctx.api.egress.start_room_composite_egress(_egress_req)
                _s3_ep = _s3_endpoint.rstrip("/")
                tool_ctx.recording_url = (f"{_s3_ep}/{_aws_bucket}/{_recording_path}"
                                           if _s3_ep else f"s3://{_aws_bucket}/{_recording_path}")
                await _log("info", f"Recording started: egress={_egress.egress_id}")
            except Exception as _exc:
                await _log("warning", f"Recording start failed (non-fatal): {_exc}")

    # ── Greeting ─────────────────────────────────────────────────────────────
    greeting = (
        f"The call just connected. Greet the lead and ask if you're speaking with {lead_name}."
        if phone_number else "Greet the caller warmly."
    )
    try:
        await session.generate_reply(instructions=greeting)
    except Exception as _gr_exc:
        await _log("warning", f"generate_reply failed: {_gr_exc}")

    # ── Keep alive until SIP participant leaves ──────────────────────────────
    if phone_number:
        _sip_identity = f"sip_{phone_number}"
        _disconnect_event = asyncio.Event()

        def _on_participant_disconnected(participant: rtc.RemoteParticipant):
            if participant.identity == _sip_identity:
                _disconnect_event.set()
        def _on_disconnected():
            _disconnect_event.set()

        ctx.room.on("participant_disconnected", _on_participant_disconnected)
        ctx.room.on("disconnected", _on_disconnected)

        try:
            await asyncio.wait_for(_disconnect_event.wait(), timeout=3600)
        except asyncio.TimeoutError:
            await _log("warning", "Call reached 1-hour safety timeout")

        await _log("info", f"SIP participant disconnected — ending session for {phone_number}")
        await session.aclose()
    else:
        _done = asyncio.Event()
        ctx.room.on("disconnected", lambda: _done.set())
        try:
            await asyncio.wait_for(_done.wait(), timeout=3600)
        except asyncio.TimeoutError:
            pass


if __name__ == "__main__":
    init_db()
    load_db_settings_to_env()
    agents.cli.run_app(
        agents.WorkerOptions(
            entrypoint_fnc=entrypoint,
            prewarm_fnc=prewarm,      # pre-warms Silero VAD before first call
            agent_name="outbound-caller",
        )
    )
