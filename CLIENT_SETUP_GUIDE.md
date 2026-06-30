# Client Deployment & White-Labeling Guide 🚀
> This guide outlines the end-to-end process to customize, brand, provision, and deploy the BoldFlow AI Voice Agent platform for your clients.

---

## 📋 Table of Contents
1. [White-Labeling & Branding Customization](#1-white-labeling--branding-customization)
2. [Telnyx Telephony & Market Setup](#2-telnyx-telephony--market-setup)
3. [LiveKit Cloud Configuration](#3-livekit-cloud-configuration)
4. [Supabase & Data Layer Setup](#4-supabase--data-layer-setup)
5. [Deployment (Backend & Frontend)](#5-deployment-backend--frontend)
6. [Handoff & Client Onboarding Checklist](#6-handoff--client-onboarding-checklist)

---

## 1. White-Labeling & Branding Customization

The dashboard is built to read all company configuration values from Vite environment variables or a static configuration module, making it simple to spin up customized portals for different clients.

### Step 1.1: Customize the Brand Configurations
Open [boldflow-dashboard/src/brandConfig.js](file:///d:/projects/OutboundAIVoice/boldflow-dashboard/src/brandConfig.js) or configure your frontend environment files:
- **`VITE_BRAND_NAME`**: The short name of your client/company (e.g., `Acme Voice`).
- **`VITE_BRAND_LONG_NAME`**: The title displayed on browser tabs (e.g., `Acme AI Outbound Platform`).
- **`VITE_BRAND_LOGO_TEXT`**: Text to display in the sidebar logo block (usually 2-3 characters like `AV`).
- **`VITE_BRAND_DESCRIPTION`**: Subtext under the sidebar brand name.
- **`VITE_BRAND_FOOTER`**: Copyright and footer details.

### Step 1.2: Theme Customization (Colors & Logo)
To modify colors, typography, or styling:
1. Open the global CSS file `boldflow-dashboard/src/index.css`.
2. Locate the `:root` variables block:
   ```css
   :root {
     --primary: #4f46e5;       /* Change to client's primary brand color */
     --primary-hover: #4338ca;
     --background: #0b0f19;    /* Dark mode background */
     --radius-sm: 6px;
     --radius-md: 12px;
   }
   ```
3. Adjust the HSL/HEX values to match your client's design guidelines.

---

## 2. Telnyx Telephony & Market Setup

The outbound call flow routes connections via Telnyx credential-based SIP registrations. Each target country utilizes a regional Point of Presence (PoP) via Telnyx AnchorSites to keep network latency minimal.

### Step 2.1: Buy Phone Numbers
1. Log into your [Telnyx Portal](https://portal.telnyx.com/).
2. Navigate to **Numbers** ➜ **Search & Buy Numbers**.
3. Purchase numbers in your target countries matching your client's needs:
   - **United States**: US (+1)
   - **United Kingdom**: GB (+44)
   - **Canada**: CA (+1)
   - **Australia**: AU (+61)
   - **United Arab Emirates**: AE (+971)

### Step 2.2: Obtain API Keys
1. In the Telnyx Portal, navigate to **Account Settings** ➜ **API Keys**.
2. Create and copy an **API Key (v2)**.
3. Save this key in your server's `.env` configuration as `TELNYX_API_KEY`.

### Step 2.3: Set Up Outbound Numbers in Environment
Set the purchased phone numbers in the environment variables (using strict E.164 format):
```bash
TELNYX_NUMBER_US=+15555550100
TELNYX_NUMBER_UK=+447700900077
TELNYX_NUMBER_CA=+15555550111
TELNYX_NUMBER_AU=+61491570156
TELNYX_NUMBER_AE=+971501234567
```

---

## 3. LiveKit Cloud Configuration

LiveKit manages room coordination, agent dispatching, and SIP bridging.

### Step 3.1: LiveKit Project Setup
1. Create a project in [LiveKit Cloud](https://cloud.livekit.io/).
2. Navigate to **Project Settings** ➜ **Keys** and generate:
   - `LIVEKIT_URL` (e.g., `wss://acme-project.livekit.cloud`)
   - `LIVEKIT_API_KEY`
   - `LIVEKIT_API_SECRET`

### Step 3.2: Automating SIP Trunk Registration
Once the Telnyx and LiveKit environment variables are configured in `.env`, run the automated provisioning script to register the Telnyx connections and configure LiveKit SIP trunks:
```bash
python find_trunk.py
```
This registers the respective SIP Outbound Trunks in LiveKit and updates the IDs in the database settings table. Alternatively, you can click **"Provision Telnyx Trunks"** inside the Settings panel of the client dashboard.

---

## 4. Supabase & Data Layer Setup

All configurations, call logs, and schedules are synchronized via a Supabase postgres database.

### Step 4.1: DB Initialization
1. Spin up a new database in [Supabase](https://supabase.com/).
2. Open the **SQL Editor** in your Supabase dashboard.
3. Copy the contents of `supabase_schema.sql` and click **Run** to set up:
   - `settings` table (for API keys and configurations)
   - `agent_profiles` table (for voices and system prompts)
   - `campaigns` table (for contacts, schedule frequencies, and markets)
   - `call_logs` table (for recording, outcomes, and metrics)
   - `error_logs` table

### Step 4.2: Link Credentials
Configure the Supabase project connection string and service key in the server's `.env` file:
```bash
SUPABASE_URL=https://xxxxxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 5. Deployment (Backend & Frontend)

### Step 5.1: Backend Server Deployment (FastAPI + Agent Worker)
The server runs two primary processes: the FastAPI management server (port `8000`) and the LiveKit agent worker script.

#### Option A: Docker Compose (Recommended)
Compile and launch using Docker Compose:
```bash
docker-compose up --build -d
```
This starts both the backend API and the static React dashboard automatically.

#### Option B: Deploying to VPS (e.g. Ubuntu, DigitalOcean)
Create a systemd unit service to keep the background agent worker running continuously:
```ini
# /etc/systemd/system/boldflow-agent.service
[Unit]
Description=BoldFlow Agent Worker Service
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/OutboundAIVoice
ExecStart=/home/ubuntu/OutboundAIVoice/venv/bin/python agent.py start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```
Enable and start the service:
```bash
sudo systemctl enable boldflow-agent
sudo systemctl start boldflow-agent
```

### Step 5.2: Frontend Static Deployment (Vercel / Netlify / Cloudflare Pages)
To host the React SPA in the cloud:
1. Move to the directory: `cd boldflow-dashboard`.
2. Install npm dependencies and build production artifacts:
   ```bash
   npm install
   npm run build
   ```
3. Deploy the resulting `dist/` directory to Vercel, Netlify, or Cloudflare Pages.
4. Set up an environment variable pointing the frontend to the backend server API:
   - **`VITE_API_URL`**: `https://api.yourclientdomain.com`

---

## 6. Handoff & Client Onboarding Checklist

Before handing the platform keys over to your clients, ensure you run through this quality assurance checklist:

- [ ] **Custom Branding Verified**: Check that the login panel and sidebar load the client's custom logo text, name, colors, and tab titles.
- [ ] **Provisioning Active**: Click the "Provision Telnyx Trunks" button in settings and check that all target market phone number SIP trunks are initialized.
- [ ] **Outbound Call Verification**: Execute a Single Call to your mobile phone. Verify that caller ID matches the market trunk selected.
- [ ] **Interactive Voice Quality**: Confirm the Gemini Live voice is crisp, low-latency, and correctly handles conversational turn-taking.
- [ ] **SMS Integration Check**: Trigger a booking flow tool call during a conversation and verify the Twilio SMS confirmation lands on the recipient device.
- [ ] **S3 Recording Delivery**: Hang up the call, wait 10 seconds, and ensure the `.ogg` call recording is uploaded to your S3 bucket and playable from the Call History tab.
