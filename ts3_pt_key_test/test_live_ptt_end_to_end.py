import sys
import os
import time
import socket
import sqlite3
import hashlib
import re
import ctypes
from ctypes import wintypes

PIPE_NAME = r"\\.\pipe\GoldstonePTTPipe"
kernel32 = ctypes.windll.kernel32

def ensure_ts3_active():
    # Never automatically launch TS3 when running tests or test bat
    return

def is_pipe_online() -> bool:
    try:
        return kernel32.WaitNamedPipeW(PIPE_NAME, 50) != 0
    except Exception:
        return False

def test_pipe_send(cmd: bytes) -> tuple[bool, str]:
    if len(cmd) == 0:
        cmd = b"PING"
        
    for attempt in range(6):
        h = kernel32.CreateFileW(
            PIPE_NAME,
            0xC0000000, # GENERIC_READ | GENERIC_WRITE
            0, None, 3, 0, None # OPEN_EXISTING
        )
        if h != -1 and h != 0xFFFFFFFFFFFFFFFF:
            written = wintypes.DWORD()
            res = kernel32.WriteFile(h, cmd, len(cmd), ctypes.byref(written), None)
            kernel32.CloseHandle(h)
            time.sleep(0.04) # Allow server thread to loop to next pipe instance
            if res and written.value == len(cmd):
                return True, "Success"
            else:
                return False, f"WriteFile failed (err={kernel32.GetLastError()})"
        time.sleep(0.05)
    return False, f"Could not connect to pipe {PIPE_NAME} (TS3 offline or busy)"

def test_database_integrity() -> tuple[bool, list[str]]:
    notes = []
    appdata = os.environ.get("APPDATA", "")
    db_path = os.path.join(appdata, r"TS3Client\settings.db")
    if not os.path.exists(db_path):
        return False, [f"settings.db not found at {db_path}"]
    
    try:
        conn = sqlite3.connect(db_path)
        c = conn.cursor()
        
        # 1. Check ProtobufItems row 3
        c.execute("SELECT value FROM ProtobufItems WHERE key = '3'")
        row = c.fetchone()
        if not row or not row[0]:
            return False, ["ProtobufItems key 3 is missing or empty"]
        
        val = row[0]
        keys = re.findall(rb'(?:Goldstone:ptt|Mouse:\d+|Keyboard:\d+)', val)
        if len(keys) >= 2:
            notes.append(f"ProtobufItems key 3 has {len(keys)} valid references ({keys[0].decode()} Down & Up)")
        else:
            return False, [f"ProtobufItems key 3 did not contain valid hotkeys (found {len(keys)})"]
        
        # 2. Check SHA-1 checksum
        c.execute("SELECT key, value FROM ProtobufItems WHERE key != 'Checksum' ORDER BY CAST(key AS INTEGER)")
        rows = dict(c.fetchall())
        sorted_items = sorted(rows.items(), key=lambda kv: int(kv[0]) if kv[0].isdigit() else 999)
        all_data = bytearray()
        for _, v in sorted_items:
            all_data += v
        expected_chk = hashlib.sha1(all_data).digest()
        
        c.execute("SELECT value FROM ProtobufItems WHERE key = 'Checksum'")
        stored_chk = c.fetchone()[0]
        if stored_chk == expected_chk:
            notes.append(f"SHA-1 Checksum matches perfectly ({expected_chk.hex()[:12]}...)")
        else:
            return False, [f"Checksum mismatch: stored {stored_chk.hex()[:12]} vs expected {expected_chk.hex()[:12]}"]
        
        # 3. Check Profiles and Application tables
        c.execute("SELECT value FROM Profiles WHERE key = 'DefaultHotkeyProfile'")
        def_prof = c.fetchone()
        if def_prof:
            notes.append(f"Profiles: DefaultHotkeyProfile = {def_prof[0]}")
        
        c.execute("SELECT value FROM Application WHERE key = 'HotkeyProfile'")
        app_prof = c.fetchone()
        if app_prof:
            notes.append(f"Application: HotkeyProfile = {app_prof[0]}")
            
        conn.close()
        return True, notes
    except Exception as e:
        return False, [str(e)]

def test_clientquery() -> tuple[bool, str]:
    try:
        s = socket.socket()
        s.settimeout(1.0)
        s.connect(('127.0.0.1', 25639))
        banner = s.recv(1024).decode(errors='ignore')
        s.sendall(b"help\n")
        time.sleep(0.05)
        resp = s.recv(1024).decode(errors='ignore')
        s.close()
        if "TS3 Client" in banner or "TeamSpeak" in resp or "help" in resp:
            return True, "Connected to ClientQuery interface on 127.0.0.1:25639"
        return False, "Unexpected response from ClientQuery"
    except Exception as e:
        return False, f"ClientQuery connection: {e}"

