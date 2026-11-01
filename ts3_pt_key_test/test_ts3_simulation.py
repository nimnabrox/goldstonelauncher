import ctypes
import time
from ctypes import wintypes

user32 = ctypes.windll.user32

# SendInput structures
class KEYBDINPUT(ctypes.Structure):
    _fields_ = [
        ("wVk", wintypes.WORD),
        ("wScan", wintypes.WORD),
        ("dwFlags", wintypes.DWORD),
        ("time", wintypes.DWORD),
        ("dwExtraInfo", ctypes.c_ulonglong)
    ]

class INPUT(ctypes.Structure):
    class _INPUT(ctypes.Union):
        _fields_ = [("ki", KEYBDINPUT)]
    _anonymous_ = ("_input",)
    _fields_ = [
        ("type", wintypes.DWORD),
        ("_input", _INPUT)
    ]

INPUT_KEYBOARD = 1
KEYEVENTF_KEYUP = 0x0002
KEYEVENTF_SCANCODE = 0x0008
KEYEVENTF_EXTENDEDKEY = 0x0001

def send_input_key(vk_code: int, is_up: bool):
    scan_code = user32.MapVirtualKeyW(vk_code, 0)
    flags = 0
    if is_up:
        flags |= KEYEVENTF_KEYUP
    
    # Send both virtual key and hardware scan code
    inp = INPUT()
    inp.type = INPUT_KEYBOARD
    inp.ki.wVk = vk_code
    inp.ki.wScan = scan_code
    inp.ki.dwFlags = flags
    inp.ki.time = 0
    inp.ki.dwExtraInfo = 0
    
    res = user32.SendInput(1, ctypes.byref(inp), ctypes.sizeof(INPUT))
    return res

def send_scancode_key(vk_code: int, is_up: bool):
    """Sends pure hardware scancode (bypasses DirectInput filters)"""
    scan_code = user32.MapVirtualKeyW(vk_code, 0)
    flags = KEYEVENTF_SCANCODE
    if is_up:
        flags |= KEYEVENTF_KEYUP
    
    inp = INPUT()
    inp.type = INPUT_KEYBOARD
    inp.ki.wVk = 0 # Ignored when KEYEVENTF_SCANCODE is set
    inp.ki.wScan = scan_code
    inp.ki.dwFlags = flags
    inp.ki.time = 0
    inp.ki.dwExtraInfo = 0
    
    res = user32.SendInput(1, ctypes.byref(inp), ctypes.sizeof(INPUT))
    return res

print("Testing send_input_key for 'N' (0x4E)...")
r1 = send_input_key(0x4E, False)
print("Key Down res:", r1)
time.sleep(0.1)
r2 = send_input_key(0x4E, True)
print("Key Up res:", r2)

print("\nTesting send_scancode_key for 'N' (0x4E)...")
r3 = send_scancode_key(0x4E, False)
print("Scancode Down res:", r3)
time.sleep(0.1)
r4 = send_scancode_key(0x4E, True)
print("Scancode Up res:", r4)

