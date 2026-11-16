# 🎙️ Goldstone County Launcher v0.3.3 — Live Player Count Fixed

> *"Step into the 1940s. Experience the golden age of deep, cinematic postwar vintage roleplay in the heart of Sri Lanka."*

Welcome to **v0.3.3** of the official **Goldstone County Launcher**! This release fixes the live server player counter and connection status indicators, connecting directly to the official Cfx frontend and FXServer engine.

---

### 🌐 Official Portals & Links
* 🌐 **Official Launcher Portal**: [gscl.nimnabro.com](https://gscl.nimnabro.com/)
* 🏛️ **Official Goldstone Website**: [goldstonerp.com](https://www.goldstonerp.com/)
* 🎮 **Server Direct Connect**: `cfx.re/join/qe3bl6`
* 🎙️ **TeamSpeak Voice Server**: `play.goldstonerp.com`
* 🛡️ **VirusTotal Security Report**: [100% Clean (0/71 Engines)](https://www.virustotal.com/gui/file/45b77c9a8c8fdc8ed99ae6772a4601a222f8f7f5598cc7ae04bf6cd0f446790f)

---

## ✨ What's New in v0.3.3

### 👥 Live Server Player Counter Restored & Hardened
* **Official Cfx Frontend API Integration**: Fixed live player count and online status indicators using the modern official Cfx services endpoint (`frontend.cfx-services.net`).
* **Direct FXServer Engine Fallback**: Added direct low-latency UDP socket queries (`getinfo`) straight to the game server (`31.58.143.68:30120`), ensuring real-time player stats even during third-party web outages.
* **Resilient Connection Status**: Prevents third-party scraper blocks from falsely marking the server as offline.

---

## 🔒 Security & Verification

Every build of Goldstone County Launcher is signed with an official Authenticode digital certificate and verified 100% clean by independent security engines:

| Attribute | Details |
| :--- | :--- |
| **File Name** | `Goldstone County.exe` |
| **Digital Signature** | Goldstone County Roleplay (DigiCert RFC3161 Timestamped) |
| **SHA-256 Checksum** | `45b77c9a8c8fdc8ed99ae6772a4601a222f8f7f5598cc7ae04bf6cd0f446790f` |
| **VirusTotal Status** | [✅ 0 Detections / 71 Engines Clean (100% Safe)](https://www.virustotal.com/gui/file/45b77c9a8c8fdc8ed99ae6772a4601a222f8f7f5598cc7ae04bf6cd0f446790f) |

```powershell
Get-FileHash -Path "Goldstone County.exe" -Algorithm SHA256
# Expected Hash: 45B77C9A8C8FDC8ED99AE6772A4601A222F8F7F5598CC7AE04BF6CD0F446790F
```

---

<p align="center">
  <b>Goldstone County Roleplay</b> • Sri Lanka's Premier Post-War 1940s RedM Community<br/>
  <i>Crafted with precision by Nimnabro for the Goldstone Community.</i>
</p>
