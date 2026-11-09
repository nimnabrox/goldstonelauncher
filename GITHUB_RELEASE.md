# 🎙️ Goldstone County Launcher v0.3.2 — 1940s Timeline Era

> *"Step into the 1940s. Experience the golden age of deep, cinematic postwar vintage roleplay in the heart of Sri Lanka."*

Welcome to **v0.3.2** of the official **Goldstone County Launcher**! This update introduces the standalone **`Goldstone County.exe`** binary, rock-solid TeamSpeak 3 & SaltyChat setup reliability, clean file isolation with zero Desktop pollution, instant offline community music caching, and a 100% clean VirusTotal security score.

---

### 🌐 Official Portals & Links
* 🌐 **Official Launcher Portal**: [gscl.nimnabro.com](https://gscl.nimnabro.com/)
* 🏛️ **Official Goldstone Website**: [goldstonerp.com](https://www.goldstonerp.com/)
* 🎮 **Server Direct Connect**: `cfx.re/join/qe3bl6`
* 🎙️ **TeamSpeak Voice Server**: `play.goldstonerp.com`
* 🛡️ **VirusTotal Security Report**: [100% Clean (0/71 Engines)](https://www.virustotal.com/gui/file/ecb83f0e25b617c4d1f7cf64b6779b72cf55e3de8ebcb4821d3f8ce79cbc482a)

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

---

## 🔒 Security & Integrity Verification

Every official Goldstone build is signed with an Authenticode certificate and verified **100% clean** across all major antivirus engines.

| Detail | Specification |
| :--- | :--- |
| **File Name** | `Goldstone County.exe` / `goldstone-launcher.exe` |
| **Version** | `0.3.2` |
| **Architecture** | Windows x64 (64-bit) |
| **File Size** | 15,853,576 bytes (~15.1 MB) |
| **Digital Signature** | Goldstone County Roleplay (DigiCert RFC3161 Timestamped) |
| **SHA-256 Checksum** | `ecb83f0e25b617c4d1f7cf64b6779b72cf55e3de8ebcb4821d3f8ce79cbc482a` |
| **VirusTotal Status** | [✅ 0 Detections / 71 Engines Clean (100% Safe)](https://www.virustotal.com/gui/file/ecb83f0e25b617c4d1f7cf64b6779b72cf55e3de8ebcb4821d3f8ce79cbc482a) |

### Verify Checksum via PowerShell:
```powershell
Get-FileHash -Path "Goldstone County.exe" -Algorithm SHA256
# Expected Hash: ECB83F0E25B617C4D1F7CF64B6779B72CF55E3DE8EBCB4821D3F8CE79CBC482A
```
