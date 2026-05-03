import asyncio
import os
from livekit.api import LiveKitAPI
from dotenv import load_dotenv

load_dotenv()

async def main():
    api = LiveKitAPI(
        os.getenv("LIVEKIT_URL"),
        os.getenv("LIVEKIT_API_KEY"),
        os.getenv("LIVEKIT_API_SECRET"),
    )
    try:
        trunks = await api.sip.list_sip_trunks()
        print("=== FOUND TRUNKS ===")
        for t in trunks:
            print(f"ID: {t.sip_trunk_id} | NAME: {t.sip_trunk_name}")
        print("====================")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        await api.aclose()

asyncio.run(main())
