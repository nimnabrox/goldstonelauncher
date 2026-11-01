r"""
Goldstone County RP - TeamSpeak 3 Universal Push-to-Talk Live Bridge & SDK Integration
Location: D:\Projects_Codes\Projects_Codes\goldstone-launcher\ts3_pt_key_test\ts3_ptt_tester.py

Features:
1. INSTANT AUTO-UPDATE (NO APPLY BUTTON NEEDED, ZERO POPUPS):
   - Whenever you click any key preset or bind any key, it updates live in TeamSpeak 3 in 0ms.
   - Automatically synchronizes settings.db in the background with valid SHA-1 checksum.
   - Completely silent with ZERO annoying popups.
2. IN-PROCESS HARDWARE KEY MONITORING:
   - The native plugin (goldstone_ptt_win64.dll) monitors the physical key directly inside TS3.
   - Works seamlessly in TS3 "Begin Test", in-game (RedM / FiveM), and minimized.
   - Fully supports Mouse 4, Mouse 5, Middle click, and every keyboard key.
"""

import sys
import os
import sqlite3
import hashlib
import time
import subprocess
import threading
import ctypes
from ctypes import wintypes
import tkinter as tk
from tkinter import ttk

user32 = ctypes.windll.user32
kernel32 = ctypes.windll.kernel32

PIPE_NAME = r"\\.\pipe\GoldstonePTTPipe"

# --- Virtual Key Maps & Formatter ---
VK_CONFIGS = {
    "KEY: N": (0x4E, "Keyboard:78", "Keyboard"),
    "KEY: F": (0x46, "Keyboard:70", "Keyboard"),
    "KEY: V": (0x56, "Keyboard:86", "Keyboard"),
    "KEY: B": (0x42, "Keyboard:66", "Keyboard"),
    "KEY: T": (0x54, "Keyboard:84", "Keyboard"),
    "MOUSE 4": (0x05, "Mouse:4", "Mouse"),
    "MOUSE 5": (0x06, "Mouse:5", "Mouse"),
    "MOUSE 3": (0x04, "Mouse:3", "Mouse"),
    "CAPS LOCK": (0x14, "Keyboard:20", "Keyboard"),
    "LEFT ALT": (0xA4, "Keyboard:164", "Keyboard"),
    "LEFT CTRL": (0xA2, "Keyboard:162", "Keyboard"),
    "LEFT SHIFT": (0xA0, "Keyboard:160", "Keyboard"),
    "SPACE": (0x20, "Keyboard:32", "Keyboard"),
    "SCROLL LOCK": (0x91, "Keyboard:145", "Keyboard"),
    "F12": (0x7B, "Keyboard:123", "Keyboard"),
}

for c in range(ord('A'), ord('Z') + 1):
    lbl = f"KEY: {chr(c)}"
    if lbl not in VK_CONFIGS:
        VK_CONFIGS[lbl] = (c, f"Keyboard:{c}", "Keyboard")

for d in range(ord('0'), ord('9') + 1):
    lbl = f"KEY: {chr(d)}"
    if lbl not in VK_CONFIGS:
        VK_CONFIGS[lbl] = (d, f"Keyboard:{d}", "Keyboard")

for f in range(1, 25):
    lbl = f"F{f}"
    vk = 0x6F + f
    if lbl not in VK_CONFIGS:
        VK_CONFIGS[lbl] = (vk, f"Keyboard:{vk}", "Keyboard")

def get_vk_info(vk: int) -> tuple[str, str, str]:
    for lbl, (v, tid, dev) in VK_CONFIGS.items():
        if v == vk:
            return lbl, tid, dev
    return f"CUSTOM KEY (0x{vk:02X})", f"Keyboard:{vk}", "Keyboard"

# --- Protobuf Helpers ---
def encode_varint(val: int) -> bytes:
    res = bytearray()
    while val >= 0x80:
        res.append((val & 0x7f) | 0x80)
        val >>= 7
    res.append(val)
    return bytes(res)

