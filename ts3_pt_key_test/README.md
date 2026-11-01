# TeamSpeak 3 Universal Push-to-Talk Live Bridge & SDK Integration

**Testing Directory:** `D:\Projects_Codes\Projects_Codes\goldstone-launcher\ts3_pt_key_test`

---

### Features & Fixes:

#### 1. ⚡ Instant Auto-Update (NO Apply Button Needed • Zero Popups)
- Whenever you click any key preset (`MOUSE 4`, `KEY: F`, `KEY: N`, etc.) or bind a custom key:
  - Updates in TeamSpeak 3 live in **0ms**.
  - Synchronizes to `%APPDATA%\TS3Client\settings.db` automatically in the background.
  - **No popups or alert boxes appear**.
  - **No manual "Apply" or "Save" button click needed**.

#### 2. 🎙 Direct TS3 In-Process Hardware Key Monitor
- **Why TS3 "Begin Test" didn't hear you before**:
  - Previously, the plugin only waited for pipe events from an external script. When you pressed the key directly inside TS3, nothing was polling the physical hardware inside TS3.
- **The Solution (`KeyMonitorThread`)**:
  - The in-process plugin (`goldstone_ptt_win64.dll`) now runs a dedicated high-speed (200Hz) hardware monitor directly inside TeamSpeak 3.
  - When you press your Push-to-Talk key:
    - Works instantly inside **Tools -> Options -> Capture -> "Begin Test"** (you will clearly hear your own voice through your headphones/speakers).
    - Works in-game (RedM, FiveM, GTA V) and when TS3 is minimized.
    - Triggers native `notifyKeyEvent("ptt", 0/1)` and unmutes capture (`CLIENT_INPUT_DEACTIVATED`).
    - Simulates mouse button events for **Mouse 4 / Mouse 5**.

#### 3. 🔄 Automatic Plugin Autoloading
- Exported `ts3plugin_requestAutoload() { return 1; }` so TeamSpeak 3 automatically loads the plugin on every startup.

---

### How to Run:
Double-click `run_test.bat`:
1. Executes the 9-stage automated self-test.
2. Launches the instant auto-update tester GUI.
