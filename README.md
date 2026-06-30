# BoldFlow Labs — AI Voice Agent (Outbound) 📞
> A production-ready, white-labeled voice agent platform that automates outbound calling campaigns with lowest-latency real-time voice, CRM, and appointment scheduling.

---

## 🚀 Features

- **Gemini Live Multimodal Voice**: Powered by Google's native-audio `RealtimeModel` (default `gemini-2.0-flash-exp`) for ultra-low latency, natural conversational flows, and automatic STT/TTS in a single session.
- **Telnyx SIP Telephony**: Complete integration with Telnyx API v2 for provisioning outbound FQDN connections, Credential connections, and managing Outbound Voice Profiles (OVPs) with spend limits.
- **Per-Market Routing**: Map campaigns to separate phone numbers and Telnyx regional AnchorSites (US, UK, Canada, Australia, UAE/Dubai) to match the caller ID and optimize media latency.
- **FastAPI Dashboard**: Modern React-based CRM and campaign manager for scheduling calls, managing templates, and viewing logs.
- **S3 Recording & Call Logs**: Persists structured call metrics to Supabase and uploads high-fidelity call audio recordings to S3-compatible storage.
- **Interactive Tool Calling**: Enables the agent to query database calendars (Cal.com), schedule bookings, check slot availability, and send SMS confirmations (Twilio) mid-call.

---

## 🛠️ Setup & Installation

### 1. Prerequisites
- Python 3.11+
- A [LiveKit Cloud](https://cloud.livekit.io/) or self-hosted instance
- A [Google AI Studio](https://aistudio.google.com/) Gemini API Key
- A [Telnyx Developer Account](https://developers.telnyx.com/) with an API Key
- A [Supabase Project](https://supabase.com/)

### 2. Database Initialization
1. In your Supabase Dashboard, open the **SQL Editor**.
2. Copy and execute the contents of `supabase_schema.sql` to initialize the database tables (RLS disabled by default on service role tables, clients isolation configured for React anonymized anon calls).

### 3. Environment Configuration
Copy `.env.example` to `.env` and fill in the required credentials:
```bash
cp .env.example .env
```
Key variables to populate:
- `GEMINI_API_KEY`: Google Gemini API Studio key.
- `TELNYX_API_KEY`: Telnyx v2 API Key.
- `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`
- `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`

### 4. Running the Provisioning Script
Provisioning Telnyx FQDN/Credential connections, Outbound Voice Profiles, and LiveKit SIP Trunks is fully automated! Run the script:
```bash
python find_trunk.py
```
This script will:
- Create `"BoldFlow Outbound Voice Profile"` in Telnyx.
- Set up target market SIP connections anchored locally (e.g. London, UK; Sydney, Australia; Chicago, US).
- Register the outbound trunks on LiveKit under the numbers configured in your environment.
- Save all trunk IDs into Supabase settings table automatically.

*(Alternatively, click **"Provision Telnyx Trunks"** inside the Settings page of the dashboard).*

### 5. Running Locally
```bash
# Set up virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install requirements
pip install -r requirements.txt

# Start FastAPI and the LiveKit worker agent
./start.sh
```

---

## 🐋 Running with Docker

Use the included Docker files to run backend and frontend simultaneously:
```bash
docker-compose up --build
```
This spins up:
- **Backend (FastAPI + Agent Worker)**: Port `8000`
- **Frontend (Vite Dashboard SPA)**: Port `3000`

---

## 📋 Manual Testing & Validation Checklist

Before hand-off or production deployment, verify all components using this checklist:

### [ ] 1. Place a Live Outbound Call
- Go to the **Campaigns** tab in the dashboard.
- Enter your phone number in E.164 format (e.g., `+15555550100`) in the "Single Call" card.
- Click **Call Now**.
- Ensure the phone rings, connects, and the agent greets you immediately using the Gemini Live voice.

### [ ] 2. Verify Tool Execution Mid-Call
- Answer the outbound call.
- Ask the agent: *"Can you check what slots you have available tomorrow?"* or *"Book me in for a service next Monday at 10 AM."*
- Verify that the agent correctly triggers `check_availability` and `book_appointment` tools (visible in terminal logs or Settings → Logs).

### [ ] 3. Scheduled Campaign Run (APScheduler)
- Create a new campaign and import a CSV list of test contacts.
- Set the campaign to run daily or weekdays.
- Verify that the scheduler fires at the set time and dispatches calls to target trunks.
- Click **Run Now** on the campaign to verify manual execution.

### [ ] 4. Call Recording Egress
- Verify that the call audio recording is created.
- Check your S3 bucket (or Supabase bucket) inside the `/recordings/` folder for the `.ogg` file.
- Verify that the call history page in the dashboard includes an active "🎧 Listen" playback link.

### [ ] 5. Supabase Log Persistence
- Verify that `call_logs` has a record of the call outcome (e.g. `booked`, `not_interested`).
- Verify that agent decisions and logs are posted to `error_logs` / settings database fields.
