import asyncio
import os
import secrets
import logging
import httpx
from livekit.api import LiveKitAPI
from dotenv import load_dotenv

# Ensure we can load settings from Supabase
from db import init_db, get_setting, set_setting

load_dotenv()
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s [%(name)s] %(message)s")
logger = logging.getLogger("telnyx-provision")

MARKETS = {
    "us": {
        "name": "USA",
        "anchorsite": "Chicago, IL",
        "default_number": "+15555550100",
        "env_num_key": "TELNYX_NUMBER_US",
        "setting_trunk_key": "OUTBOUND_TRUNK_ID_US",
    },
    "uk": {
        "name": "UK",
        "anchorsite": "London, UK",
        "default_number": "+447700900077",
        "env_num_key": "TELNYX_NUMBER_UK",
        "setting_trunk_key": "OUTBOUND_TRUNK_ID_UK",
    },
    "ca": {
        "name": "Canada",
        "anchorsite": "Toronto, ON",
        "default_number": "+15555550111",
        "env_num_key": "TELNYX_NUMBER_CA",
        "setting_trunk_key": "OUTBOUND_TRUNK_ID_CA",
    },
    "au": {
        "name": "Australia",
        "anchorsite": "Sydney, Australia",
        "default_number": "+61491570156",
        "env_num_key": "TELNYX_NUMBER_AU",
        "setting_trunk_key": "OUTBOUND_TRUNK_ID_AU",
    },
    "ae": {
        "name": "UAE",
        "anchorsite": "Frankfurt, Germany",  # Nearest European anchorsite PoP
        "default_number": "+971501234567",
        "env_num_key": "TELNYX_NUMBER_AE",
        "setting_trunk_key": "OUTBOUND_TRUNK_ID_AE",
    },
}

async def get_env_or_db(key: str, default: str = "") -> str:
    """Helper to fetch key from OS env first, then database."""
    val = os.getenv(key, "")
    if val:
        return val
    try:
        return await get_setting(key, default)
    except Exception:
        return default

async def find_ovp(client: httpx.AsyncClient, name: str):
    """Find Outbound Voice Profile ID by name."""
    resp = await client.get("https://api.telnyx.com/v2/outbound_voice_profiles")
    if resp.status_code == 200:
        for profile in resp.json().get("data", []):
            if profile.get("name") == name:
                return profile.get("id")
    return None

async def find_credential_connection(client: httpx.AsyncClient, name: str):
    """Find Credential Connection by name."""
    resp = await client.get("https://api.telnyx.com/v2/credential_connections")
    if resp.status_code == 200:
        for conn in resp.json().get("data", []):
            if conn.get("connection_name") == name:
                return conn
    return None

async def find_fqdn_connection(client: httpx.AsyncClient, name: str):
    """Find FQDN Connection by name."""
    resp = await client.get("https://api.telnyx.com/v2/fqdn_connections")
    if resp.status_code == 200:
        for conn in resp.json().get("data", []):
            if conn.get("connection_name") == name:
                return conn
    return None

