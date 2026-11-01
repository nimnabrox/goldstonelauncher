import ctypes
import time
from ctypes import wintypes

user32 = ctypes.windll.user32

KEYEVENTF_KEYUP = 0x0002
KEYEVENTF_EXTENDEDKEY = 0x0001

def press_key(vk_code):
    scan_code = user32.MapVirtualKeyW(vk_code, 0)
    user32.keybd_event(vk_code, scan_code, 0, 0)

def release_key(vk_code):
    scan_code = user32.MapVirtualKeyW(vk_code, 0)
    user32.keybd_event(vk_code, scan_code, KEYEVENTF_KEYUP, 0)

print("Testing simulated keypress...")
press_key(0x4E) # 'N'
time.sleep(0.1)
release_key(0x4E)
print("Keypress test completed successfully.")