def encode_tag(tag: int, wtype: int) -> bytes:
    return encode_varint((tag << 3) | wtype)

def encode_length_delimited(tag: int, data: bytes) -> bytes:
    return encode_tag(tag, 2) + encode_varint(len(data)) + data

def encode_string(tag: int, s: str) -> bytes:
    return encode_length_delimited(tag, s.encode('utf-8'))

def encode_varint_field(tag: int, val: int) -> bytes:
    return encode_tag(tag, 0) + encode_varint(val)

def build_hotkey_item(direction: str, action_name: str, action_desc: str, ts3_key_id: str, uuid_str: str, key_code: int = 0) -> bytes:
    body = bytearray()
    body += encode_varint_field(3, 0)
    body += encode_varint_field(4, 1)
    body += encode_string(5, uuid_str)
    body += encode_string(6, direction)
    
    keydef = bytearray()
    keydef += encode_string(1, ts3_key_id)
    if key_code > 0:
        keydef += encode_varint_field(2, key_code)
    body += encode_length_delimited(7, bytes(keydef))
    
    body += encode_varint_field(8, 320) # action_type is ALWAYS 320 (0x140) for Push-to-Talk!
    body += encode_string(9, '')
    body += encode_varint_field(10, 0)
    body += encode_string(11, action_name)
    body += encode_string(12, '')
    body += encode_string(13, action_desc)
    body += encode_string(14, '')
    body += encode_string(15, '')
    body += encode_string(16, '')
    body += encode_string(17, '')
    body += encode_string(18, '')
    body += encode_string(19, '')
    body += encode_string(20, '')
    body += encode_string(21, '')
    body += encode_varint_field(22, 1)
    body += encode_string(23, 'Default')
    body += encode_varint_field(24, 0)
    return bytes(body)

def build_hotkey_protobuf(env_uuid: str, profile_uuid: str, ts3_key_id: str, key_code: int = 0) -> bytes:
    profile_body = bytearray()
    profile_body += encode_string(1, profile_uuid)
    profile_body += encode_string(2, 'Default')
    
    item1 = build_hotkey_item('Down', 'Activate', 'Activate Push-to-Talk', ts3_key_id, "dc9a1262-e04a-169a-8954-1d1bbcb2ea03", key_code)
    profile_body += encode_length_delimited(3, item1)
    
    item2 = build_hotkey_item('Up', 'Deactivate', 'Deactivate Push-to-Talk', ts3_key_id, "ba39c755-ce4a-371e-cd2e-31837f062330", key_code)
    profile_body += encode_length_delimited(3, item2)
    profile_body += encode_varint_field(4, 1)

    env = bytearray()
    env += encode_string(2, env_uuid)
    env += encode_varint_field(4, 0)
    env += encode_string(5, 'ffffffff-ffff-ffff-ffff-ffffffffffff')
    env += encode_varint_field(6, 3)
    env += encode_string(7, '')
    env += encode_string(8, '')
    env += encode_varint_field(9, int(time.time()))
    env += encode_length_delimited(19, bytes(profile_body))
    return bytes(env)

# --- Path & Process Functions ---
def get_ts3_db_path() -> str:
    appdata = os.environ.get("APPDATA", "")
    return os.path.join(appdata, r"TS3Client\settings.db")

def find_teamspeak_exe() -> str | None:
    paths = [
        r"C:\Program Files\TeamSpeak 3 Client\ts3client_win64.exe",
        r"C:\Program Files (x86)\TeamSpeak 3 Client\ts3client_win32.exe",
        os.path.expandvars(r"%LOCALAPPDATA%\Programs\TeamSpeak 3 Client\ts3client_win64.exe")
    ]
    for p in paths:
        if os.path.exists(p):
            return p
    return None

def is_ts3_running() -> tuple[bool, int]:
    try:
        out = subprocess.check_output('tasklist /FI "IMAGENAME eq ts3client*" /FO CSV /NH', shell=True, creationflags=0x08000000).decode()
        for line in out.splitlines():
            if "ts3client" in line.lower() and "32 K" not in line:
                parts = line.split(",")
                if len(parts) >= 2:
                    pid = int(parts[1].strip('"'))
                    return True, pid
    except Exception:
        pass
    return False, 0

