======================================================================
  GOLDSTONE RESHADE TOGGLE KEY LIVE TESTER SUITE
======================================================================

PURPOSE:
  This test tool allows you to change the ReShade effects toggle key
  and have it take effect INSTANTLY in-game in RedM WITHOUT opening
  any ReShade overlay menu and WITHOUT manually clicking 'Reload'!

HOW IT WORKS:
  1. Permanent Storage: Writes KeyEffects=<VK>,0,0,0 to ReShade.ini.
  2. Instant Live Memory Sync: Connects directly to RedM's game engine
     process (PID) and writes the new virtual key into ReShade's active
     in-memory runtime structure (_effects_key_data at +0x94).
  3. Shader Synchronization: Dispatches a silent VK_PAUSE signal to RedM
     to keep the shader compiler and preset in sync.
  4. Instant Result: As soon as you select a new key, you can switch
     straight to RedM and press the key - effects toggle immediately!

MENU OPTIONS:
  1 - 9 : Select a preset hotkey (F7-F11, INSERT, END, HOME, PAGE DOWN)
  C     : Enter any custom key name (e.g. F6, X, G, NUMPAD5) or numeric VK code
  R     : Re-sync active key to memory & re-send reload signal
  T     : Test Toggle Effects Now (simulates hotkey press on RedM to toggle effects ON / OFF)
  S     : Run Multi-Key Stress Test (rapid automated 9-key live cycle with readback verification)
  D     : Run Diagnostic Report (checks live memory address, effects state, INI, logs)
  F     : Focus RedM Game Window (brings RedM to the front)
  Q     : Quit the tester

COMMAND LINE USAGE:
  run_test.bat F7
  run_test.bat F8
  run_test.bat S
  run_test.bat T
  run_test.bat D
  run_test.bat R
======================================================================
