# OutboundAIVoice 📞

A production-ready voice agent capable of making outbound calls using **LiveKit**, **Sarvam AI** (for STT/TTS), and **OpenAI** (for LLM).
This platform includes a built-in FastAPI dashboard, CRM capabilities, campaign scheduling, and SIP integration.

## 🚀 Features

- **Voice AI Pipeline**: Powered by **OpenAI** (`gpt-4o-mini`) for intelligent conversational logic and **Sarvam AI** (`saaras:v3` and `bulbul:v3`) for high-quality, regionally optimized Speech-to-Text and Text-to-Speech (e.g., `en-IN`).
- **SIP Trunking**: Built-in integration with **Vobiz** for reliable PSTN connectivity.
- **FastAPI Dashboard**: Web UI to manage calls, view logs, create campaigns, and update system settings.
- **Database Backend**: Uses **Supabase** for persisting settings, call logs, CRM contacts, agent profiles, and appointments.
- **Campaign Management**: Schedule automated outbound call campaigns (run once, daily, or on weekdays) using `APScheduler`.
- **Agent Profiles**: Create multiple customizable AI personas with different voices, prompts, and tools.
- **Call Recording**: Automatic call recording egress to AWS S3-compatible storage.

---

## 🛠️ Setup & Installation

### 1. Prerequisites
- Python 3.11+
- A [LiveKit Cloud](https://cloud.livekit.io/) account
- An [OpenAI](https://openai.com/) API Key
- A [Sarvam AI](https://sarvam.ai/) API Key
- A [Supabase](https://supabase.com/) Project (URL and Service Role Key)
- SIP Provider Credentials (e.g., Vobiz)

### 2. Database Initialization
Before running the app, you need to set up the database tables in Supabase:
1. Open your Supabase project dashboard.
2. Navigate to the **SQL Editor**.
3. Copy the contents of `supabase_schema.sql` from this repository and run it to create all necessary tables and policies.

### 3. Configure Environment
Create an environment file:
```bash
cp .env.example .env
nano .env  # Or open in your editor
```
**Key Variables:**
- `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`
- `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`
- `OPENAI_API_KEY`
- `SARVAM_API_KEY`
*(Note: Most settings can also be configured dynamically via the web dashboard).*

### 4. Running Locally
```bash
# Create a virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start the application (FastAPI server + LiveKit worker)
./start.sh
```
The dashboard will be available at `http://localhost:80` (or `http://0.0.0.0:80`).

### 5. Running with Docker
A `Dockerfile` is included for easy containerized deployment.
```bash
docker build -t outbound-ai .
docker run -p 80:80 --env-file .env outbound-ai
```

---

## 📂 Project Structure

- `agent.py`: LiveKit worker logic (the AI voice agent session).
- `server.py`: FastAPI backend handling API routes, UI, and campaign scheduling.
- `db.py`: Supabase database connection and CRUD operations.
- `tools.py`: Function-calling tools for the AI agent (e.g., appointment booking).
- `prompts.py`: Logic for generating dynamic system prompts.
- `ui/`: Contains the frontend `index.html` for the dashboard.
- `start.sh`: Entry point script that runs the server and agent simultaneously.