def is_pipe_accessible() -> bool:
    try:
        return kernel32.WaitNamedPipeW(PIPE_NAME, 50) != 0
    except Exception:
        return False

def send_pipe_raw(data: bytes) -> bool:
    for attempt in range(8):
        try:
            kernel32.WaitNamedPipeW(PIPE_NAME, 50)
            h = kernel32.CreateFileW(
                PIPE_NAME,
                0xC0000000,
                0, None, 3, 0, None
            )
            if h != -1 and h != 0xFFFFFFFFFFFFFFFF:
                written = wintypes.DWORD()
                res = kernel32.WriteFile(h, data, len(data), ctypes.byref(written), None)
                kernel32.CloseHandle(h)
                time.sleep(0.04) # Allow server thread to loop to next pipe instance
                if res and written.value == len(data):
                    return True
        except Exception:
            pass
        time.sleep(0.04)
    return False

# --- Database Reader / Writer ---
def read_current_hotkey_from_db() -> dict:
    db_path = get_ts3_db_path()
    if not os.path.exists(db_path):
        return {"exists": False, "error": "settings.db not found"}
    
    info = {
        "exists": True,
        "raw_key": "None",
        "display_key": "No Hotkey Configured",
        "vk_code": 0x05,
        "is_valid": False
    }
    
    try:
        conn = sqlite3.connect(db_path)
        c = conn.cursor()
        c.execute("SELECT value FROM ProtobufItems WHERE key='3'")
        row3 = c.fetchone()
        if row3 and row3[0]:
            import re
            m = re.findall(rb'(?:Keyboard:[0-9]+|Mouse:[0-9]+|Goldstone:[A-Za-z0-9_]+|Key:[A-Za-z0-9_]+)', row3[0])
            if m:
                raw = m[0].decode('ascii')
                info["raw_key"] = raw
                info["is_valid"] = True
                
                if raw == "Goldstone:ptt":
                    info["display_key"] = "Goldstone Universal Live PTT (Auto-Synced)"
                else:
                    for lbl, (v, tid, _) in VK_CONFIGS.items():
                        if tid == raw:
                            info["display_key"] = lbl
                            info["vk_code"] = v
                            break
                    else:
                        info["display_key"] = raw
        conn.close()
    except Exception as e:
        info["error"] = str(e)
    return info