async def provision_all():
    """Run full provisioning workflow for Telnyx and LiveKit SIP Trunks."""
    init_db()

    # Load required credentials
    telnyx_api_key = await get_env_or_db("TELNYX_API_KEY")
    lk_url = await get_env_or_db("LIVEKIT_URL")
    lk_key = await get_env_or_db("LIVEKIT_API_KEY")
    lk_secret = await get_env_or_db("LIVEKIT_API_SECRET")

    if not telnyx_api_key:
        logger.error("❌ TELNYX_API_KEY not found in environment or database settings.")
        return False
    if not all([lk_url, lk_key, lk_secret]):
        logger.error("❌ LiveKit credentials not found in environment or database settings.")
        return False

    headers = {
        "Authorization": f"Bearer {telnyx_api_key}",
        "Content-Type": "application/json"
    }

    async with httpx.AsyncClient(headers=headers, timeout=15) as client:
        # 1. Provision Outbound Voice Profile
        ovp_name = "BoldFlow Outbound Voice Profile"
        ovp_id = await find_ovp(client, ovp_name)
        if not ovp_id:
            logger.info("➕ Creating new Outbound Voice Profile...")
            ovp_resp = await client.post(
                "https://api.telnyx.com/v2/outbound_voice_profiles",
                json={
                    "name": ovp_name,
                    "daily_spend_limit": "50.00",
                    "daily_spend_limit_enabled": True,
                    "whitelisted_destinations": ["US", "CA", "GB", "AU", "AE"]
                }
            )
            if ovp_resp.status_code in (200, 201):
                ovp_id = ovp_resp.json()["data"]["id"]
                logger.info(f"✅ Outbound Voice Profile created: {ovp_id}")
            else:
                logger.error(f"❌ Failed to create OVP: {ovp_resp.text}")
                return False
        else:
            logger.info(f"🔍 Reusing existing Outbound Voice Profile: {ovp_id}")

        await set_setting("TELNYX_OUTBOUND_VOICE_PROFILE_ID", ovp_id)

        # 2. Provision per-market connections and LiveKit SIP trunks
        lk = LiveKitAPI(url=lk_url, api_key=lk_key, api_secret=lk_secret)
        first_trunk_id = None

        for code, m in MARKETS.items():
            market_name = m["name"]
            logger.info(f"--- Provisioning Market: {market_name} ---")

            # A. FQDN Connection (for Telnyx routing record)
            fqdn_conn_name = f"BoldFlow FQDN Connection {market_name}"
            fqdn_conn = await find_fqdn_connection(client, fqdn_conn_name)
            fqdn_conn_id = None

            if not fqdn_conn:
                logger.info(f"➕ Creating FQDN Connection for {market_name}...")
                fqdn_resp = await client.post(
                    "https://api.telnyx.com/v2/fqdn_connections",
                    json={
                        "connection_name": fqdn_conn_name,
                        "active": True,
                        "anchorsite_override": m["anchorsite"]
                    }
                )
                if fqdn_resp.status_code in (200, 201):
                    fqdn_conn_id = fqdn_resp.json()["data"]["id"]
                    logger.info(f"✅ FQDN Connection created: {fqdn_conn_id}")
                else:
                    logger.warning(f"⚠️ Failed to create FQDN connection for {market_name}: {fqdn_resp.text}")
            else:
                fqdn_conn_id = fqdn_conn["id"]
                logger.info(f"🔍 Reusing FQDN Connection for {market_name}: {fqdn_conn_id}")

            if fqdn_conn_id:
                # Associate with OVP
                await client.patch(
                    f"https://api.telnyx.com/v2/fqdn_connections/{fqdn_conn_id}",
                    json={"outbound": {"outbound_voice_profile_id": ovp_id}}
                )

            # B. Credential Connection (for LiveKit authentication)
            cred_conn_name = f"BoldFlow Credential Connection {market_name}"
            cred_conn = await find_credential_connection(client, cred_conn_name)
            
            username = None
            password = None
            cred_conn_id = None

            if not cred_conn:
                logger.info(f"➕ Creating Credential Connection for {market_name}...")
                username = f"boldflow_{code}_{secrets.token_hex(4)}"
                password = secrets.token_urlsafe(16)
                cred_resp = await client.post(
                    "https://api.telnyx.com/v2/credential_connections",
                    json={
                        "connection_name": cred_conn_name,
                        "active": True,
                        "user_name": username,
                        "password": password,
                        "anchorsite_override": m["anchorsite"]
                    }
                )
                if cred_resp.status_code in (200, 201):
                    cred_conn_id = cred_resp.json()["data"]["id"]
                    logger.info(f"✅ Credential Connection created: {cred_conn_id} (user={username})")
                else:
                    logger.error(f"❌ Failed to create Credential Connection for {market_name}: {cred_resp.text}")
                    continue
            else:
                cred_conn_id = cred_conn["id"]
                username = cred_conn["user_name"]
                password = cred_conn.get("password") or secrets.token_urlsafe(16)  # fallback if hidden
                logger.info(f"🔍 Reusing Credential Connection for {market_name}: {cred_conn_id} (user={username})")

            # Associate Credential Connection with OVP
            await client.patch(
                f"https://api.telnyx.com/v2/credential_connections/{cred_conn_id}",
                json={"outbound": {"outbound_voice_profile_id": ovp_id}}
            )

            # Save connection settings
            await set_setting(f"TELNYX_CONNECTION_ID_{code.upper()}", cred_conn_id)

            # C. Create LiveKit Outbound SIP Trunk
            # Read market number
            market_num = await get_env_or_db(m["env_num_key"])
            if not market_num:
                logger.warning(f"⚠️ {m['env_num_key']} not found. Defaulting to placeholder: {m['default_number']}")
                market_num = m["default_number"]

            # Ensure number is strictly E.164
            if not market_num.startswith("+"):
                market_num = "+" + market_num.strip()

            logger.info(f"🌐 Creating LiveKit SIP outbound trunk for {market_name}...")
            try:
                from livekit import api as lk_api
                trunk_info = lk_api.SIPOutboundTrunkInfo(
                    name=f"Telnyx Outbound Trunk {market_name}",
                    address="sip.telnyx.com",
                    auth_username=username,
                    auth_password=password,
                    numbers=[market_num]
                )
                lk_trunk_resp = await lk.sip.create_sip_outbound_trunk(
                    lk_api.CreateSIPOutboundTrunkRequest(trunk=trunk_info)
                )
                trunk_id = lk_trunk_resp.sip_trunk_id
                logger.info(f"✅ LiveKit SIP Trunk created: {trunk_id} for number {market_num}")
                
                await set_setting(m["setting_trunk_key"], trunk_id)
                if code == "us" or not first_trunk_id:
                    first_trunk_id = trunk_id
            except Exception as e:
                logger.error(f"❌ Failed to create LiveKit SIP Trunk: {e}")

        # D. Save general OUTBOUND_TRUNK_ID fallback
        if first_trunk_id:
            await set_setting("OUTBOUND_TRUNK_ID", first_trunk_id)
            logger.info(f"✅ Default OUTBOUND_TRUNK_ID set to: {first_trunk_id}")

        await lk.aclose()
        logger.info("🎉 Telnyx and LiveKit SIP provisioning complete!")
        return True

async def list_trunks():
    """Look up and list existing LiveKit SIP trunks."""
    lk_url = await get_env_or_db("LIVEKIT_URL")
    lk_key = await get_env_or_db("LIVEKIT_API_KEY")
    lk_secret = await get_env_or_db("LIVEKIT_API_SECRET")

    if not all([lk_url, lk_key, lk_secret]):
        logger.error("❌ LiveKit credentials not found.")
        return

    api = LiveKitAPI(lk_url, lk_key, lk_secret)
    try:
        trunks = await api.sip.list_sip_trunks()
        print("\n=== CURRENT LIVEKIT SIP TRUNKS ===")
        for t in trunks:
            print(f"ID: {t.sip_trunk_id} | NAME: {t.sip_trunk_name} | NUMBERS: {t.numbers}")
        print("==================================\n")
    except Exception as e:
        logger.error(f"Error listing trunks: {e}")
    finally:
        await api.aclose()

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "list":
        asyncio.run(list_trunks())
    else:
        asyncio.run(provision_all())
