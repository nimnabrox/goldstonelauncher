# 🎙️ Goldstone County Launcher v0.3.2 — 1940s Timeline Era

> *"Step into the 1940s. Experience the golden age of deep, cinematic postwar vintage roleplay in the heart of Sri Lanka."*

Welcome to **v0.3.2** of the official **Goldstone County Launcher**! This update introduces the standalone **`Goldstone County.exe`** binary, rock-solid TeamSpeak 3 & SaltyChat setup reliability, clean file isolation with zero Desktop pollution, instant offline community music caching, and a 100% clean VirusTotal security score.

---

### 🌐 Official Portals & Links
* 🌐 **Official Launcher Portal**: [gscl.nimnabro.com](https://gscl.nimnabro.com/)
* 🏛️ **Official Goldstone Website**: [goldstonerp.com](https://www.goldstonerp.com/)
* 🎮 **Server Direct Connect**: `cfx.re/join/qe3bl6`
* 🎙️ **TeamSpeak Voice Server**: `play.goldstonerp.com`
* 🛡️ **VirusTotal Security Report**: [100% Clean (0/71 Engines)](https://www.virustotal.com/gui/file/72dfcb46a9a8792e714d22aaa3dc668041d6a1333191e176018c7afe44d265fb)

---

## ✨ What's New in v0.3.2

### 🚀 Standalone "Goldstone County.exe" Executable
* Official executable is now named **`Goldstone County.exe`** with complete backward-compatibility for existing installs using `goldstone-launcher.exe`.
* Single, self-contained portable executable requiring zero extra dependencies on any clean Windows PC.

### 🧹 100% Clean Desktop & Zero Temp File Pollution
* Eliminated any stray files (e.g. `goldstone_ptt_key.txt`) on the user's Desktop or working directory.
* Push-to-Talk and configuration files are now strictly confined to isolated system paths (`%LOCALAPPDATA%\GoldstoneCounty` and `%APPDATA%\TS3Client`).
* Automatic self-cleaning ensures your Desktop stays completely spotless.

### 🎙️ Resilient TeamSpeak 3 & SaltyChat Live 1-Click Installer
* Fixed stalls at 10% during TeamSpeak 3 download caused by rate limits.
* Added multi-mirror fallbacks and HTTP byte-range resume support (`Range: bytes=...`) for smooth, uninterrupted downloads even on unstable connections.
* Automated SaltyChat 4.1.0 plugin configuration with pre-configured radio and sound effects.

### 🎵 Instant Community Music Cache
* Instant offline track caching in the launcher's music directory with zero startup delay.
* 11 stream-safe tracks featuring Goldstone Roleplay Music Video (KRJ & EMD) as Track #1.
* Continuous background loop during RedM boot with auto-pause at 67% loading.

### 🎨 1940s Vintage ReShade Preset
* One-click 1940s cinematic color grading and vintage atmosphere preset tailored for RedM.

### 🛡️ Smart 67% Stuck Fix & Loading Engine Bypass
* Decoupled the 67% Stuck Fix toggle switch completely from ambient music fade events.
* When 67% Stuck Fix is active, RedM launches safely into the local engine first, waits for asset compilation past 67%, and seamlessly auto-connects to Goldstone County without crashing or freezing.

### 🎙️ Graceful TeamSpeak 3 Disconnect on Enter / Auto-Launch
* Fixed immediate abrupt termination of TeamSpeak 3 when clicking "ENTER GOLDSTONE (AUTO)".
* Automatically executes clean server disconnects (`DISCONNECT` pipe + ClientQuery `serverdisconnect -all` + `WM_CLOSE`) before relaunching, eliminating socket conflicts and reconnection errors.

---

## 🔒 Security & Integrity Verification

Every official Goldstone build is signed with an Authenticode certificate and verified **100% clean** across all major antivirus engines.

| Detail | Specification |
| :--- | :--- |
| **File Name** | `Goldstone County.exe` / `goldstone-launcher.exe` |
| **Version** | `0.3.2` |
| **Architecture** | Windows x64 (64-bit) |
| **File Size** | 15,854,088 bytes (~15.1 MB) |
| **Digital Signature** | Goldstone County Roleplay (DigiCert RFC3161 Timestamped) |
| **SHA-256 Checksum** | `72dfcb46a9a8792e714d22aaa3dc668041d6a1333191e176018c7afe44d265fb` |
| **VirusTotal Status** | [✅ 0 Detections / 71 Engines Clean (100% Safe)](https://www.virustotal.com/gui/file/72dfcb46a9a8792e714d22aaa3dc668041d6a1333191e176018c7afe44d265fb) |

### Verify Checksum via PowerShell:
```powershell
Get-FileHash -Path "Goldstone County.exe" -Algorithm SHA256
# Expected Hash: 72DFCB46A9A8792E714D22AAA3DC668041D6A1333191E176018C7AFE44D265FB
```