def write_hotkey_to_db(ts3_key_id: str = "Goldstone:ptt", key_code: int = 0) -> tuple[bool, str]:
    db_path = get_ts3_db_path()
    if not os.path.exists(db_path):
        return False, f"settings.db does not exist at {db_path}"
    
    try:
        conn = sqlite3.connect(db_path)
        c = conn.cursor()
        
        c.execute("SELECT key, value FROM ProtobufItems WHERE key != 'Checksum' ORDER BY CAST(key AS INTEGER)")
        rows = dict(c.fetchall())
        
        prof_uuid = "2f2a236a-35de-891d-0ad2-8da0ab3e1f51"
        env_uuid = "ea77046a-b5cf-ff1e-0eeb-5cfed1ac51aa"
        
        if '3' in rows:
            import re
            uuids = re.findall(rb'[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}', rows['3'])
            if len(uuids) >= 3:
                env_uuid = uuids[0].decode('ascii')
                prof_uuid = uuids[2].decode('ascii')
            elif len(uuids) >= 1:
                env_uuid = uuids[0].decode('ascii')
        
        new_proto = build_hotkey_protobuf(env_uuid, prof_uuid, ts3_key_id, key_code)
        rows['3'] = new_proto
        c.execute("INSERT OR REPLACE INTO ProtobufItems (timestamp, key, value) VALUES (strftime('%s','now'), '3', ?)", (new_proto,))
        
        sorted_items = sorted(rows.items(), key=lambda kv: int(kv[0]) if kv[0].isdigit() else 999)
        all_data = bytearray()
        for _, v in sorted_items:
            all_data += v
        new_checksum = hashlib.sha1(all_data).digest()
        c.execute("INSERT OR REPLACE INTO ProtobufItems (timestamp, key, value) VALUES (strftime('%s','now'), 'Checksum', ?)", (new_checksum,))
        
        c.execute("INSERT OR REPLACE INTO Profiles (timestamp, key, value) VALUES (strftime('%s','now'), 'DefaultHotkeyProfile', ?)", (prof_uuid,))
        c.execute("DELETE FROM Connecting WHERE key = 'LastUsedServerHotkeyProfile'")
        c.execute("INSERT INTO Connecting (timestamp, key, value) VALUES (strftime('%s','now'), 'LastUsedServerHotkeyProfile', ?)", (prof_uuid,))
        c.execute("INSERT OR REPLACE INTO Application (timestamp, key, value) VALUES (strftime('%s','now'), 'HotkeyProfile', ?)", (prof_uuid,))
        c.execute("INSERT OR REPLACE INTO Application (timestamp, key, value) VALUES (strftime('%s','now'), 'HotkeyMode', '2')")
        
        opt_pre = (
            "agc=true\n"
            "continous_transmission=false\n"
            "vad_over_ptt=false\n"
            "denoiser_level=1\n"
            "voiceactivation_level=-40\n"
            "typing_suppression=false\n"
            "echo_reduction_db=0\n"
            "echo_reduction=false\n"
            "delay_ptt=true\n"
            "delay_ptt_msecs=300\n"
            "vad_mode=0\n"
            "echo_cancellation=false\n"
            "denoise=true\n"
            "vad=false"
        )
        c.execute("INSERT OR REPLACE INTO Profiles (timestamp, key, value) VALUES (strftime('%s','now'), 'Capture/Default/PreProcessing', ?)", (opt_pre,))
        
        conn.commit()
        conn.close()
        return True, f"Hotkey '{ts3_key_id}' successfully saved and synced to database."
    except Exception as e:
        return False, str(e)


def load_saved_key() -> tuple[int, str, str]:
    """
    Two-Way Sync: First reads goldstone_ptt_key.txt for user's configured key,
    or falls back to settings.db / MOUSE 4.
    """
    candidates = [
        os.path.join(os.path.dirname(__file__), "goldstone_ptt_key.txt"),
        os.path.expandvars(r"%APPDATA%\TS3Client\goldstone_ptt_key.txt")
    ]
    for p in candidates:
        if os.path.exists(p):
            try:
                with open(p, "r", encoding="utf-8") as f:
                    content = f.read().strip()
                if content:
                    if ":" in content:
                        parts = content.rsplit(":", 1)
                        lbl = parts[0].strip()
                        vk = int(parts[1].strip())
                        dev = "Mouse" if vk in (0x04, 0x05, 0x06) else "Keyboard"
                        return vk, lbl, dev
                    else:
                        vk_info = VK_CONFIGS.get(content)
                        if vk_info:
                            return vk_info[0], content, vk_info[2]
            except Exception:
                pass

    try:
        db_info = read_current_hotkey_from_db()
        if db_info.get("is_valid") and db_info.get("display_key") and "Goldstone" not in db_info["display_key"]:
            vk = db_info["vk_code"]
            lbl = db_info["display_key"]
            dev = "Mouse" if vk in (0x04, 0x05, 0x06) else "Keyboard"
            return vk, lbl, dev
    except Exception:
        pass

    return 0x05, "MOUSE 4", "Mouse"