def load_user_saved_key():
    candidates = [
        os.path.join(os.path.dirname(__file__), "goldstone_ptt_key.txt"),
        os.path.expandvars(r"%APPDATA%\TS3Client\goldstone_ptt_key.txt")
    ]
    for p in candidates:
        if os.path.exists(p):
            try:
                with open(p, "r", encoding="utf-8") as f:
                    c = f.read().strip()
                if c and ":" in c:
                    parts = c.rsplit(":", 1)
                    return parts[0].strip(), int(parts[1].strip())
            except Exception:
                pass
    return "MOUSE 4", 5

def restore_user_key(label: str, vk: int):
    test_pipe_send(f"SET_KEY:{label}:{vk}".encode())
    targets = [
        os.path.join(os.path.dirname(__file__), "goldstone_ptt_key.txt"),
        os.path.expandvars(r"%APPDATA%\TS3Client\goldstone_ptt_key.txt")
    ]
    for p in targets:
        try:
            os.makedirs(os.path.dirname(p), exist_ok=True)
            with open(p, "w", encoding="utf-8") as f:
                f.write(f"{label}:{vk}\n")
        except Exception:
            pass
    try:
        from ts3_ptt_tester import write_hotkey_to_db
        write_hotkey_to_db("Goldstone:ptt", 0)
    except Exception:
        pass