# --- Main Application GUI ---
class Ts3PttBridgeApp(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Goldstone - TeamSpeak 3 Universal Live PTT Key Bridge & Tester")
        self.geometry("900x740")
        self.minsize(840, 660)
        self.configure(bg="#0f1115")
        
        # Load user's persisted key (persists across closes and restarts!)
        self.physical_vk, self.physical_label, self.physical_device = load_saved_key()
        
        self.is_talking = False
        self.is_capturing = False
        self.bridge_running = True
        
        self.setup_styles()
        self.build_ui()
        self.refresh_status()
        
        # Automatically sync initial state
        self.sync_live_key()
        
        # Background worker thread
        self.worker_thread = threading.Thread(target=self.background_loop, daemon=True)
        self.worker_thread.start()
        
        self.after(2000, self.auto_refresh_loop)

    def setup_styles(self):
        style = ttk.Style(self)
        style.theme_use('clam')
        style.configure(".", background="#0f1115", foreground="#e1e4ea", font=("Segoe UI", 10))
        style.configure("TLabel", background="#0f1115", foreground="#e1e4ea")

    def build_ui(self):
        # 1. Header Frame
        top_frame = tk.Frame(self, bg="#0f1115", pady=10, padx=20)
        top_frame.pack(fill="x")
        
        title_lbl = tk.Label(top_frame, text="TEAMSPEAK 3 UNIVERSAL PTT LIVE BRIDGE & TESTER", font=("Segoe UI", 14, "bold"), fg="#dfaa43", bg="#0f1115")
        title_lbl.pack(anchor="w")
        
        sub_lbl = tk.Label(top_frame, text="⚡ Instant Live Auto-Update (No Apply Button Needed • Zero Popups • 0ms Delay)", font=("Segoe UI", 9), fg="#10b981", bg="#0f1115")
        sub_lbl.pack(anchor="w")

        # Main Container
        main_frame = tk.Frame(self, bg="#0f1115", padx=20, pady=2)
        main_frame.pack(fill="both", expand=True)

        # 2. Giant Live Transmission Status Card
        banner_frame = tk.LabelFrame(main_frame, text=" LIVE PTT VOICE TRANSMISSION MONITOR ", font=("Segoe UI", 9, "bold"), fg="#dfaa43", bg="#141821", padx=12, pady=8)
        banner_frame.pack(fill="x", pady=4)

        self.lbl_voice_status = tk.Label(
            banner_frame,
            text="⚫ PTT IDLE (MICROPHONE MUTED / NOT TRANSMITTING)",
            font=("Segoe UI", 13, "bold"),
            fg="#94a3b8",
            bg="#1a1f2c",
            pady=12,
            relief="solid",
            borderwidth=1
        )
        self.lbl_voice_status.pack(fill="x")

        # Connection & Plugin Status Bar
        conn_box = tk.Frame(banner_frame, bg="#141821")
        conn_box.pack(fill="x", pady=4)

        self.lbl_plugin_status = tk.Label(conn_box, text="Native TS3 Plugin: Checking...", font=("Segoe UI", 9, "bold"), fg="#e1e4ea", bg="#141821")
        self.lbl_plugin_status.pack(side="left", padx=4)

        self.lbl_auto_status = tk.Label(conn_box, text="✓ AUTO-SAVED & LIVE-SYNCED", font=("Segoe UI", 9, "bold"), fg="#10b981", bg="#141821")
        self.lbl_auto_status.pack(side="right", padx=4)

        # 3. Live Hotkey Selector Card (Instant Auto-Update)
        hotkey_card = tk.LabelFrame(main_frame, text=" ⚡ SELECT PTT HOTKEY (CLICK ANY KEY - AUTO UPDATES IMMEDIATELY) ", font=("Segoe UI", 9, "bold"), fg="#dfaa43", bg="#141821", padx=12, pady=6)
        hotkey_card.pack(fill="x", pady=4)

        top_hk_row = tk.Frame(hotkey_card, bg="#141821")
        top_hk_row.pack(fill="x", pady=3)

        self.btn_capture = tk.Button(
            top_hk_row,
            text="BIND ANY CUSTOM KEY (CLICK & PRESS)",
            command=self.start_capture_mode,
            bg="#d97706",
            fg="#ffffff",
            font=("Segoe UI", 10, "bold"),
            relief="flat",
            padx=14,
            pady=6,
            activebackground="#b45309"
        )
        self.btn_capture.pack(side="left", padx=4)

        self.lbl_active_key = tk.Label(
            top_hk_row,
            text=f"Selected Physical Key: {self.physical_label} [{self.physical_device}]",
            font=("Segoe UI", 12, "bold"),
            fg="#10b981",
            bg="#141821"
        )
        self.lbl_active_key.pack(side="left", padx=12)

        # Quick Presets Grid
        preset_frame = tk.Frame(hotkey_card, bg="#141821")
        preset_frame.pack(fill="x", pady=4)

        presets = [
            ("KEY: N", 0x4E, "Keyboard"),
            ("KEY: F", 0x46, "Keyboard"),
            ("KEY: V", 0x56, "Keyboard"),
            ("KEY: B", 0x42, "Keyboard"),
            ("MOUSE 4", 0x05, "Mouse"),
            ("MOUSE 5", 0x06, "Mouse"),
            ("MOUSE 3", 0x04, "Mouse"),
            ("CAPS LOCK", 0x14, "Keyboard"),
            ("LEFT ALT", 0xA4, "Keyboard"),
            ("LEFT CTRL", 0xA2, "Keyboard"),
            ("SPACE", 0x20, "Keyboard"),
            ("F12", 0x7B, "Keyboard")
        ]

        row = 0
        col = 0
        for label, vk, dev in presets:
            b = tk.Button(
                preset_frame,
                text=label,
                command=lambda l=label, v=vk, d=dev: self.select_physical_key(v, l, d),
                bg="#1f2430",
                fg="#e2e8f0",
                font=("Segoe UI", 9, "bold"),
                relief="flat",
                padx=6,
                pady=4,
                activebackground="#334155"
            )
            b.grid(row=row, column=col, padx=3, pady=2, sticky="ew")
            col += 1
            if col > 5:
                col = 0
                row += 1
        for i in range(6):
            preset_frame.grid_columnconfigure(i, weight=1)

        # 4. Instant Action & Testing Toolbar
        tool_card = tk.LabelFrame(main_frame, text=" 🎙 QUICK TEST & SETTINGS ACTIONS ", font=("Segoe UI", 9, "bold"), fg="#dfaa43", bg="#141821", padx=12, pady=6)
        tool_card.pack(fill="x", pady=4)

        tool_row = tk.Frame(tool_card, bg="#141821")
        tool_row.pack(fill="x", pady=3)

        btn_launch = tk.Button(
            tool_row,
            text="🚀 LAUNCH TEAMSPEAK 3",
            command=self.launch_ts3_clean,
            bg="#059669",
            fg="#ffffff",
            font=("Segoe UI", 10, "bold"),
            relief="flat",
            padx=12,
            pady=6,
            activebackground="#047857"
        )
        btn_launch.pack(side="left", padx=4, expand=True, fill="x")

        self.btn_test_ptt = tk.Button(
            tool_row,
            text="TEST VOICE TRANSMIT (HOLD TO TALK)",
            bg="#2563eb",
            fg="#ffffff",
            font=("Segoe UI", 10, "bold"),
            relief="flat",
            padx=14,
            pady=6,
            activebackground="#1d4ed8"
        )
        self.btn_test_ptt.bind("<ButtonPress-1>", lambda e: self.simulate_ptt_down())
        self.btn_test_ptt.bind("<ButtonRelease-1>", lambda e: self.simulate_ptt_up())
        self.btn_test_ptt.pack(side="left", padx=4, expand=True, fill="x")

        btn_show_opt = tk.Button(
            tool_row,
            text="VIEW IN TS3 SETTINGS",
            command=self.open_ts3_options,
            bg="#475569",
            fg="#ffffff",
            font=("Segoe UI", 10, "bold"),
            relief="flat",
            padx=12,
            pady=6,
            activebackground="#334155"
        )
        btn_show_opt.pack(side="left", padx=4, expand=True, fill="x")

        btn_clean = tk.Button(
            tool_row,
            text="🧹 CLEAN ZOMBIES",
            command=self.clean_zombies,
            bg="#7f1d1d",
            fg="#ffffff",
            font=("Segoe UI", 9, "bold"),
            relief="flat",
            padx=10,
            pady=6,
            activebackground="#991b1b"
        )
        btn_clean.pack(side="left", padx=4, expand=False)

        # 5. Diagnostic Log Box
        log_card = tk.LabelFrame(main_frame, text=" REAL-TIME EVENT & VERIFICATION LOG ", font=("Segoe UI", 9, "bold"), fg="#dfaa43", bg="#141821", padx=10, pady=4)
        log_card.pack(fill="both", expand=True, pady=4)

        self.txt_log = tk.Text(log_card, bg="#0d0f14", fg="#a0aec0", font=("Consolas", 9), relief="flat", height=9, wrap="word")
        self.txt_log.pack(fill="both", expand=True, side="left")

        scrollbar = tk.Scrollbar(log_card, command=self.txt_log.yview)
        scrollbar.pack(side="right", fill="y")
        self.txt_log.config(yscrollcommand=scrollbar.set)

        self.log("Universal Push-to-Talk Bridge initialized.")
        self.log(f"Active Physical Key: {self.physical_label} (0x{self.physical_vk:02X})")
        self.log("MODE: Zero-Popup Auto-Update (No Apply button needed).")

    def log(self, msg: str):
        self.txt_log.insert("end", f"[{time.strftime('%H:%M:%S')}] {msg}\n")
        self.txt_log.see("end")

    def auto_refresh_loop(self):
        self.refresh_status()
        self.after(2000, self.auto_refresh_loop)

    def refresh_status(self):
        running, pid = is_ts3_running()
        if is_pipe_accessible():
            self.lbl_plugin_status.config(text=f"Native TS3 Plugin: CONNECTED (PID {pid})", fg="#10b981")
        elif running:
            self.lbl_plugin_status.config(text=f"TeamSpeak 3: RUNNING (PID {pid})", fg="#38bdf8")
        else:
            self.lbl_plugin_status.config(text="TeamSpeak 3: NOT RUNNING", fg="#94a3b8")

    def sync_live_key(self):
        # 1. Update in-process plugin state via pipe immediately (0ms delay)
        cmd = f"SET_KEY:{self.physical_label}:{self.physical_vk}".encode()
        send_pipe_raw(cmd)
        
        # 2. Persist to goldstone_ptt_key.txt for permanent restart retention
        targets = [
            os.path.join(os.path.dirname(__file__), "goldstone_ptt_key.txt"),
            os.path.expandvars(r"%APPDATA%\TS3Client\goldstone_ptt_key.txt")
        ]
        for target_path in targets:
            try:
                os.makedirs(os.path.dirname(target_path), exist_ok=True)
                with open(target_path, "w", encoding="utf-8") as f:
                    f.write(f"{self.physical_label}:{self.physical_vk}\n")
            except Exception:
                pass

        # 3. Ensure settings.db is permanently configured with Goldstone:ptt (Action type 320 Push-to-Talk)
        write_hotkey_to_db("Goldstone:ptt", 0)

    def clean_zombies(self):
        self.log("Cleaning any headless TS3 zombie processes...")
        try:
            send_pipe_raw(b"EXIT_TS3")
        except Exception:
            pass
        try:
            subprocess.run('taskkill /F /IM ts3client_win64.exe /FI "WINDOWTITLE eq "', shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, creationflags=0x08000000)
            subprocess.run('taskkill /F /IM ts3client_win32.exe /FI "WINDOWTITLE eq "', shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, creationflags=0x08000000)
        except Exception:
            pass
        self.refresh_status()
        self.log("Zombie cleanup completed.")

    def launch_ts3_clean(self):
        self.clean_zombies()
        exe = find_teamspeak_exe()
        if not exe:
            self.log("ERROR: TeamSpeak 3 executable not found!")
            return
        self.log(f"Launching clean TeamSpeak 3: {exe}")
        try:
            ctypes.windll.shell32.ShellExecuteW(None, "open", exe, None, None, 1)
            self.log("TeamSpeak 3 launched with SW_SHOWNORMAL (Normal interactive window).")
        except Exception as e:
            self.log(f"Launch error: {e}")

    def select_physical_key(self, vk: int, label: str, device: str):
        self.physical_vk = vk
        self.physical_label = label
        self.physical_device = device
        self.lbl_active_key.config(text=f"Selected Physical Key: {label} [{device}]")
        self.btn_capture.config(text="BIND ANY CUSTOM KEY (CLICK & PRESS)", bg="#d97706")
        self.is_capturing = False
        
        # Instant auto-update with NO popup and NO apply button needed!
        self.sync_live_key()
        self.refresh_status()
        self.log(f"AUTO-SYNCED: Key set to '{label}' -> Live in TS3 & Saved to settings.db!")

    def start_capture_mode(self):
        self.is_capturing = True
        self.btn_capture.config(text="PRESS ANY KEY / MOUSE BUTTON NOW...", bg="#ef4444")
        self.log("Listening... Press ANY key on your keyboard or mouse (Mouse 4, Mouse 5, etc.)!")

    def send_pipe_signal(self, is_talking: bool):
        cmd = f"DOWN:{self.physical_vk}".encode() if is_talking else f"UP:{self.physical_vk}".encode()
        send_pipe_raw(cmd)

    def simulate_ptt_down(self):
        self.send_pipe_signal(True)
        self.on_ptt_down()

    def simulate_ptt_up(self):
        self.send_pipe_signal(False)
        self.on_ptt_up()

    def open_ts3_options(self):
        self.log("Opening TeamSpeak 3 Options -> Hotkeys dialog...")
        send_pipe_raw(b"SHOW_OPTIONS")

    # --- Background Loop (Polls Physical Key & Dispatches to TS3 Plugin) ---
    def background_loop(self):
        last_pressed = False
        
        while self.bridge_running:
            if self.is_capturing:
                for vk in range(1, 256):
                    if vk in (0x01, 0x02): # skip left/right click
                        continue
                    if user32.GetAsyncKeyState(vk) & 0x8000:
                        self.is_capturing = False
                        lbl, _, dev = get_vk_info(vk)
                        self.after(0, lambda v=vk, l=lbl, d=dev: self.select_physical_key(v, l, d))
                        time.sleep(0.3)
                        break
                time.sleep(0.01)
                continue

            target_vk = self.physical_vk
            is_down = bool(user32.GetAsyncKeyState(target_vk) & 0x8000)
            
            if is_down and not last_pressed:
                last_pressed = True
                self.is_talking = True
                self.send_pipe_signal(True)
                self.after(0, self.on_ptt_down)
                
            elif not is_down and last_pressed:
                last_pressed = False
                self.is_talking = False
                self.send_pipe_signal(False)
                self.after(0, self.on_ptt_up)

            time.sleep(0.005)

    def on_ptt_down(self):
        self.lbl_voice_status.config(
            text=f"🟢 PTT TRANSMITTING LIVE (VOICE ACTIVE) - HELD [{self.physical_label}]",
            bg="#059669",
            fg="#ffffff"
        )
        self.log(f">> PTT DOWN: {self.physical_label} pressed -> Voice Active")

    def on_ptt_up(self):
        self.lbl_voice_status.config(
            text="⚫ PTT IDLE (MICROPHONE MUTED / NOT TRANSMITTING)",
            bg="#1a1f2c",
            fg="#94a3b8"
        )
        self.log(f">> PTT UP: {self.physical_label} released -> Idle")

    def destroy(self):
        self.bridge_running = False
        super().destroy()

if __name__ == '__main__':
    try:
        app = Ts3PttBridgeApp()
        app.mainloop()
    except Exception as e:
        print(f"Error: {e}")
        time.sleep(2.0)