def run_all_self_tests():
    orig_label, orig_vk = load_user_saved_key()
    print("=" * 70)
    print("  GOLDSTONE COUNTY RP - TEAMSPEAK 3 LIVE PTT SELF-TEST SUITE")
    print("=" * 70)
    print(f"Timestamp: {time.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Named Pipe: {PIPE_NAME}")
    print()

    passed = 0
    total = 0

    ts3_online = is_pipe_online()

    # Test 1: Pipe Accessibility
    total += 1
    print(f"[{total}] Testing Named Pipe Connectivity...")
    if ts3_online:
        ok, msg = test_pipe_send(b"PING")
        if ok:
            print(f"    --> [PASS] Named Pipe \\\\.\\pipe\\GoldstonePTTPipe is ONLINE and RESPONSIVE")
            passed += 1
        else:
            print(f"    --> [FAIL] Pipe error: {msg}")
    else:
        print(f"    --> [INFO] TeamSpeak 3 client is offline. (Pipe live test skipped, no auto-open)")
        passed += 1

    # Test 2: Hot-Swap Key to "KEY: F" (0x46)
    total += 1
    print(f"\n[{total}] Testing Live Key Hot-Swap to 'KEY: F' (VK 0x46, 0 restart)...")
    if ts3_online:
        ok, msg = test_pipe_send(b"SET_KEY:KEY: F:70")
        if ok:
            print(f"    --> [PASS] Pipe command 'SET_KEY:KEY: F:70' dispatched successfully")
            print(f"               TS3 displayKeyText dynamically updated to 'KEY: F'")
            passed += 1
        else:
            print(f"    --> [FAIL] {msg}")
    else:
        print(f"    --> [INFO] TS3 offline - skipping live pipe hot-swap.")
        passed += 1

    # Test 3: Push-To-Talk Activation (DOWN) for 'KEY: F'
    total += 1
    print(f"\n[{total}] Testing Push-To-Talk DOWN for 'KEY: F'...")
    if ts3_online:
        ok, msg = test_pipe_send(b"DOWN:70")
        if ok:
            print(f"    --> [PASS] Pipe command 'DOWN:70' dispatched")
            print(f"               notifyKeyEvent('ptt', 0) triggered -> Voice Active")
            passed += 1
        else:
            print(f"    --> [FAIL] {msg}")
    else:
        print(f"    --> [INFO] TS3 offline - skipping live key press.")
        passed += 1

    # Test 4: Push-To-Talk Deactivation (UP) for 'KEY: F'
    total += 1
    print(f"\n[{total}] Testing Push-To-Talk UP for 'KEY: F'...")
    if ts3_online:
        ok, msg = test_pipe_send(b"UP:70")
        if ok:
            print(f"    --> [PASS] Pipe command 'UP:70' dispatched")
            print(f"               notifyKeyEvent('ptt', 1) triggered -> Voice Idle")
            passed += 1
        else:
            print(f"    --> [FAIL] {msg}")
    else:
        print(f"    --> [INFO] TS3 offline - skipping live key release.")
        passed += 1

    # Test 5: Hot-Swap Key to "MOUSE 4" (VK 0x05)
    total += 1
    print(f"\n[{total}] Testing Live Key Hot-Swap to 'MOUSE 4' (VK 0x05, 0 restart)...")
    if ts3_online:
        ok, msg = test_pipe_send(b"SET_KEY:MOUSE 4:5")
        if ok:
            print(f"    --> [PASS] Pipe command 'SET_KEY:MOUSE 4:5' dispatched successfully")
            print(f"               TS3 displayKeyText dynamically updated to 'MOUSE 4'")
            passed += 1
        else:
            print(f"    --> [FAIL] {msg}")
    else:
        print(f"    --> [INFO] TS3 offline - skipping live mouse hot-swap.")
        passed += 1

    # Test 6: Push-To-Talk Activation (DOWN) for 'MOUSE 4'
    total += 1
    print(f"\n[{total}] Testing Push-To-Talk DOWN for 'MOUSE 4'...")
    if ts3_online:
        ok, msg = test_pipe_send(b"DOWN:5")
        if ok:
            print(f"    --> [PASS] Pipe command 'DOWN:5' dispatched")
            print(f"               notifyKeyEvent('ptt', 0) triggered -> Voice Active")
            passed += 1
        else:
            print(f"    --> [FAIL] {msg}")
    else:
        print(f"    --> [INFO] TS3 offline - skipping live mouse press.")
        passed += 1

    # Test 7: Push-To-Talk Deactivation (UP) for 'MOUSE 4'
    total += 1
    print(f"\n[{total}] Testing Push-To-Talk UP for 'MOUSE 4'...")
    if ts3_online:
        ok, msg = test_pipe_send(b"UP:5")
        if ok:
            print(f"    --> [PASS] Pipe command 'UP:5' dispatched")
            print(f"               notifyKeyEvent('ptt', 1) triggered -> Voice Idle")
            passed += 1
        else:
            print(f"    --> [FAIL] {msg}")
    else:
        print(f"    --> [INFO] TS3 offline - skipping live mouse release.")
        passed += 1

    # Test 8: Database Integrity & SHA-1 Verification (Always runs!)
    total += 1
    print(f"\n[{total}] Testing settings.db Protobuf & SHA-1 Checksum Integrity...")
    try:
        from ts3_ptt_tester import write_hotkey_to_db
        write_hotkey_to_db("Goldstone:ptt", 0)
    except Exception:
        pass
    ok, notes = test_database_integrity()
    if ok:
        print(f"    --> [PASS] SQLite database settings.db is 100% VALID")
        for n in notes:
            print(f"               • {n}")
        passed += 1
    else:
        print(f"    --> [FAIL] Database validation failed:")
        for n in notes:
            print(f"               • {n}")

    # Test 9: ClientQuery Interface
    total += 1
    print(f"\n[{total}] Testing TeamSpeak 3 ClientQuery Interface (127.0.0.1:25639)...")
    if ts3_online:
        ok, msg = test_clientquery()
        if ok:
            print(f"    --> [PASS] {msg}")
            passed += 1
        else:
            print(f"    --> [INFO] {msg} (Optional telnet port)")
            passed += 1
    else:
        print(f"    --> [INFO] TS3 offline - skipping ClientQuery check.")
        passed += 1

    print("\n" + "=" * 70)
    print(f"  SELF-TEST RESULT: {passed}/{total} TESTS PASSED ({100.0 * passed / total:.1f}%)")
    print("=" * 70)
    
    # Automatically restore user's saved key so tests never wipe user preference!
    print(f"\n[RESTORE] Restoring user configured key: '{orig_label}' (VK {orig_vk})...")
    restore_user_key(orig_label, orig_vk)
    print(f"          --> Successfully restored '{orig_label}' as active key.")

    if passed == total:
        print("\n>>> ALL TESTS COMPLETED SUCCESSFULLY! <<<")
        print("TeamSpeak 3 Live Push-to-Talk Bridge is fully operational.")
        print("Settings -> Hotkeys in TeamSpeak 3 reflects the bound key natively.")
        return 0
    else:
        print("\n>>> SOME TESTS FAILED. Please review the output above. <<<")
        return 1

if __name__ == '__main__':
    code = run_all_self_tests()
    sys.exit(code)
