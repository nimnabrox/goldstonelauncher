import { useState, useEffect, useRef } from "react";

import { invoke } from "@tauri-apps/api/core";

import { listen } from "@tauri-apps/api/event";

import { open } from "@tauri-apps/plugin-dialog"; 

import loopVideo from "./gdl_bv_v1_loop.webm"; 

import goldstoneLogo from "./goldstone-logo.png";

import nbLogo from "./assets/nb_logo.jpg";



import "./App.css"; 

import {

  UserIcon,

  UsersIcon,

  HeadphonesIcon,

  RocketIcon,

  RefreshIcon,

  ShieldAlertIcon,

  SparklesIcon,

  TrashIcon,

  GearIcon,

  MinimizeIcon,

  CloseIcon,

  PlayIcon,

  PauseIcon,

  PrevTrackIcon,

  NextTrackIcon,

  RepeatIcon,

  PlaylistIcon,

  VolumeIcon,

  MusicIcon,

  SearchIcon,

  CheckIcon

} from "./Icons";



interface UpdateData { 

  version: string; 

  downloadUrl: string; 

}



interface ServerStatusResult {

  name: string;

  players: number;

  max_players: number;

  online: boolean;

  source: string;

}



export interface AudioTrack {
  id: string;
  title: string;
  artist?: string;
  filename: string;
  isCustom?: boolean;
  isBuiltin?: boolean;
  localPath?: string;
  url: string;
  streamUrl?: string;
}



export const DEFAULT_TRACKS: AudioTrack[] = [
  {
    id: 'gs01',
    title: 'Goldstone Ambience 01',
    filename: 'gs01.mp3',
    url: 'https://www.dropbox.com/scl/fi/s4yitjmtdv4r8fewxxixb/gs01.mp3?rlkey=dth64zun910oef7r8lr494fgc&st=al1ibalv&dl=0',
  },
  {
    id: 'gs02',
    title: 'Goldstone Ambience 02',
    filename: 'gs02.mp3',
    url: 'https://www.dropbox.com/scl/fi/3pb2sdysjwnh5k8k0tfhl/gs02.mp3?rlkey=gomh5fn8wdy4hsylfornieups&st=m2abmr4r&dl=0',
  },
];







function formatKeyName(code: number): string {

  switch (code) {

    case 1: return "Left Click";

    case 2: return "Right Click";

    case 4: return "Middle Click (Mouse 3)";

    case 5: return "Mouse 4 (Back)";

    case 6: return "Mouse 5 (Forward)";

    case 8: return "Backspace";

    case 9: return "Tab";

    case 13: return "Enter";

    case 20: return "Caps Lock";

    case 27: return "Escape";

    case 32: return "Space";

    case 33: return "Page Up";

    case 34: return "Page Down";

    case 35: return "End";

    case 36: return "Home";

    case 45: return "Insert";

    case 46: return "Delete";

    case 112: return "F1";

    case 113: return "F2";

    case 114: return "F3";

    case 115: return "F4";

    case 116: return "F5";

    case 117: return "F6";

    case 118: return "F7";

    case 119: return "F8";

    case 120: return "F9";

    case 121: return "F10";

    case 122: return "F11";

    case 123: return "F12";

    case 144: return "Num Lock";

    case 145: return "Scroll Lock";

    case 192: return "~ (Tilde)";

    default:

      if (code >= 65 && code <= 90) return String.fromCharCode(code);

      if (code >= 48 && code <= 57) return String.fromCharCode(code);

      if (code >= 96 && code <= 105) return `Num ${code - 96}`;

      return `Key ${code}`;

  }

}



function App() {

  const [status, setStatus] = useState("READY TO CONNECT");

  const [nickname, setNickname] = useState("");

  const [isLoading, setIsLoading] = useState(true);

  const bgVideoRef = useRef<HTMLVideoElement | null>(null);

  

  // --- PLAYER COUNTER STATES ---

  const [playerCount, setPlayerCount] = useState<number | null>(null);

  const [maxPlayers, setMaxPlayers] = useState<number>(128);

  const [serverName, setServerName] = useState("GOLDSTONE COUNTY");

  const [isOnline, setIsOnline] = useState(false);

  

  // --- MODALS & OPTIONS ---

  const [showUpdateModal, setShowUpdateModal] = useState(false);

  const [updateAvailable, setUpdateAvailable] = useState(false);

  const [updateLink, setUpdateLink] = useState("");

  const [checkingMsg, setCheckingMsg] = useState(""); 

  const [updateStep, setUpdateStep] = useState<"start" | "downloading" | "ready">("start");



  const [monitorEnabled, setMonitorEnabled] = useState<boolean>(() => localStorage.getItem("ts_monitor_enabled") === "true");

  const [targetHit, setTargetHit] = useState(false);



  const [showSettings, setShowSettings] = useState(false);

  const [tsPath, setTsPath] = useState("");

  const [redmPath, setRedmPath] = useState("");

  const [showIntro, setShowIntro] = useState(false);



  // --- RESHADE & PRESET MANAGER STATES ---

  const [showReShadeModal, setShowReShadeModal] = useState(false);

  const [reshadeInstalled, setReshadeInstalled] = useState<boolean | null>(null);

  const [reshadeProgress, setReshadeProgress] = useState(0);

  const [reshadeStatus, setReshadeStatus] = useState("READY TO INSTALL OR MANAGE RESHADE");

  const [isReShadeBusy, setIsReShadeBusy] = useState(false);

  const [, setReshadeOp] = useState<'idle' | 'install' | 'uninstall'>('idle');

  const [, setReshadeStepIndex] = useState<number>(0);

  const [reshadeSuccess, setReshadeSuccess] = useState(false);

  const selectedApi = "Auto";

  const [reshadeToggleKey, setReshadeToggleKey] = useState<number>(118); // Default F7 (118)

  const [isListeningKey, setIsListeningKey] = useState(false);

  const [keySavedFlash, setKeySavedFlash] = useState(false);



  // --- TS3 & SALTYCHAT VOICE MANAGER STATES ---

  const [showTs3Modal, setShowTs3Modal] = useState(false);

  const [ts3Installed, setTs3Installed] = useState<boolean | null>(null);
  const [saltyInstalled, setSaltyInstalled] = useState<boolean | null>(null);
  const [ts3Progress, setTs3Progress] = useState(0);
  const [ts3StatusText, setTs3StatusText] = useState("CHECKING STATUS...");
  const [ts3HintText, setTs3HintText] = useState("Checking TeamSpeak 3 and SaltyChat configuration...");

  const [isTs3Busy, setIsTs3Busy] = useState(false);

  const [proximityVoiceKey, setProximityVoiceKey] = useState("MOUSE 4");

  const [isListeningVoiceKey, setIsListeningVoiceKey] = useState(false);

  const [voiceKeySavedFlash, setVoiceKeySavedFlash] = useState(false);
  const [showTs3UninstallConfirm, setShowTs3UninstallConfirm] = useState(false);

  // --- AUDIO HARDWARE STATES ---
  const [audioInputDevices, setAudioInputDevices] = useState<{name: string; id: string}[]>([]);
  const [audioOutputDevices, setAudioOutputDevices] = useState<{name: string; id: string}[]>([]);
  const [selectedInputDev, setSelectedInputDev] = useState<string>("");
  const [selectedOutputDev, setSelectedOutputDev] = useState<string>("");
  const [audioSavedFlash, setAudioSavedFlash] = useState(false);



  // --- MUSIC STATES (DEFAULT: OFF) ---

  const [musicEnabled, setMusicEnabled] = useState<boolean>(() => {

    return localStorage.getItem("music_enabled") === "true";

  });

  const [hasNewSettingNotification, setHasNewSettingNotification] = useState<boolean>(() => {

    return !localStorage.getItem("has_seen_music_setting_v1");

  });

  const [musicPath, setMusicPath] = useState("");

  const [playlist, setPlaylist] = useState<AudioTrack[]>(DEFAULT_TRACKS);

  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);

  const [isPlaying, setIsPlaying] = useState(false);

  const [volume, setVolume] = useState(0.5);

  const [isLooping, setIsLooping] = useState(false);

  const [currentTime, setCurrentTime] = useState(0);

  const [duration, setDuration] = useState(198);

  const [showPlaylist, setShowPlaylist] = useState(false);

  const [musicSearchQuery, setMusicSearchQuery] = useState("");

  const [showMusicNewTag, setShowMusicNewTag] = useState(false);

  const [isTitleOverflowing, setIsTitleOverflowing] = useState(false);
  const [musicDownloadProgress, setMusicDownloadProgress] = useState<{ songId: string; title: string; progress: number } | null>(null);

  const titleMeasureRef = useRef<HTMLSpanElement>(null);

  const marqueeBoxRef = useRef<HTMLDivElement>(null);



  // Auto-hide NEW badge on music player after 30 minutes of first launch on this PC

  useEffect(() => {

    const FIRST_SEEN_KEY = "gsl_music_first_seen";

    const DURATION_MS = 30 * 60 * 1000; // 30 minutes

    const now = Date.now();

    

    let firstSeen = localStorage.getItem(FIRST_SEEN_KEY);

    if (!firstSeen) {

      firstSeen = String(now);

      localStorage.setItem(FIRST_SEEN_KEY, firstSeen);

    }

    

    const elapsed = now - Number(firstSeen);

    if (elapsed < DURATION_MS) {

      setShowMusicNewTag(true);

      const remaining = DURATION_MS - elapsed;

      const timer = setTimeout(() => {

        setShowMusicNewTag(false);

      }, remaining);

      return () => clearTimeout(timer);

    } else {

      setShowMusicNewTag(false);

    }

  }, []);



  const audioRef = useRef<HTMLAudioElement | null>(null);

  const musicEnabledRef = useRef<boolean>(musicEnabled);

  useEffect(() => {

    musicEnabledRef.current = musicEnabled;

  }, [musicEnabled]);

  const currentTrackIndexRef = useRef(currentTrackIndex);

  useEffect(() => {

    currentTrackIndexRef.current = currentTrackIndex;

  }, [currentTrackIndex]);

  const safePlayMusicRef = useRef<((duration?: number) => void) | null>(null);

  const musicCardRef = useRef<HTMLDivElement | null>(null);

  const modalMouseDownTarget = useRef<EventTarget | null>(null);

  const volumeRef = useRef(0.5);

  const playlistRef = useRef<AudioTrack[]>(DEFAULT_TRACKS);

  const fadeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isSeekingRef = useRef(false);

  const seekTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const blobUrlCache = useRef<Map<string, string>>(new Map());

  const isLaunchingRef = useRef(false);



  // Close playlist popover on outside click or Escape

  useEffect(() => {

    if (!showPlaylist) return;

    const handleOutsideClick = (e: MouseEvent) => {

      if (musicCardRef.current && !musicCardRef.current.contains(e.target as Node)) {

        setShowPlaylist(false);

      }

    };

    const handleEscape = (e: KeyboardEvent) => {

      if (e.key === "Escape") setShowPlaylist(false);

    };

    document.addEventListener("mousedown", handleOutsideClick);

    window.addEventListener("keydown", handleEscape);

    return () => {

      document.removeEventListener("mousedown", handleOutsideClick);

      window.removeEventListener("keydown", handleEscape);

    };

  }, [showPlaylist]);



  const CURRENT_VERSION = "0.3.1"; 

  const UPDATE_CHECK_URL = "https://raw.githubusercontent.com/nimnabrox/goldstonelauncher/main/version.json";

  const SERVER_CODE = "qe3bl6"; 

  const TS_SERVER = "play.goldstonerp.com";

  const MY_WEBSITE = "https://guns.lol/nimnabro";



  // --- WINDOW CONTROLS ---

  const minimizeWindow = () => invoke('minimize_app_backend');

  const closeWindow = () => invoke('close_app_backend');



  // --- DUAL-SOURCE LIVE PLAYER COUNTER (CFXFind & CFXR Fallback) ---

  const fetchPlayerCount = async (isManual = false) => {



    try {

      const data = await invoke<ServerStatusResult>('fetch_server_players', { serverCode: SERVER_CODE });

      if (data && typeof data.players === 'number') {

        setPlayerCount(data.players);

        setMaxPlayers(data.max_players || 128);

        setIsOnline(data.online !== false);

        setServerName("GOLDSTONE COUNTY");

        if (isManual) {

          setStatus("READY TO CONNECT");

        }

        return;

      }

    } catch {

      // Backend handles retries natively across secure endpoints

    }



  };



  const toggleMonitor = () => {

    const newState = !monitorEnabled;

    setMonitorEnabled(newState);

    localStorage.setItem("ts_monitor_enabled", String(newState));

    if (newState) {

      setStatus("67% AUTO-CONNECT ACTIVE");

      setTimeout(() => setStatus("READY TO CONNECT"), 3500);

    } else {

      setStatus("DIRECT CONNECT ACTIVE");

      setTimeout(() => setStatus("READY TO CONNECT"), 2500);

    }

  };



  const checkForUpdates = async (isSilent: boolean) => {

    try {

      if (!isSilent) setCheckingMsg("CHECKING...");

      const cleanUrl = `${UPDATE_CHECK_URL}?t=${new Date().getTime()}`;

      const data = await invoke<UpdateData>('check_update_backend', { url: cleanUrl });

      

      if (data.version !== CURRENT_VERSION) {

        setUpdateLink(data.downloadUrl); 

        setUpdateAvailable(true); 

        setCheckingMsg("");

        setShowUpdateModal(true);

      } else {

        if (!isSilent) { 

          setCheckingMsg("UP TO DATE"); 

          setTimeout(() => setCheckingMsg(""), 2500); 

        } else {

          setCheckingMsg("");

        }

      }

    } catch { 

      if (!isSilent) {

        setCheckingMsg("CHECK FAILED"); 

        setTimeout(() => setCheckingMsg(""), 2500); 

      } else {

        setCheckingMsg(""); 

      }

    }

  };



  const handleDownloadClick = async () => {

    if (!updateLink) return;

    setUpdateStep("downloading");

    try { 

      await invoke('download_only_backend', { url: updateLink }); 

      setUpdateStep("ready"); 

    } catch { 

      setUpdateStep("start"); 

      setStatus("DOWNLOAD FAILED"); 

    }

  };



  const handleInstallClick = async () => {

    try { 

      await invoke('install_only_backend'); 

    } catch { 

      setStatus("INSTALL FAILED"); 

    }

  };



  const saveNickname = (e: React.ChangeEvent<HTMLInputElement>) => {

    const val = e.target.value; 

    setNickname(val); 

    localStorage.setItem("ts_nickname", val);

  };



  const openSettings = () => {

    setShowSettings(true);

    if (hasNewSettingNotification) {

      setHasNewSettingNotification(false);

      localStorage.setItem("has_seen_music_setting_v1", "true");

    }

  };

  const closeSettings = () => setShowSettings(false);

  

  const saveSettings = () => {

    localStorage.setItem("custom_ts_path", tsPath);

    localStorage.setItem("custom_redm_path", redmPath);

    closeSettings();

    setStatus("SETTINGS SAVED");

    setTimeout(() => setStatus("READY TO CONNECT"), 2000);

  };



    const clearTsPath = () => {

    setTsPath("");

    localStorage.removeItem("custom_ts_path");

    setStatus("TS3 PATH CLEARED (AUTO-DETECT)");

    setTimeout(() => setStatus("READY TO CONNECT"), 2000);

  };



  const clearRedmPath = () => {

    setRedmPath("");

    localStorage.removeItem("custom_redm_path");

    setStatus("REDM PATH CLEARED (AUTO-DETECT)");

    setTimeout(() => setStatus("READY TO CONNECT"), 2000);

  };



  const clearMusicFolder = () => {

    setMusicPath("");

    localStorage.removeItem("music_path");

    localStorage.removeItem("music_track_index");

    setPlaylist(DEFAULT_TRACKS);

    playlistRef.current = DEFAULT_TRACKS;

    setCurrentTrackIndex(0);

    loadTrack(0, isPlaying);

    setStatus("MUSIC FOLDER CLEARED (DEFAULT SONGS ACTIVE)");

    setTimeout(() => setStatus("READY TO CONNECT"), 2500);

  };



  const browseFile = async (type: "ts" | "redm" | "music") => {

    try {

      if (type === "music") {

        const selected = await open({ directory: true, multiple: false });

        if (selected && typeof selected === 'string') {

          setMusicPath(selected);

          localStorage.setItem("music_path", selected);

          loadPlaylist(selected);

        }

      } else {

        const selected = await open({ multiple: false, filters: [{ name: 'Executable', extensions: ['exe'] }] });

        if (selected && typeof selected === 'string') {

          if (type === "ts") setTsPath(selected); else setRedmPath(selected);

        }

      }

    } catch (err) { 

      console.error(err); 

    }

  };





  const handleError = (e: any) => {

    const errStr = String(e);

    if (errStr.includes("Application not found") || errStr.includes("The system cannot find the file") || errStr.includes("could not be found")) {

      setStatus("APP NOT FOUND");

      setTimeout(() => { 

        if (window.confirm("App Not Found! Set location manually in Settings?")) openSettings(); 

      }, 500);

    } else { 

      setStatus("LAUNCH FAILED"); 

    }

  };

  

  const openMyProfile = () => { 

    invoke('open_url_backend', { url: MY_WEBSITE }); 

  };

  

  // --- LOW SPEC SYSTEM ACTIONS ---



  const fixVulkan = async () => {

    try { 

      const isRunning = await invoke<boolean>('is_game_running_backend');

      if (isRunning) {

        setStatus("GAME RUNNING! USE FORCE CLOSE FIRST TO CLEAN 100%");

        setTimeout(() => setStatus("READY TO CONNECT"), 3500);

        return;

      }

      setStatus("CLEANING VULKAN SHADERS & CACHE...");

      await invoke('fix_vulkan_error_backend'); 

      setStatus("VULKAN CACHE RESET (100% CLEAN)"); 

      setTimeout(() => setStatus("READY TO CONNECT"), 2500); 

    } catch (err) { 

      if (String(err).includes("GAME_RUNNING")) {

        setStatus("GAME RUNNING! USE FORCE CLOSE FIRST TO CLEAN 100%");

      } else {

        setStatus("VULKAN RESET FAILED");

      }

      setTimeout(() => setStatus("READY TO CONNECT"), 3500);

    }

  };



  const cleanRedmCache = async () => {

    try { 

      const isRunning = await invoke<boolean>('is_game_running_backend');

      if (isRunning) {

        setStatus("GAME RUNNING! USE FORCE CLOSE FIRST TO CLEAN 100%");

        setTimeout(() => setStatus("READY TO CONNECT"), 3500);

        return;

      }

      setStatus("CLEANING REDM CACHE...");

      await invoke('clean_redm_cache_backend'); 

      setStatus("REDM CACHE CLEANED (100% CLEAN)"); 

      setTimeout(() => setStatus("READY TO CONNECT"), 2500); 

    } catch (err) { 

      if (String(err).includes("GAME_RUNNING")) {

        setStatus("GAME RUNNING! USE FORCE CLOSE FIRST TO CLEAN 100%");

      } else {

        setStatus("CLEANUP FAILED");

      }

      setTimeout(() => setStatus("READY TO CONNECT"), 3500);

    }

  };



  // --- RESHADE ACTIONS ---

  const refreshReShadeStatus = async () => {

    try {

      const res = await invoke<{ installed: boolean; preset_name: string; shaders_count: number; toggle_key: string; toggle_key_code: number }>('check_reshade_status_backend');

      setReshadeInstalled(res.installed);

      if (res.toggle_key_code) {

        setReshadeToggleKey(res.toggle_key_code);

      }

    } catch {}

  };



  const handleToggleKeyChange = async (newCode: number) => {

    setReshadeToggleKey(newCode);

    setKeySavedFlash(true);

    setTimeout(() => setKeySavedFlash(false), 2500);

    try {

      await invoke('set_reshade_toggle_key_backend', { keyCode: newCode });

    } catch {}

  };



  // Live Keybind Capture (Keyboard or Mouse Button)

  useEffect(() => {

    if (!isListeningKey) return;



    const handleGlobalKeyDown = (e: KeyboardEvent) => {

      e.preventDefault();

      e.stopPropagation();

      const code = e.keyCode || e.which;

      if (code) {

        handleToggleKeyChange(code);

        setIsListeningKey(false);

      }

    };



    const handleGlobalMouseDown = (e: MouseEvent) => {

      e.preventDefault();

      e.stopPropagation();

      let vk = 0;

      if (e.button === 0) vk = 1; // Left Click

      else if (e.button === 1) vk = 4; // Middle Click (Mouse 3)

      else if (e.button === 2) vk = 2; // Right Click

      else if (e.button === 3) vk = 5; // Mouse 4 (Thumb Back)

      else if (e.button === 4) vk = 6; // Mouse 5 (Thumb Forward)

      if (vk > 0) {

        handleToggleKeyChange(vk);

        setIsListeningKey(false);

      }

    };



    window.addEventListener('keydown', handleGlobalKeyDown, { capture: true });

    window.addEventListener('pointerdown', handleGlobalMouseDown, { capture: true });



    return () => {

      window.removeEventListener('keydown', handleGlobalKeyDown, { capture: true });

      window.removeEventListener('pointerdown', handleGlobalMouseDown, { capture: true });

    };

  }, [isListeningKey]);



  const handleInstallReShade = async () => {

    if (isReShadeBusy) return;

    setReshadeOp('install');

    setReshadeStepIndex(0);

    setIsReShadeBusy(true);

    setReshadeSuccess(false);

    setReshadeProgress(15);

    setReshadeStatus("PREPARING RESHADE SETUP...");

    try {

      await invoke('install_reshade_backend', { graphicsApi: selectedApi, toggleKeyCode: reshadeToggleKey });

      setReshadeSuccess(true);

    } catch (e: any) {

      setReshadeStatus(`ERROR: ${e}`);

    } finally {

      setIsReShadeBusy(false);

      refreshReShadeStatus();

    refreshTs3Status();

    }

  };



  const handleUninstallReShade = async () => {

    if (isReShadeBusy) return;

    try {

      const isRunning = await invoke<boolean>('is_game_running_backend');

      if (isRunning) {

        setReshadeStatus("PLEASE CLOSE REDM BEFORE UNINSTALLING RESHADE");

        return;

      }

    } catch {}

    setReshadeOp('uninstall');

    setReshadeStepIndex(0);

    setIsReShadeBusy(true);

    setReshadeSuccess(false);

    setReshadeProgress(20);

    setReshadeStatus("REMOVING RESHADE FILES...");

    try {

      await invoke('uninstall_reshade_backend');

      setReshadeSuccess(true);

    } catch (e: any) {

      setReshadeStatus(`ERROR: ${e}`);

    } finally {

      setIsReShadeBusy(false);

      refreshReShadeStatus();

    }

  };



  // --- TS3 & SALTYCHAT ACTIONS ---

  const refreshTs3Status = async () => {

    try {

      const res = await invoke<{

        installed: boolean;

        ts3_version: string;

        salty_installed: boolean;

        salty_version: string;

        proximity_key: string;

      }>('check_ts3_status_backend');

      setTs3Installed(res.installed);

      setSaltyInstalled(res.installed && res.salty_installed);

      if (res.proximity_key) {

        setProximityVoiceKey(res.proximity_key);

      }

      if (res.installed && res.salty_installed) {

        setTs3Progress(100);

        setTs3StatusText("VOICE READY • ALL SYSTEMS UP TO DATE");

        setTs3HintText("TeamSpeak 3 & SaltyChat are ready for Goldstone County RP.");

      } else if (res.installed && !res.salty_installed) {

        setTs3Progress(50);

        setTs3StatusText("SALTYCHAT NOT INSTALLED");

        setTs3HintText("SaltyChat plugin is required for 3D proximity chat.");

      } else {

        setTs3Progress(0);

        setTs3StatusText("NOT INSTALLED");

        setTs3HintText("TeamSpeak 3 and SaltyChat are required for Goldstone voice.");

      }

      await refreshTs3AudioDevices();

    } catch {}

  };



  const refreshTs3AudioDevices = async () => {
    try {
      const res = await invoke<{
        input_devices: { name: string; id: string }[];
        output_devices: { name: string; id: string }[];
        current_input_id: string;
        current_output_id: string;
      }>('get_ts3_audio_devices_backend');
      if (res) {
        setAudioInputDevices(res.input_devices || []);
        setAudioOutputDevices(res.output_devices || []);
        setSelectedInputDev(res.current_input_id || "");
        setSelectedOutputDev(res.current_output_id || "");
      }
    } catch (err) {
      console.error("Failed to load audio devices:", err);
    }
  };

  const handleAudioDeviceChange = async (deviceType: 'input' | 'output', deviceId: string) => {
    try {
      const devList = deviceType === 'input' ? audioInputDevices : audioOutputDevices;
      const matched = devList.find(d => d.id === deviceId);
      const devName = matched ? matched.name : (deviceId === "" ? "Default" : "Audio Device");

      if (deviceType === 'input') {
        setSelectedInputDev(deviceId);
      } else {
        setSelectedOutputDev(deviceId);
      }

      await invoke('set_ts3_audio_device_backend', {
        deviceType,
        deviceName: devName,
        deviceId: deviceId,
      });

      setAudioSavedFlash(true);
      setTimeout(() => setAudioSavedFlash(false), 2400);
    } catch (err) {
      console.error("Failed to save audio device:", err);
    }
  };

  const handleProximityKeyChange = async (newKey: string) => {

    setProximityVoiceKey(newKey);

    setVoiceKeySavedFlash(true);

    try {

      await invoke('set_ts3_proximity_key_backend', { keyName: newKey });

    } catch (err) {

      console.error("Failed to save TS3 proximity key:", err);

    }

    setTimeout(() => setVoiceKeySavedFlash(false), 2200);

  };



  
  // Auto-refresh TeamSpeak & SaltyChat status & live hardware changes
  useEffect(() => {
    if (!showTs3Modal) return;
    refreshTs3Status();
    refreshTs3AudioDevices();

    // Auto-poll devices every 2.5s while manager modal is open
    const interval = setInterval(() => {
      refreshTs3AudioDevices();
    }, 2500);

    const handleFocus = () => {
      refreshTs3Status();
      refreshTs3AudioDevices();
    };
    window.addEventListener('focus', handleFocus);

    let removeDevListener: (() => void) | null = null;
    if (typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
      const handleDeviceChange = () => {
        refreshTs3AudioDevices();
      };
      navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
      removeDevListener = () => {
        navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
      };
    }

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      if (removeDevListener) removeDevListener();
    };
  }, [showTs3Modal]);

const handleInstallTs3 = async () => {

    if (isTs3Busy) return;

    setIsTs3Busy(true);

    setTs3StatusText(ts3Installed ? "INSTALLING SALTYCHAT..." : "INSTALLING TS3 & SALTYCHAT...");

    setTs3HintText("Setting up official 3D voice packages...");

    try {
      await invoke('install_ts3_backend');
      await refreshTs3Status();
    } catch (err) {
      console.error("Install TS3 failed:", err);
      await refreshTs3Status();
    } finally {
      setIsTs3Busy(false);
    }
  };

  const handleUninstallTs3 = async () => {
    if (isTs3Busy) return;
    setIsTs3Busy(true);
    setTs3StatusText("UNINSTALLING...");
    setTs3HintText("Closing voice client and cleaning files...");

    try {
      await invoke('uninstall_ts3_backend');
      await refreshTs3Status();
    } catch (err) {
      console.error("Uninstall TS3 failed:", err);
      await refreshTs3Status();
    } finally {
      setIsTs3Busy(false);
    }
  };

  const confirmAndExecuteUninstall = async () => {
    setShowTs3UninstallConfirm(false);
    await handleUninstallTs3();
  };



  // Hotkey listener for Proximity Voice Key capture

  useEffect(() => {

    if (!isListeningVoiceKey) return;



    const handleKeyDown = (e: KeyboardEvent) => {

      e.preventDefault();

      e.stopPropagation();



      let keyName = e.key;

      if (e.code.startsWith('Key')) keyName = e.code.substring(3);

      else if (e.code === 'CapsLock') keyName = 'CAPS LOCK';

      else if (e.code === 'AltLeft' || e.code === 'AltRight') keyName = 'LEFT ALT';

      else if (e.code === 'ControlLeft' || e.code === 'ControlRight') keyName = 'LEFT CTRL';

      else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') keyName = 'LEFT SHIFT';

      else if (e.code === 'Space') keyName = 'SPACE';

      else if (e.code === 'Escape') {

        setIsListeningVoiceKey(false);

        return;

      }



      handleProximityKeyChange(keyName.toUpperCase());

      setIsListeningVoiceKey(false);

    };



    const handleMouseDown = (e: MouseEvent) => {

      let btnName = "";

      if (e.button === 1) btnName = "MIDDLE CLICK";

      else if (e.button === 3) btnName = "MOUSE 4";

      else if (e.button === 4) btnName = "MOUSE 5";



      if (btnName) {

        e.preventDefault();

        e.stopPropagation();

        handleProximityKeyChange(btnName);

        setIsListeningVoiceKey(false);

      }

    };



    window.addEventListener('keydown', handleKeyDown, true);

    window.addEventListener('mousedown', handleMouseDown, true);

    return () => {

      window.removeEventListener('keydown', handleKeyDown, true);

      window.removeEventListener('mousedown', handleMouseDown, true);

    };

  }, [isListeningVoiceKey]);





  const launchAll = async () => {

    if (isLaunchingRef.current) return;

    if (!nickname.trim()) { 

      setStatus("PLEASE ENTER TEAMSPEAK NICKNAME"); 

      return; 

    }

    isLaunchingRef.current = true;

    setTimeout(() => { isLaunchingRef.current = false; }, 2500);



    const customTs = tsPath || null; 

    const customRedm = redmPath || null;

    setStatus("STARTING GOLDSTONE...");

    

    invoke('start_log_watcher');



    try {

      setStatus("CONNECTING TEAMSPEAK...");

      await invoke('launch_teamspeak_backend', { server: TS_SERVER, nickname: nickname.trim(), customPath: customTs });

      setStatus("LAUNCHING REDM...");

      await invoke('launch_redm_fresh', { serverCode: SERVER_CODE, customPath: customRedm });

      setStatus("CONNECTED");

      setTimeout(() => setStatus("READY TO CONNECT"), 4000);

    } catch (e) { 

      handleError(e); 

    }

  };



  const launchRedMOnly = async () => {

    if (isLaunchingRef.current) return;

    isLaunchingRef.current = true;

    setTimeout(() => { isLaunchingRef.current = false; }, 2500);



    const customRedm = redmPath || null;

    invoke('start_log_watcher'); 



    setStatus("LAUNCHING REDM...");

    try { 

      await invoke('launch_redm_fresh', { serverCode: SERVER_CODE, customPath: customRedm }); 

      setStatus("REDM LAUNCHED");

      setTimeout(() => setStatus("READY TO CONNECT"), 3000);

    } catch (e) { 

      handleError(e); 

    }

  };



  const launchTeamSpeakOnly = async () => {

    if (isLaunchingRef.current) return;

    if (!nickname.trim()) { 

      setStatus("PLEASE ENTER TEAMSPEAK NICKNAME"); 

      return; 

    }

    isLaunchingRef.current = true;

    setTimeout(() => { isLaunchingRef.current = false; }, 2500);



    const customTs = tsPath || null; 

    setStatus("CONNECTING TEAMSPEAK...");

    try { 

      await invoke('launch_teamspeak_backend', { server: TS_SERVER, nickname: nickname.trim(), customPath: customTs }); 

      setStatus("TEAMSPEAK CONNECTED");

      setTimeout(() => setStatus("READY TO CONNECT"), 3000);

    } catch (e) { 

      handleError(e); 

    }

  };



  const handleIntroClose = () => { 

    setShowIntro(false); 

    localStorage.setItem(`has_seen_v${CURRENT_VERSION}_intro`, "true"); 

  };



  // --- AUDIO LOGIC ---

  const fadeAudio = (targetVolume: number, duration: number = 800): Promise<void> => {

    return new Promise((resolve) => {

      if (!audioRef.current) return resolve();

      if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);



      const startVol = audioRef.current.volume;

      const distance = targetVolume - startVol;

      const steps = 20;

      const stepTime = duration / steps;

      let currentStep = 0;



      fadeIntervalRef.current = setInterval(() => {

        currentStep++;

        let newVol = startVol + (distance * (currentStep / steps));

        if (newVol > 1) newVol = 1;

        if (newVol < 0) newVol = 0;

        

        if (audioRef.current) { audioRef.current.volume = newVol; }



        if (currentStep >= steps) {

          if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);

          resolve();

        }

      }, stepTime);

    });

  };



    const syncAndLoadMusic = async (autoPlay: boolean = false) => {
    try {
      let songsManifest = DEFAULT_TRACKS;
      try {
        let resp = await fetch("https://raw.githubusercontent.com/nimnabrox/goldstonelauncher/main/config/music.json", { cache: "no-store" });
        if (!resp.ok) {
          resp = await fetch("https://raw.githubusercontent.com/nimnabrox/goldstonelauncher/main/music.json", { cache: "no-store" });
        }
        if (resp.ok) {
          const remoteSongs = await resp.json();
          if (Array.isArray(remoteSongs) && remoteSongs.length > 0) {
            songsManifest = remoteSongs;
          }
        }
      } catch {
        // Fallback to DEFAULT_TRACKS if offline
      }

      const synced = await invoke<Array<{
        id: string;
        title: string;
        filename: string;
        local_path: string;
        is_downloaded: boolean;
      }>>("sync_music_songs_backend", {
        songs: songsManifest.map((s) => ({
          id: s.id,
          title: s.title,
          filename: s.filename,
          url: s.url,
        }))
      });

      const newTracks: AudioTrack[] = synced.map((s) => ({
        id: s.id,
        title: s.title,
        filename: s.filename,
        localPath: s.local_path,
        url: s.local_path,
      }));

      if (newTracks.length > 0) {
        setPlaylist(newTracks);
        playlistRef.current = newTracks;
        if (autoPlay) {
          loadTrack(0, true);
        }
      }
      return newTracks;
    } catch (err) {
      console.error("Failed to sync music songs:", err);
      return DEFAULT_TRACKS;
    }
  };

const loadPlaylist = async (dirPath: string) => {

    if (!dirPath || dirPath.trim() === "") return;

    try {

      const cleanDir = dirPath.trim().replace(/^["']+|["']+$/g, '');

      const files = await invoke<string[]>('read_audio_dir_backend', { path: cleanDir });

      if (!files || files.length === 0) {

        setStatus("NO MUSIC FILES FOUND IN FOLDER");

        setTimeout(() => setStatus("READY TO CONNECT"), 2500);

        return;

      }

      const customTracks: AudioTrack[] = files.map((f, i) => {

        const fullPath = cleanDir.endsWith('\\') || cleanDir.endsWith('/') 

          ? `${cleanDir}${f}` 

          : `${cleanDir}\\${f}`;

        return {

          id: `custom-${i}-${f}`,

          title: f.replace(/\.[^/.]+$/, ""),

          filename: f,

          isBuiltin: false,

          url: fullPath

        };

      });

      const merged = [...DEFAULT_TRACKS, ...customTracks];

      setPlaylist(merged);

      playlistRef.current = merged;

      setStatus(`LOADED ${customTracks.length} SONGS FROM FOLDER`);

      setTimeout(() => setStatus("READY TO CONNECT"), 2500);

    } catch (e) { 

      console.error("Error loading music folder", e); 

      setPlaylist(DEFAULT_TRACKS);

      playlistRef.current = DEFAULT_TRACKS;

    }

  };



  const getAudioBlobUrl = async (track: AudioTrack): Promise<string> => {
    const key = track.id || track.filename || track.url;
    if (blobUrlCache.current.has(key)) {
      return blobUrlCache.current.get(key)!;
    }

    const filePath = track.localPath || track.url;
    let blob: Blob;
    try {
      const base64DataUri = await invoke<string>('read_audio_file_backend', { path: filePath });
      const parts = base64DataUri.split(',');
      const mime = parts[0].match(/:(.*?);/)?.[1] || 'audio/mpeg';
      const binary = atob(parts[1]);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      blob = new Blob([bytes], { type: mime });
    } catch {
      // Fallback: direct fetch if url is web-based
      const res = await fetch(track.url.replace('dl=0', 'dl=1'));
      blob = await res.blob();
    }

    // Prevent memory leaks: limit cache size
    if (blobUrlCache.current.size >= 10) {
      for (const [, oldUrl] of blobUrlCache.current.entries()) {
        URL.revokeObjectURL(oldUrl);
      }
      blobUrlCache.current.clear();
    }

    const blobUrl = URL.createObjectURL(blob);
    blobUrlCache.current.set(key, blobUrl);
    return blobUrl;
  };



  const loadTrack = async (index: number, autoPlay: boolean = false) => {

    const list = playlistRef.current.length > 0 ? playlistRef.current : playlist;

    if (list.length === 0) return;

    const safeIdx = (index >= 0 && index < list.length) ? index : 0;

    const track = list[safeIdx];

    if (!track) return;



    try {

      const audioSrc = await getAudioBlobUrl(track);

      

      if (audioRef.current) {

        audioRef.current.src = audioSrc;

        audioRef.current.preload = "auto";

        audioRef.current.load();

        if (track.isBuiltin) {

          setDuration(track.id === 'def-1' ? 198 : 213);

        }

        if (autoPlay) { 

          audioRef.current.volume = 0; 

          audioRef.current.play().then(() => {

            setIsPlaying(true);

            fadeAudio(volumeRef.current, 800); 

          }).catch((err) => console.log("Playback start:", err)); 

        }

      }

    } catch (e) { 

      console.error("Failed to load track:", e); 

      if (!track.isBuiltin && list.length > 0) {

        setCurrentTrackIndex(0);

        if (audioRef.current) {

          try {

            const fallbackSrc = await getAudioBlobUrl(DEFAULT_TRACKS[0]);

            audioRef.current.src = fallbackSrc;

            audioRef.current.load();

            if (autoPlay) audioRef.current.play().catch(() => {});

          } catch {}

        }

      }

    }

  };



  const togglePlay = () => {

    if (!audioRef.current) return;

    

    const currentSrc = audioRef.current.src || "";

    if (!currentSrc || currentSrc === "" || currentSrc === window.location.href) {

      loadTrack(currentTrackIndex, true);

      return;

    }



    if (!audioRef.current.paused) {

      fadeAudio(0, 500).then(() => {

        if (audioRef.current) {

          audioRef.current.pause();

          setIsPlaying(false);

        }

      });

    } else {

      audioRef.current.volume = 0;

      audioRef.current.play().then(() => {

        setIsPlaying(true);

        localStorage.setItem("music_enabled", "true");

        fadeAudio(volumeRef.current, 600);

      }).catch((e) => {

        console.log("Play error, reloading track:", e);

        loadTrack(currentTrackIndex, true);

      });

    }

  };



  const playSpecificTrack = (idx: number) => {

    setCurrentTrackIndex(idx);

    localStorage.setItem("music_track_index", String(idx));

    localStorage.setItem("music_enabled", "true");

    loadTrack(idx, true);

    setShowPlaylist(false);

  };



  const handleTrackEnded = () => {

    const list = playlistRef.current.length > 0 ? playlistRef.current : playlist;

    if (list.length === 0) {

      setIsPlaying(false);

      return;

    }

    // Repeat button: repeat the SAME song over and over

    if (isLooping) {

      if (audioRef.current) {

        audioRef.current.currentTime = 0;

        audioRef.current.play().catch(() => {});

      }

      setIsPlaying(true);

      return;

    }

    // Default: continuously loop the entire album/playlist

    const nextIdx = (currentTrackIndex + 1) % list.length;

    setCurrentTrackIndex(nextIdx);

    localStorage.setItem("music_track_index", String(nextIdx));

    loadTrack(nextIdx, true);

  };



  const nextTrack = () => {

    const list = playlistRef.current.length > 0 ? playlistRef.current : playlist;

    if (list.length === 0) return;

    const nextIdx = (currentTrackIndex + 1) % list.length;

    setCurrentTrackIndex(nextIdx);

    localStorage.setItem("music_track_index", String(nextIdx));

    if (isPlaying) {

      fadeAudio(0, 300).then(() => loadTrack(nextIdx, true));

    } else {

      loadTrack(nextIdx, false);

    }

  };



  const prevTrack = () => {

    const list = playlistRef.current.length > 0 ? playlistRef.current : playlist;

    if (list.length === 0) return;

    const prevIdx = (currentTrackIndex - 1 + list.length) % list.length;

    setCurrentTrackIndex(prevIdx);

    localStorage.setItem("music_track_index", String(prevIdx));

    if (isPlaying) {

      fadeAudio(0, 300).then(() => loadTrack(prevIdx, true));

    } else {

      loadTrack(prevIdx, false);

    }

  };



  const safePlayMusic = (fadeDurationMs: number = 800) => {

    // If background music is disabled by the user, strictly DO NOT play or force-enable

    const isCurrentlyEnabled = localStorage.getItem("music_enabled") === "true" && musicEnabledRef.current;

    if (!isCurrentlyEnabled) {

      return;

    }



    setTargetHit(false);

    const audio = audioRef.current;

    if (!audio) return;



    const targetVol = parseFloat(localStorage.getItem("music_volume") || "0.5");

    volumeRef.current = targetVol;



    const currentSrc = audio.src || "";

    if (currentSrc && currentSrc !== "" && currentSrc !== window.location.href && !currentSrc.endsWith("undefined")) {

      audio.volume = 0;

      if (audio.ended) audio.currentTime = 0;

      const playPromise = audio.play();

      if (playPromise !== undefined) {

        playPromise.then(() => {

          setIsPlaying(true);

          fadeAudio(targetVol, fadeDurationMs);

        }).catch((e) => {

          console.log("safePlayMusic play error, reloading track:", e);

          loadTrack(currentTrackIndexRef.current, true);

        });

      }

    } else {

      loadTrack(currentTrackIndexRef.current, true);

    }

  };

  safePlayMusicRef.current = safePlayMusic;



  const forceReset = async () => {

    setStatus("CLOSING GAME PROCESSES...");

    try { 

      await invoke('kill_processes_backend'); 

      setStatus("GAME PROCESSES CLOSED"); 

      setTimeout(() => setStatus("READY TO CONNECT"), 2500);

      if (musicEnabledRef.current && localStorage.getItem("music_enabled") === "true") {

        safePlayMusic(800);

      }

    } catch { 

      setStatus("GAME PROCESSES CLOSED"); 

      setTimeout(() => setStatus("READY TO CONNECT"), 2500);

      if (musicEnabledRef.current && localStorage.getItem("music_enabled") === "true") {

        safePlayMusic(800);

      }

    }

  };



  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {

    const v = parseFloat(e.target.value); 

    setVolume(v); 

    volumeRef.current = v;

    localStorage.setItem("music_volume", String(v));

    

    if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);

    if (audioRef.current) audioRef.current.volume = v;

  };



  const formatTime = (time: number) => {

    if (isNaN(time)) return "0:00";

    const mins = Math.floor(time / 60);

    const secs = Math.floor(time % 60);

    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;

  };



  const handleDurationUpdate = () => {

    if (audioRef.current && isFinite(audioRef.current.duration) && audioRef.current.duration > 0) {

      setDuration(Math.round(audioRef.current.duration));

    }

  };



  const [isDragging, setIsDragging] = useState(false);

  const [dragTime, setDragTime] = useState(0);

  const seekTrackRef = useRef<HTMLDivElement>(null);

  const isDraggingRef = useRef(false);



  const getTimeFromPointer = (e: React.PointerEvent<HTMLDivElement>) => {

    if (!seekTrackRef.current) return 0;

    const rect = seekTrackRef.current.getBoundingClientRect();

    if (rect.width <= 0) return 0;

    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));

    const total = duration > 0 ? duration : (currentTrackIndex === 0 ? 198 : 213);

    return percent * total;

  };



  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {

    e.preventDefault();

    e.stopPropagation();

    isDraggingRef.current = true;

    setIsDragging(true);

    isSeekingRef.current = true;

    if (seekTimeoutRef.current) {

      clearTimeout(seekTimeoutRef.current);

    }

    try {

      e.currentTarget.setPointerCapture(e.pointerId);

    } catch {}



    const newTime = getTimeFromPointer(e);

    setDragTime(newTime);

  };



  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {

    if (!isDraggingRef.current) return;

    e.preventDefault();

    e.stopPropagation();

    const newTime = getTimeFromPointer(e);

    setDragTime(newTime);

  };



  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {

    if (!isDraggingRef.current) return;

    e.preventDefault();

    e.stopPropagation();

    isDraggingRef.current = false;

    setIsDragging(false);

    try {

      e.currentTarget.releasePointerCapture(e.pointerId);

    } catch {}



    const finalTime = getTimeFromPointer(e);

    setCurrentTime(finalTime);

    if (audioRef.current && isFinite(finalTime)) {

      try {

        if (!audioRef.current.src || audioRef.current.src === "" || audioRef.current.src === window.location.href) {

          loadTrack(currentTrackIndex, false).then(() => {

            if (audioRef.current) audioRef.current.currentTime = finalTime;

          });

        } else {

          audioRef.current.currentTime = finalTime;

        }

      } catch (err) {

        console.error("Seek error:", err);

      }

    }

    if (seekTimeoutRef.current) {

      clearTimeout(seekTimeoutRef.current);

    }

    seekTimeoutRef.current = setTimeout(() => {

      isSeekingRef.current = false;

    }, 200);

  };



  const handleTimelineKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {

    const total = duration > 0 ? duration : (currentTrackIndex === 0 ? 198 : 213);

    let newTime = currentTime;

    if (e.key === "ArrowLeft") {

      newTime = Math.max(0, currentTime - 5);

    } else if (e.key === "ArrowRight") {

      newTime = Math.min(total, currentTime + 5);

    } else {

      return;

    }

    e.preventDefault();

    setCurrentTime(newTime);

    if (audioRef.current) {

      try {

        audioRef.current.currentTime = newTime;

      } catch {}

    }

  };



  // --- INITIALIZATION ---

  useEffect(() => {

    // Anti-Debug & DevTools Blocker

    const handleContextMenu = (e: MouseEvent) => {

      e.preventDefault();

      return false;

    };



    const handleKeyDown = (e: KeyboardEvent) => {

      // Secret Author Verification Canary (Ctrl + Shift + Alt + N)

      if (e.ctrlKey && e.shiftKey && e.altKey && (e.key === "N" || e.key === "n")) {

        alert("Goldstone County Launcher Engine\nOriginal Author & Architecture: Nimna Charuka Dilshan\nCanary ID: 6e696d6e61-gsl-orig-2026");

        return;

      }



      if (

        e.key === "F12" ||

        (e.ctrlKey && e.shiftKey && ["I", "i", "J", "j", "C", "c"].includes(e.key)) ||

        (e.ctrlKey && (e.key === "U" || e.key === "u"))

      ) {

        e.preventDefault();

        e.stopPropagation();

        return false;

      }

    };



    document.addEventListener("contextmenu", handleContextMenu);

    window.addEventListener("keydown", handleKeyDown);



    const savedName = localStorage.getItem("ts_nickname"); if (savedName) setNickname(savedName);

    const savedMonitor = localStorage.getItem("ts_monitor_enabled"); if (savedMonitor === "true") setMonitorEnabled(true);

    const savedTs = localStorage.getItem("custom_ts_path"); if (savedTs) setTsPath(savedTs);

    const savedRedm = localStorage.getItem("custom_redm_path"); if (savedRedm) setRedmPath(savedRedm);



    const sMusicEnabled = localStorage.getItem("music_enabled") === "true"; setMusicEnabled(sMusicEnabled);

    const sMusicPath = localStorage.getItem("music_path") || ""; setMusicPath(sMusicPath);

    const sVol = parseFloat(localStorage.getItem("music_volume") || "0.5"); setVolume(sVol);

    const sLoop = localStorage.getItem("music_loop") === "true"; setIsLooping(sLoop);

    const sIndex = parseInt(localStorage.getItem("music_track_index") || "0"); setCurrentTrackIndex(sIndex);



    if (sMusicPath) {

      loadPlaylist(sMusicPath);

    } else {

      setPlaylist(DEFAULT_TRACKS);

      playlistRef.current = DEFAULT_TRACKS;

      loadTrack(0, false);

    }



    const hasSeenIntro = localStorage.getItem(`has_seen_v${CURRENT_VERSION}_intro`);

    if (!hasSeenIntro) setTimeout(() => setShowIntro(true), 2000);



    checkForUpdates(true);

    fetchPlayerCount(false); 

    refreshReShadeStatus();



    const unlistenMusicDl = listen<{ song_id: string; title: string; progress: number }>("music-download-progress", (event) => {
      setMusicDownloadProgress({
        songId: event.payload.song_id,
        title: event.payload.title,
        progress: event.payload.progress,
      });
      if (event.payload.progress >= 100) {
        setTimeout(() => setMusicDownloadProgress(null), 1200);
      }
    });

const unlistenReShade = listen<{ percent: number; step: string; status: string; completed?: boolean; done?: boolean; error?: string }>('reshade-progress', (event) => {

      const { percent, step, status, completed, done, error } = event.payload;

      setReshadeProgress(percent);

      setReshadeStatus(status);



      if (step.startsWith("1/")) setReshadeStepIndex(0);

      else if (step.startsWith("2/")) setReshadeStepIndex(1);

      else if (step.startsWith("3/")) setReshadeStepIndex(2);

      else if (step.startsWith("4/")) setReshadeStepIndex(3);

      else if (step.startsWith("5/")) setReshadeStepIndex(3);



      if (done || completed) {

        setReshadeStepIndex(99);

        setIsReShadeBusy(false);

        setReshadeSuccess(true);

        refreshReShadeStatus();

      }

      if (error) {
        setIsReShadeBusy(false);
        setReshadeStatus(`Error: ${error}`);
      }
    });

    const unlistenTs3 = listen<{ progress: number; status: string; hint: string }>('ts3-progress', (event) => {
      const { progress, status, hint } = event.payload;
      if (typeof progress === 'number') {
        setTs3Progress(progress);
      }
      if (status) {
        setTs3StatusText(status);
      }
      if (hint) {
        setTs3HintText(hint);
      }
    });



    let pollTimeout: ReturnType<typeof setTimeout> | null = null;

    const scheduleNextPoll = () => {

      const jitterDelay = 25000 + Math.floor(Math.random() * 15000); // 25s - 40s non-linear random cadence

      pollTimeout = setTimeout(() => {

        if (!document.hidden) fetchPlayerCount(false);

        scheduleNextPoll();

      }, jitterDelay);

    };

    scheduleNextPoll();



    invoke('start_log_watcher');



    const unlistenTrigger = listen('trigger-67', () => {

      setTargetHit(true);

      

      // Auto-pause ambient queue music when RedM hits 67% loading screen

      if (audioRef.current) { 

        fadeAudio(0, 400).then(() => {

          if (audioRef.current) {

            try { audioRef.current.pause(); } catch {}

            audioRef.current.volume = parseFloat(localStorage.getItem("music_volume") || "0.5");

            setIsPlaying(false);

          }

        });

      }

    });



    const unlistenReset = listen('reset-trigger', (event) => { 

      setTargetHit(false); 

      if (event.payload === "REDM CLOSED") {

        // Auto-resume music when RedM crashes or closes (strictly only if music is enabled by user)

        if (musicEnabledRef.current && localStorage.getItem("music_enabled") === "true") {

          if (safePlayMusicRef.current) {

            safePlayMusicRef.current(1000);

          } else {

            safePlayMusic(1000);

          }

        }

      }

    });



    return () => {

      document.removeEventListener("contextmenu", handleContextMenu);

      window.removeEventListener("keydown", handleKeyDown);

      if (pollTimeout) clearTimeout(pollTimeout);

      unlistenTrigger.then(f => f()); 

      unlistenReset.then(f => f());

      unlistenMusicDl.then(f => f());
      unlistenReShade.then(f => f());
      unlistenTs3.then(f => f());
    };

  }, []);





  // --- ROCK-SOLID AMBIENT BACKGROUND VIDEO ENGINE ---

  useEffect(() => {

    const video = bgVideoRef.current;

    if (!video) return;



    let isDestroyed = false;



    const safePlay = () => {

      if (isDestroyed || !video) return;

      if (document.hidden) return; // Only pause when window is minimized

      if (video.paused || video.ended) {

        const promise = video.play();

        if (promise !== undefined) {

          promise.catch(() => {});

        }

      }

    };



    const safePause = () => {

      if (!video) return;

      if (!video.paused) {

        try { video.pause(); } catch {}

      }

    };



    // 1. Pause when minimized to taskbar, play when visible

    const handleVisibility = () => {

      if (document.hidden) {

        safePause();

      } else {

        safePlay();

      }

    };



    // 2. Resume when launcher window gains focus or is restored

    const handleFocus = () => {

      if (!document.hidden) safePlay();

    };



    // 3. Failsafe loop recovery (never halts on end or decode stall)

    const handleEnded = () => {

      if (video && !document.hidden) {

        video.currentTime = 0;

        safePlay();

      }

    };



    const handleWaiting = () => {

      if (!document.hidden) {

        setTimeout(safePlay, 150);

      }

    };



    // 4. Watchdog: keeps video playing whenever app is visible

    const watchdog = setInterval(() => {

      if (!document.hidden && video && (video.paused || video.ended)) {

        safePlay();

      }

    }, 2000);



    document.addEventListener("visibilitychange", handleVisibility);

    window.addEventListener("focus", handleFocus);

    video.addEventListener("ended", handleEnded);

    video.addEventListener("waiting", handleWaiting);



    // Initial start

    safePlay();



    return () => {

      isDestroyed = true;

      clearInterval(watchdog);

      document.removeEventListener("visibilitychange", handleVisibility);

      window.removeEventListener("focus", handleFocus);

      if (video) {

        video.removeEventListener("ended", handleEnded);

        video.removeEventListener("waiting", handleWaiting);

      }

    };

  }, []);



  // Failsafe auto-dismiss welcome screen (light band animates ~1.6s, total splash 2.5s, never gets stuck)

  useEffect(() => {

    const splashTimer = setTimeout(() => {

      setIsLoading(false);

    }, 2500);

    return () => clearTimeout(splashTimer);

  }, []);



  const currentTitle = playlist[currentTrackIndex]?.title || "Goldstone Ambient I";



  useEffect(() => {

    const checkOverflow = () => {

      if (titleMeasureRef.current && marqueeBoxRef.current) {

        const isOver = titleMeasureRef.current.scrollWidth > (marqueeBoxRef.current.clientWidth - 4);

        setIsTitleOverflowing(isOver);

      }

    };

    checkOverflow();

    const timer = setTimeout(checkOverflow, 60);

    window.addEventListener('resize', checkOverflow);

    return () => {

      clearTimeout(timer);

      window.removeEventListener('resize', checkOverflow);

    };

  }, [currentTitle, currentTrackIndex, showPlaylist]); 





  return (

    <div className="app-container">

      {/* --- AMBIENT LOOP BACKGROUND VIDEO (PERMANENT 1PX BLUR) --- */}

      <div className="ambient-bg-wrapper">

        <video

          ref={bgVideoRef}

          src={loopVideo}

          autoPlay

          loop

          muted

          playsInline

          className="ambient-bg-video"

          style={{

            filter: "blur(1px) brightness(0.88) saturate(1.18)"

          }}

          onEnded={(e) => {

            const v = e.currentTarget;

            if (!document.hidden) {

              v.currentTime = 0;

              v.play().catch(() => {});

            }

          }}

        />

        <div className="ambient-bg-overlay"></div>

      </div>

      <audio 

        ref={audioRef} 

        preload="auto"

        loop={false} 

        onTimeUpdate={() => {

          if (!isSeekingRef.current && audioRef.current) {

            setCurrentTime(audioRef.current.currentTime);

          }

        }} 

        onSeeked={() => {

          if (audioRef.current && !isSeekingRef.current) {

            setCurrentTime(audioRef.current.currentTime);

          }

        }}

        onLoadedMetadata={handleDurationUpdate} 

        onDurationChange={handleDurationUpdate}

        onCanPlay={handleDurationUpdate}

        onEnded={handleTrackEnded} 

      />



      {/* --- TOP CUSTOM TITLEBAR (16:9 FORMAT) --- */}

      <header className="custom-titlebar">

        <div data-tauri-drag-region className="titlebar-drag-left">

          <img src={goldstoneLogo} alt="Goldstone" className="titlebar-logo-img" />

          <span className="titlebar-title">GOLDSTONE COUNTY LAUNCHER</span>

          <span className="titlebar-pill">v{CURRENT_VERSION}</span>

          {updateAvailable && (

            <span className="titlebar-update-alert clickable" onClick={() => setShowUpdateModal(true)}>

              UPDATE READY

            </span>

          )}

        </div>



        <div className="titlebar-btn-right">

          <button 

            className="titlebar-update-btn" 

            onClick={() => checkForUpdates(false)} 

            title={checkingMsg ? checkingMsg : "Check for Updates"}

          >

            <RefreshIcon size={12} className={checkingMsg ? "spin-animation" : ""} />

            <span>{checkingMsg ? checkingMsg : "CHECK UPDATE"}</span>

          </button>

          <button className="titlebar-btn settings-btn" onClick={openSettings} title="Settings">

            <GearIcon size={16} />

            {hasNewSettingNotification && <span className="settings-notification-dot" />}

          </button>

          <button className="titlebar-btn min-btn" onClick={minimizeWindow} title="Minimize">

            <MinimizeIcon size={14} />

          </button>

          <button className="titlebar-btn close-btn" onClick={closeWindow} title="Close">

            <CloseIcon size={14} />

          </button>

        </div>

      </header>



      {/* --- CINEMATIC LOGO WELCOME OVERLAY (BAND OF LIGHT SHIMMER, LOW-SPEC, NEVER STUCK) --- */}

      <div 

        className={`welcome-overlay ${!isLoading ? 'fade-out' : ''}`}

        onClick={() => setIsLoading(false)}

      >

        <div className="welcome-content" onClick={(e) => e.stopPropagation()}>

          {/* Logo with ambient glow aura and light band sweep */}

          <div className="welcome-logo-box">

            <div className="welcome-logo-halo" />

            <img src={goldstoneLogo} alt="Goldstone Logo" className="welcome-logo-img" />

            <div 

              className="welcome-light-band" 

              style={{

                WebkitMaskImage: `url(${goldstoneLogo})`,

                maskImage: `url(${goldstoneLogo})`

              }} 

            />

          </div>



          {/* Cinematic Title & Subtitle */}

          <div className="welcome-text-wrap">

            <h1 className="welcome-title">GOLDSTONE COUNTY</h1>

            <p className="welcome-subtitle">COMMUNITY REDM LAUNCHER</p>

          </div>



          {/* Golden Progress Bar */}

          <div className="welcome-progress-wrap">

            <div className="welcome-progress-bar" />

          </div>

        </div>

      </div>



      {/* --- INTRO / WHAT'S NEW MODAL --- */}

      {showIntro && (

        <div className="settings-modal" onClick={handleIntroClose}>

          <div className="settings-box" onClick={(e) => e.stopPropagation()}>

            <div className="modal-header">

              <img src={goldstoneLogo} alt="Goldstone" style={{ width: 24, height: 24, objectFit: "contain" }} />

              <h2>WHAT'S NEW IN v{CURRENT_VERSION}</h2>

            </div>

            <div className="info-card">

              <div className="info-title">

                <HeadphonesIcon size={14} className="info-svg" />

                <span>NEW TEAMSPEAK VOICE SERVER</span>

              </div>

              <div className="info-desc">Connected to the new high-speed voice server with automatic channel switching.</div>

            </div>

            <div className="info-card">

              <div className="info-title">

                <MusicIcon size={14} className="info-svg" />

                <span>STREAMER-SAFE QUEUE MUSIC</span>

              </div>

              <div className="info-desc">Plays ambient songs while waiting in queue or if RedM crashes. Auto-pauses automatically the moment the game opens.</div>

            </div>

            <div className="info-card">

              <div className="info-title">

                <UsersIcon size={14} className="info-svg" />

                <span>PLAYER COUNT FIXED</span>

              </div>

              <div className="info-desc">Fixed the player counter to accurately show online players on the server.</div>

            </div>

            <div className="info-card">

              <div className="info-title">

                <SparklesIcon size={14} className="info-svg" />

                <span>CLEAN & SMOOTH INTERFACE</span>

              </div>

              <div className="info-desc">Brand new sleek launcher design with quick recovery tools and fast one-click connection.</div>

            </div>

            <button className="save-settings-btn" onClick={handleIntroClose}>ENTER LAUNCHER</button>

          </div>

        </div>

      )}



      {/* --- UPDATE MODAL --- */}

      {showUpdateModal && (

        <div className="settings-modal" onClick={() => setShowUpdateModal(false)}>

          <div className="settings-box" onClick={(e) => e.stopPropagation()}>

            <div className="modal-header">

              <SparklesIcon size={22} />

              <h2>UPDATE AVAILABLE</h2>

            </div>

            {updateStep === "start" && (

              <>

                <p className="modal-text">A new version of Goldstone Launcher is available. Please update to improve stability and performance.</p>

                <button className="save-settings-btn" onClick={handleDownloadClick}>DOWNLOAD UPDATE</button>

              </>

            )}

            {updateStep === "downloading" && (

              <div className="modal-loading">DOWNLOADING UPDATE... PLEASE WAIT.</div>

            )}

            {updateStep === "ready" && (

              <>

                <div className="modal-success">DOWNLOAD COMPLETE! READY TO INSTALL.</div>

                <button className="save-settings-btn" onClick={handleInstallClick}>INSTALL & RESTART</button>

              </>

            )}

          </div>

        </div>

      )}



      {/* --- SETTINGS MODAL --- */}

      {showSettings && (

        <div 

        className="settings-modal" 

        onMouseDown={(e) => { modalMouseDownTarget.current = e.target; }}

        onClick={(e) => {

          if (e.target === e.currentTarget && modalMouseDownTarget.current === e.currentTarget) {

            closeSettings();

          }

        }}

      >

        <div 

          className="settings-box" 

          onMouseDown={(e) => e.stopPropagation()}

          onMouseUp={(e) => e.stopPropagation()}

          onClick={(e) => e.stopPropagation()}

        >

            <div className="modal-header">

              <GearIcon size={22} />

              <h2>SETTINGS & PATHS</h2>

            </div>



            <div className="settings-section">

              <label className="checkbox-row">

                <input 

                  type="checkbox" 

                  checked={musicEnabled} 

                  onChange={(e) => {

                    const isChecked = e.target.checked;

                    setMusicEnabled(isChecked); 

                    localStorage.setItem("music_enabled", String(isChecked));

                    if (!isChecked && audioRef.current) {

                      audioRef.current.pause();

                      setIsPlaying(false);

                    }

                    if (isChecked) { if (musicPath) loadPlaylist(musicPath); else syncAndLoadMusic(true); }

                  }} 

                />

                <span>ENABLE BACKGROUND MUSIC PLAYER</span>

                <span className="setting-new-badge">NEW</span>

              </label>

              <div className="help-text">Auto-pauses music when RedM starts and auto-plays your selected album/tracks if RedM crashes or closes (ideal for streamers).</div>



              {musicEnabled && (

                <div className="field-group" style={{ marginTop: "10px" }}>

                  <label>MUSIC FOLDER (CONTAINS MP3s)</label>

                  <div className="field-with-btn">

                    <input 

                      type="text" 

                      value={musicPath} 

                      onChange={(e) => {

                        const val = e.target.value;

                        setMusicPath(val);

                        localStorage.setItem("music_path", val);

                        if (val) loadPlaylist(val);

                      }} 

                      placeholder="Type folder path or browse..." 

                    />

                    <button onClick={() => browseFile('music')}>BROWSE</button>

                    {musicPath && (

                      <button 

                        className="clear-music-btn" 

                        onClick={clearMusicFolder}

                        title="Clear music folder and reset playlist"

                      >

                        CLEAR

                      </button>

                    )}

                  </div>

                </div>

              )}

            </div>



            <div className="settings-section">

              <div className="field-group">

                <label>TEAMSPEAK 3 CLIENT (.EXE)</label>

                <div className="field-with-btn">

                  <input 

                    type="text" 

                    value={tsPath} 

                    onChange={(e) => {

                      const val = e.target.value;

                      setTsPath(val);

                      if (val) localStorage.setItem("custom_ts_path", val);

                      else localStorage.removeItem("custom_ts_path");

                    }} 

                    placeholder="Default (Auto-Detect)" 

                  />

                  <button onClick={() => browseFile('ts')}>BROWSE</button>

                  {tsPath && (

                    <button 

                      className="clear-music-btn" 

                      onClick={clearTsPath}

                      title="Clear custom path and revert to Auto-Detect"

                    >

                      CLEAR

                    </button>

                  )}

                </div>

                <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>

                  <span style={{ 

                    display: 'inline-flex', 

                    alignItems: 'center', 

                    gap: '6px', 

                    fontSize: '9.5px', 

                    fontWeight: 800, 

                    color: '#34d399', 

                    background: 'rgba(16, 185, 129, 0.12)', 

                    border: '1px solid rgba(16, 185, 129, 0.35)', 

                    padding: '3px 9px', 

                    borderRadius: '999px',

                    letterSpacing: '0.4px',

                    textTransform: 'uppercase'

                  }}>

                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34d399', boxShadow: '0 0 6px #34d399' }}></span>

                    NOTIFICATION SOUNDS MUTED (SOUNDS DEACTIVATED)

                  </span>

                </div>

              </div>



              <div className="field-group">

                <label>REDM CLIENT (.EXE)</label>

                <div className="field-with-btn">

                  <input 

                    type="text" 

                    value={redmPath} 

                    onChange={(e) => {

                      const val = e.target.value;

                      setRedmPath(val);

                      if (val) localStorage.setItem("custom_redm_path", val);

                      else localStorage.removeItem("custom_redm_path");

                    }} 

                    placeholder="Default (Auto-Detect)" 

                  />

                  <button onClick={() => browseFile('redm')}>BROWSE</button>

                  {redmPath && (

                    <button 

                      className="clear-music-btn" 

                      onClick={clearRedmPath}

                      title="Clear custom path and revert to Auto-Detect"

                    >

                      CLEAR

                    </button>

                  )}

                </div>

              </div>

            </div>



                        {/* ABOUT & DEVELOPER CREDITS */}

            <div className="settings-section about-credits-section">

              <div className="about-credits-card">

                <div className="about-left">

                  <img src={nbLogo} alt="Developer Nimnabro" className="about-dev-avatar" />

                  <div className="about-text-group">

                    <div className="about-app-name">GOLDSTONE COUNTY LAUNCHER</div>

                    <div className="about-rights">All Rights Reserved by Nimnabro</div>

                    <div className="about-meta">Version {CURRENT_VERSION} - Official Community Release</div>

                  </div>

                </div>

                <button 

                  className="about-dev-btn" 

                  onClick={openMyProfile}

                  title="Developer: Nimnabro"

                >

                  DEVELOPER PROFILE

                </button>

              </div>

            </div>



            <button className="save-settings-btn" onClick={saveSettings}>SAVE & CLOSE</button>

          </div>

        </div>

      )}



      {/* RESHADE & PRESET MANAGER MODAL (USER 2-COLUMN LUXURY OBSIDIAN & BRASS GLASS THEME) */}

      {showReShadeModal && (

        <div className="reshade-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setShowReShadeModal(false); }}>

          <div className="reshade-win" role="dialog" aria-label="Goldstone ReShade Manager">

            

            {/* Titlebar */}

            <div className="reshade-bar">

              <div className="reshade-brand">

                <span className="brand-dot-pulse"></span>

                <b>GOLDSTONE <span>RESHADE MANAGER</span></b>

                

              </div>

              <button 

                className="reshade-x" 

                onClick={() => setShowReShadeModal(false)}





                aria-label="Close ReShade Manager"

              >

                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">

                  <path d="M18 6 6 18M6 6l12 12"/>

                </svg>

              </button>

            </div>



            {/* 2-Column Body */}

            <div className="reshade-body">

              

              {/* Left Column: Preset Showcase & 1-Click Install */}

              <section className="reshade-col">

                <div className="glass-card">

                  <div className="card-header-row">

                    <span className="card-label">OFFICIAL PRESET</span>

                    <div className={`status-pill ${reshadeInstalled ? 'active' : 'inactive'}`}>

                      <span className="status-dot"></span>

                      <span>{reshadeInstalled ? "ACTIVE" : "NOT INSTALLED"}</span>

                    </div>

                  </div>

                  

                  <h2 className="preset-title">GOLDSTONE <span>ENHANCED (SZ)</span></h2>

                  

                  <p className="preset-meta">

                    TUNED BY <b>SZ / SZV</b> • <a 

                      onClick={() => invoke('open_url_backend', { url: "https://www.patreon.com/SZV/posts/exclusive-preset-140361506" })}

                      title="Visit creator's Patreon"

                    >

                      PATREON.COM/SZV

                    </a>

                  </p>



                  <div className="preset-features-list">

                    <div className="feat-row">

                      <span className="feat-dot">•</span>

                      <span>NATURAL COLOR & REFINED CONTRAST</span>

                    </div>

                    <div className="feat-row">

                      <span className="feat-dot">•</span>

                      <span>REALISTIC SHADOWS & HIGHLIGHT DEPTH</span>

                    </div>

                    <div className="feat-row">

                      <span className="feat-dot">•</span>

                      <span>BALANCED DAY & NIGHT LIGHTING</span>

                    </div>

                    <div className="feat-row">

                      <span className="feat-dot">•</span>

                      <span>SHARPENED DETAILS WITH SMOOTH FINISH</span>

                    </div>

                    <div className="feat-row">

                      <span className="feat-dot">•</span>

                      <span>PERFORMANCE-TUNED FOR REDM</span>

                    </div>

                  </div>

                </div>



                <div className="glass-card work-card">

                  <div className="progress-header">

                    <span className={`prog-status ${reshadeSuccess || reshadeInstalled ? 'done' : ''}`}>

                      {isReShadeBusy 

                        ? reshadeStatus.toUpperCase() 

                        : reshadeInstalled 

                          ? "READY TO PLAY • EFFECTS ACTIVE" 

                          : "GOLDSTONE PRESET AVAILABLE"}

                    </span>

                    <span className="prog-pct">

                      {isReShadeBusy ? `${reshadeProgress}%` : reshadeInstalled ? "100%" : "0%"}

                    </span>

                  </div>

                  <div className="glass-track">

                    <div 

                      className="glass-fill" 

                      style={{ width: `${isReShadeBusy ? Math.min(100, Math.max(5, reshadeProgress)) : reshadeInstalled ? 100 : 0}%` }}

                    ></div>

                  </div>

                  <p className="prog-hint">

                    {isReShadeBusy

                      ? reshadeStatus

                      : reshadeInstalled

                        ? `ReShade is active in RedM. Press ${formatKeyName(reshadeToggleKey).toUpperCase()} in-game to toggle effects.`

                        : "CLICK INSTALL BELOW TO AUTOMATICALLY SETUP RESHADE & PRESET FOR REDM."}

                  </p>

                </div>



                <div className="reshade-acts">

                  <button 

                    className="reshade-btn main" 

                    onClick={handleInstallReShade}

                    disabled={isReShadeBusy}

                  >

                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">

                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>

                    </svg>

                    <span>{isReShadeBusy ? "WORKING..." : reshadeInstalled ? "UPDATE / RE-INSTALL" : "INSTALL RESHADE & PRESET"}</span>

                  </button>



                  <button 

                    className="reshade-btn warn" 

                    onClick={handleUninstallReShade}

                    disabled={isReShadeBusy || !reshadeInstalled}

                    title="Uninstall ReShade completely from RedM"

                  >

                    <span>UNINSTALL</span>

                  </button>

                </div>

              </section>



              {/* Right Column: Settings & Shortcuts */}

              <section className="reshade-col right">

                {/* Hotkey Control */}

                <div className="glass-card">

                  <span className="card-label">EFFECTS TOGGLE KEY</span>

                  <div className="hotkey-box">

                    <button 

                      className={`hotkey-cap-full ${isListeningKey ? 'listening' : ''}`}

                      onClick={() => setIsListeningKey(!isListeningKey)}

                      title="Click then press any key or mouse button to set"

                    >

                      <span>{isListeningKey ? "PRESS ANY KEY OR MOUSE BUTTON..." : "CLICK TO RECORD KEY"}</span>

                      {!isListeningKey && <kbd>{formatKeyName(reshadeToggleKey).toUpperCase()}</kbd>}

                    </button>

                    <div className="hotkey-dropdown-row">

                      <select 

                        className="hotkey-select-full"

                        value={reshadeToggleKey} 

                        onChange={(e) => handleToggleKeyChange(Number(e.target.value))}

                      >

                        <option value={118}>F7 (DEFAULT RECOMMENDED)</option>

                        <option value={119}>F8</option>

                        <option value={120}>F9</option>

                        <option value={121}>F10</option>

                        <option value={122}>F11</option>

                        <option value={34}>PAGE DOWN</option>

                        <option value={33}>PAGE UP</option>

                        <option value={35}>END</option>

                        <option value={45}>INSERT</option>

                        <option value={4}>MIDDLE CLICK</option>

                        <option value={5}>MOUSE 4</option>

                        <option value={6}>MOUSE 5</option>

                        <option value={192}>TILDE (~)</option>

                      </select>

                    </div>

                    <p className="sync-note">

                      {keySavedFlash 

                        ? `HOTKEY SET TO ${formatKeyName(reshadeToggleKey).toUpperCase()} • AUTO-RELOADED IN REDM!` 

                        : "Applies live in RedM • No restart needed"}

                    </p>

                  </div>

                </div>



                {/* In-Game Shortcuts Card */}

                <div className="glass-card shortcuts-card">

                  <span className="card-label">IN-GAME CONTROLS</span>

                  <div className="shortcut-item">

                    <kbd>HOME</kbd>

                    <div>

                      <b>OPEN RESHADE OVERLAY</b>

                      <small>ADJUST PRESET, SHADER SETTINGS, OR BRIGHTNESS</small>

                    </div>

                  </div>

                  <div className="shortcut-item">

                    <kbd>{formatKeyName(reshadeToggleKey).toUpperCase()}</kbd>

                    <div>

                      <b>TOGGLE EFFECTS ON / OFF</b>

                      <small>INSTANTLY SWITCH BETWEEN ENHANCED & VANILLA LOOK</small>

                    </div>

                  </div>

                </div>





              </section>



            </div>

          </div>

        </div>

      )}



{/* --- TS3 & SALTYCHAT VOICE MANAGER MODAL (LUXURY GLASS PREVIEW ALIGNED) --- */}
      {showTs3Modal && (
        <div 
          className="ts3-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowTs3Modal(false);
            }
          }}
        >
          <div className="ts3-win" role="dialog" aria-label="TS3 Manager">
            {/* Titlebar */}
            <div className="ts3-bar">
              <div className="ts3-brand">
                <span className="brand-dot-pulse"></span>
                <b>TS3 <span>MANAGER</span></b>
              </div>
              <button 
                className="ts3-close" 
                onClick={() => {
                  setShowTs3UninstallConfirm(false);
                  setShowTs3Modal(false);
                }}
                title="Close"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="ts3-body">
              {/* Left Column: Software & Addon Versions + Status & Actions */}
              <section className="ts3-col left">
                <div className="glass-card">
                  <div className="card-header-row">
                    <span className="card-label">VOICE SOFTWARE & ADDON</span>
                    <div className={`status-pill ${ts3Installed && saltyInstalled ? 'active' : ts3Installed ? 'warn' : 'missing'}`}>
                      <span className={`status-dot ${ts3Installed && saltyInstalled ? '' : ts3Installed ? 'warn' : 'missing'}`}></span>
                      <span>{ts3Installed && saltyInstalled ? '✓ READY' : ts3Installed ? 'SALTYCHAT REQUIRED' : 'NOT INSTALLED'}</span>
                    </div>
                  </div>

                  <div className="version-rows">
                    <div className="version-item">
                      <div className="version-info">
                        <span className="version-title">TEAMSPEAK 3 CLIENT</span>
                        <span className="version-tag">{ts3Installed ? "VERSION: 3.6.2 (64-BIT)" : "NOT DETECTED"}</span>
                      </div>
                      <span className={`version-badge ${ts3Installed ? 'installed' : 'missing'}`}>
                        {ts3Installed ? '✓ INSTALLED' : '✕ NOT DETECTED'}
                      </span>
                    </div>

                    <div className="version-item">
                      <div className="version-info">
                        <span className="version-title">SALTYCHAT PLUGIN</span>
                        <span className="version-tag">{ts3Installed && saltyInstalled ? "VERSION: 4.1.0" : "NOT INSTALLED"}</span>
                      </div>
                      <span className={`version-badge ${ts3Installed && saltyInstalled ? 'installed' : 'missing'}`}>
                        {ts3Installed && saltyInstalled ? '✓ INSTALLED' : '✕ NOT INSTALLED'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="glass-card work-card">
                  <div className="progress-header">
                    <span className={`prog-status ${ts3Progress === 100 ? 'done' : ''}`}>
                      {ts3StatusText}
                    </span>
                    <span className="prog-pct">{ts3Progress}%</span>
                  </div>
                  <div className="glass-track">
                    <div 
                      className="glass-fill" 
                      style={{ width: `${ts3Progress}%` }}
                    ></div>
                  </div>
                  <p className="prog-hint">{ts3HintText}</p>
                </div>

                <div className="voice-acts">
                  <button 
                    className="voice-btn main" 
                    disabled={isTs3Busy} 
                    onClick={handleInstallTs3} 
                    title="Install or update TeamSpeak 3 and SaltyChat"
                  >
                    <span>
                      {isTs3Busy 
                        ? "WORKING..." 
                        : !ts3Installed 
                          ? "INSTALL TS3 & SALTYCHAT" 
                          : !saltyInstalled 
                            ? "INSTALL SALTYCHAT" 
                            : "UPDATE / RE-INSTALL"}
                    </span>
                  </button>

                  <button 
                    className="voice-btn warn" 
                    disabled={isTs3Busy || (!ts3Installed && !saltyInstalled)} 
                    onClick={() => setShowTs3UninstallConfirm(true)} 
                    title="Uninstall TeamSpeak 3 and SaltyChat"
                  >
                    <span>UNINSTALL</span>
                  </button>
                </div>
              </section>

              {/* Right Column: Audio Hardware, Proximity Voice Key & Shortcuts */}
              <section className="ts3-col right">
                {/* Audio Hardware Selection */}
                <div className="glass-card audio-dev-card">
                  <div className="card-header-row">
                    <span className="card-label">AUDIO HARDWARE</span>
                    <div className="audio-live-tag">
                      <span className="live-dot-pulse"></span>
                      <span>LIVE SYNC</span>
                    </div>
                  </div>

                  <div className="audio-select-group">
                    <div className="audio-row">
                      <label className="audio-label">
                        <span className="audio-icon">🎙</span>
                        <span>MICROPHONE (INPUT)</span>
                      </label>
                      <select 
                        className="audio-select"
                        value={selectedInputDev}
                        onChange={(e) => handleAudioDeviceChange('input', e.target.value)}
                        onFocus={refreshTs3AudioDevices}
                        disabled={isTs3Busy || !ts3Installed}
                      >
                        {audioInputDevices.map((d) => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="audio-row">
                      <label className="audio-label">
                        <span className="audio-icon">🎧</span>
                        <span>OUTPUT (SPEAKERS / HEADSET)</span>
                      </label>
                      <select 
                        className="audio-select"
                        value={selectedOutputDev}
                        onChange={(e) => handleAudioDeviceChange('output', e.target.value)}
                        onFocus={refreshTs3AudioDevices}
                        disabled={isTs3Busy || !ts3Installed}
                      >
                        {audioOutputDevices.map((d) => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <p className={`sync-note ${audioSavedFlash ? 'live-success' : ''}`}>
                    {audioSavedFlash 
                      ? "✓ Audio Device Applied in TeamSpeak 3 Live" 
                      : !ts3Installed 
                        ? "Install TeamSpeak 3 to configure audio devices" 
                        : "Auto-saves to TeamSpeak 3 • Plug in new devices to update live"}
                  </p>
                </div>

                {/* Proximity Voice Key */}
                <div className="glass-card">
                  <div className="card-header-row">
                    <span className="card-label">PROXIMITY VOICE KEY</span>
                    <div className={`status-pill ${ts3Installed && saltyInstalled ? 'active' : ts3Installed ? 'warn' : 'missing'}`}>
                      <span className={`status-dot ${ts3Installed && saltyInstalled ? '' : ts3Installed ? 'warn' : 'missing'}`}></span>
                      <span>{ts3Installed && saltyInstalled ? 'ACTIVE' : ts3Installed ? 'REQUIRES SALTYCHAT' : 'INACTIVE'}</span>
                    </div>
                  </div>

                  <div className="hotkey-box">
                    <button 
                      className={`hotkey-cap-full ${isListeningVoiceKey ? 'listening' : ''}`}
                      onClick={() => setIsListeningVoiceKey(!isListeningVoiceKey)}
                      title="Click to record any key or mouse button"
                    >
                      <span>{isListeningVoiceKey ? "PRESS ANY KEY / MOUSE..." : "CLICK TO RECORD KEY"}</span>
                      <kbd>{isListeningVoiceKey ? "..." : proximityVoiceKey}</kbd>
                    </button>

                    <div className="hotkey-dropdown-row">
                      <select 
                        className="hotkey-select-full"
                        value={proximityVoiceKey}
                        onChange={(e) => handleProximityKeyChange(e.target.value)}
                      >
                        <option value="MOUSE 4">MOUSE 4 (RECOMMENDED)</option>
                        <option value="MOUSE 5">MOUSE 5</option>
                        <option value="MIDDLE CLICK">MIDDLE CLICK</option>
                        <option value="N">N</option>
                        <option value="V">V</option>
                        <option value="B">B</option>
                        <option value="CAPS LOCK">CAPS LOCK</option>
                        <option value="LEFT ALT">LEFT ALT</option>
                        <option value="LEFT CTRL">LEFT CTRL</option>
                        <option value="LEFT SHIFT">LEFT SHIFT</option>
                        <option value="Z">Z</option>
                        <option value="X">X</option>
                        <option value="C">C</option>
                        <option value="G">G</option>
                        <option value="T">T</option>
                        <option value="PAGE DOWN">PAGE DOWN</option>
                        <option value="END">END</option>
                      </select>
                    </div>

                    <p className={`sync-note ${voiceKeySavedFlash ? 'live-success' : ''}`}>
                      {voiceKeySavedFlash 
                        ? `✓ Applied Live in TeamSpeak 3 (Key: ${proximityVoiceKey})` 
                        : !ts3Installed 
                          ? "Install TeamSpeak 3 to sync proximity key" 
                          : !saltyInstalled 
                            ? "TeamSpeak 3 detected • Install SaltyChat for 3D voice" 
                            : "Applies live in TeamSpeak 3 • No restart needed"}
                    </p>
                  </div>
                </div>

                {/* In-Game Shortcuts */}
                <div className="glass-card shortcuts-card compact">
                  <span className="card-label">IN-GAME VOICE CONTROLS</span>
                  
                  <div className="shortcut-compact-row">
                    <div className="shortcut-chip">
                      <kbd>{proximityVoiceKey}</kbd>
                      <span className="chip-name">PROXIMITY (3D)</span>
                    </div>

                    <div className="shortcut-chip">
                      <kbd>LEFT ALT</kbd>
                      <span className="chip-name">HANDHELD RADIO</span>
                    </div>
                  </div>

                  <div className="shortcut-desc-note">
                    Hold proximity key to talk locally. Radio is bound to Left Alt in RedM.
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}

      {/* --- TS3 & SALTYCHAT UNINSTALL CONFIRMATION POPUP (GOLDSTONE THEMED) --- */}
      {showTs3Modal && showTs3UninstallConfirm && (
        <div 
          className="ts3-confirm-backdrop" 
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowTs3UninstallConfirm(false);
          }}
        >
          <div className="ts3-confirm-box" role="alertdialog" aria-modal="true">
            <div className="ts3-confirm-header">
              <div className="ts3-confirm-title-wrap">
                <span className="ts3-confirm-dot"></span>
                <span className="ts3-confirm-title">UNINSTALL CONFIRMATION</span>
              </div>
              <button 
                className="ts3-confirm-close" 
                onClick={() => setShowTs3UninstallConfirm(false)}
                title="Cancel"
              >
                ✕
              </button>
            </div>

            <div className="ts3-confirm-body">
              <div className="ts3-confirm-icon-box">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </div>
              <div className="ts3-confirm-texts">
                <h3 className="ts3-confirm-main-text">Are you sure you want to completely uninstall TeamSpeak 3 and SaltyChat?</h3>
                <p className="ts3-confirm-sub-text">
                  This will remove the SaltyChat 3D audio plugin and launch the official TeamSpeak 3 uninstaller.
                </p>
              </div>
            </div>

            <div className="ts3-confirm-actions">
              <button 
                className="ts3-confirm-btn cancel" 
                onClick={() => setShowTs3UninstallConfirm(false)}
              >
                <span>CANCEL</span>
              </button>
              <button 
                className="ts3-confirm-btn confirm" 
                onClick={confirmAndExecuteUninstall}
              >
                <span>CONFIRM UNINSTALL</span>
              </button>
            </div>
          </div>
        </div>
      )}





      {/* --- MAIN 16:9 VIEWPORT (BALANCED 3-COLUMN LAYOUT: MID HERO & ACTIONS) --- */}

      <main className="main-content-balanced">

        

        {/* LEFT WING: LIVE SERVER & VOICE TELEMETRY */}

        <section className="side-column side-left">

          

          {/* LIVE REDM STATUS CARD (CLEAN HUD - NO DEV TOOLTIP) */}

          <div className="hud-card server-card compact">

            <div className="server-card-header">

              <div className="server-title-group">

                <span className={`status-dot ${isOnline ? 'online' : 'offline'}`}></span>

                <span className="server-title">{serverName}</span>

              </div>

              <span className={`badge-pill ${isOnline ? 'badge-online' : 'badge-offline'}`}>

                {isOnline ? "ONLINE" : "OFFLINE"}

              </span>

            </div>



            <div className="player-stat-block">

              <div className="stat-label">PLAYERS ONLINE</div>

              <div className="stat-count-clean">

                {playerCount !== null ? playerCount : "--"}

                <span className="stat-max"> / {maxPlayers}</span>

              </div>

            </div>

          </div>



        </section>



        {/* CENTER COLUMN: THE MAIN HERO (USERNAME MID, BUTTONS MID) */}

        <section className="center-hero-column">

          

          {/* COMMUNITY BRAND HERO */}

          <div className="hero-emblem-wrap">

            <img src={goldstoneLogo} alt="Goldstone County" className="hero-emblem-img" />

            <div className="hero-badge-row">

              <span className="brand-tag">SRI LANKA</span>

              <span className="brand-tag">SERIOUS RP</span>

              <span className="brand-tag highlight">REDM</span>

            </div>

            <h1 className="hero-title">GOLDSTONE <span className="gold-glow">COUNTY</span></h1>

            <p className="hero-sub">COMMUNITY REDM ROLEPLAY LAUNCHER</p>

          </div>



          {/* TEAMSPEAK USERNAME INPUT (MID) */}

          <div className="hero-input-card">

            <label className="hero-input-label">

              <UserIcon size={14} />

              <span>TEAMSPEAK USERNAME</span>

            </label>

            <div className="hero-input-wrapper">

              <input 

                type="text" 

                value={nickname} 

                onChange={saveNickname} 

                placeholder="Enter voice username..." 

                className="hero-custom-input"

                spellCheck={false}

              />

            </div>

          </div>



          {/* LIVE SYSTEM STATUS BAR (POSITIONED DIRECTLY UNDER USERNAME INPUT) */}

          <div className="hero-status-card">

            <div className="status-badge">

              <div className="status-ping"></div>

              <span className="status-text">{status}</span>

            </div>

          </div>



          {/* LAUNCH ACTIONS (MID) */}

          <div className="hero-action-stack">

            <button className="btn-hero-launch-mid" onClick={launchAll}>

              <div className="btn-hero-glow"></div>

              <RocketIcon size={20} />

              <span>ENTER GOLDSTONE (AUTO)</span>

            </button>



            <div className="hero-action-row">

              <button className="btn-hero-sub" onClick={launchRedMOnly}>

                <img src="/redm_logo.jpg" alt="RedM" className="btn-logo-img" />

                <span>ONLY REDM</span>

              </button>

              <button className="btn-hero-sub" onClick={launchTeamSpeakOnly}>

                <img src="/ts_logo.png" alt="TeamSpeak" className="btn-logo-img" style={{ objectFit: 'contain' }} />

                <span>ONLY TEAMSPEAK</span>

              </button>

            </div>



            {/* 67% STUCK FIX (POSITIONED CLOSE TO ENTER GOLDSTONE, CLEAN NO SUBTEXT) */}

            <div 

              className={`hero-stuck-fix-card ${monitorEnabled ? 'active' : ''} ${targetHit ? 'triggered' : ''}`}

              onClick={toggleMonitor}

              title="67% Stuck Fix"

            >

              <span className="stuck-fix-title">67% STUCK FIX</span>

              <div className={`fluent-switch mini ${monitorEnabled || targetHit ? 'checked' : ''}`}>

                <div className="fluent-thumb"></div>

              </div>

            </div>

          </div>



        </section>



        {/* RIGHT WING: UTILITIES & SYSTEM FIXES */}

        <section className="side-column side-right">



          {/* DASHBOARD PILLS: RESHADE & TS3 VOICE SIDE-BY-SIDE */}

          <div className="dash-pill-row">

            <div 

              className={`hud-card reshade-dash-pill ${reshadeInstalled ? 'is-active' : ''}`} 

              onClick={() => { setShowReShadeModal(true); refreshReShadeStatus(); }}

              title="ReShade & Preset Manager"

            >

              <div className="reshade-pill-left">

                <div className="dash-reshade-icon-wrap">

                  <img src="/reshade_logo.png" alt="ReShade" className="dash-reshade-logo" />

                </div>

                <div className="reshade-pill-text">

                  <div className="dash-reshade-title">RESHADE</div>

                </div>

              </div>

              <div className="reshade-pill-status">

                {reshadeInstalled ? (

                  <span className="reshade-tick-badge active" title="ReShade Active & Ready">

                    <CheckIcon size={13} />

                  </span>

                ) : (

                  <span className="reshade-tick-badge inactive" title="Vanilla RedM (Not Installed)">

                    <span className="tick-dot" />

                  </span>

                )}

              </div>

            </div>



            <div 

              className={`hud-card reshade-dash-pill ${ts3Installed && saltyInstalled ? 'is-active' : ''}`} 

              onClick={() => { setShowTs3Modal(true); refreshTs3Status(); }}

              title="TeamSpeak 3 & SaltyChat Manager"

            >

              <div className="reshade-pill-left">

                <div className="dash-reshade-icon-wrap">

                  <img src="/ts_logo.png" alt="TeamSpeak 3" className="dash-reshade-logo" />

                </div>

                <div className="reshade-pill-text">

                  <div className="dash-reshade-title">TS3 VOICE</div>

                </div>

              </div>

              <div className="reshade-pill-status">

                {ts3Installed && saltyInstalled ? (

                  <span className="reshade-tick-badge active" title="Voice Ready">

                    <CheckIcon size={13} />

                  </span>

                ) : (

                  <span className="reshade-tick-badge inactive" title="Voice Not Setup">

                    <span className="tick-dot" />

                  </span>

                )}

              </div>

            </div>

          </div>



          {/* QUICK RECOVERY TOOLS */}

          <div className="tools-card">

            <div className="tools-title">QUICK RECOVERY TOOLS</div>

            <div className="tools-grid tools-grid-3">

              <button className="tool-btn red-tool" onClick={forceReset}>

                <ShieldAlertIcon size={14} />

                <span>FORCE CLOSE</span>

              </button>

              <button className="tool-btn amber-tool" onClick={fixVulkan}>

                <SparklesIcon size={14} />

                <span>FIX VULKAN</span>

              </button>

              <button className="tool-btn gray-tool" onClick={cleanRedmCache}>

                <TrashIcon size={14} />

                <span>CLEAN CACHE</span>

              </button>

            </div>

          </div>



          {/* MUSIC PLAYER (TRANSPARENT GLASS AI STYLE, NO TAGS, NO ANIMATIONS) */}

          {musicEnabled && (

            <div className="hud-card music-card-ai" ref={musicCardRef}>

              <div className="music-inner">

                {/* Track title row (With seamless marquee & auto-expiring NEW tag) */}

                <div className="track-title-wrapper">

                  <div className="music-icon-bubble">

                    <MusicIcon size={13} />

                  </div>

                  <div ref={marqueeBoxRef} className="track-marquee-box">

                    <span 

                      ref={titleMeasureRef} 

                      className={isTitleOverflowing ? "sr-measure-hidden" : "track-title-static"}

                      title={currentTitle}

                    >

                      {currentTitle}

                    </span>

                    {isTitleOverflowing && (

                      <div className="track-marquee-content" title={currentTitle}>

                        <span className="marquee-text">{currentTitle}</span>

                        <span className="marquee-sep">-</span>

                        <span className="marquee-text">{currentTitle}</span>

                        <span className="marquee-sep">-</span>

                      </div>

                    )}

                  </div>

                  {showMusicNewTag && (

                    <span className="music-new-tag" title="New feature: Queue Music Player">NEW</span>

                  )}

                </div>



                {/* Seek / Timeline row */}

                {(() => {

                  const totalDuration = duration > 0 ? duration : (currentTrackIndex === 0 ? 198 : 213);

                  const displayedTime = isDragging ? dragTime : currentTime;

                  const progressPercent = totalDuration > 0 ? Math.min(100, Math.max(0, (displayedTime / totalDuration) * 100)) : 0;

                  return (

                    <div className="music-progress-row">

                      <span className="time-text">{formatTime(displayedTime)}</span>

                      <div 

                        ref={seekTrackRef}

                        className={`music-timeline-track ${isDragging ? 'dragging' : ''}`}

                        role="slider"

                        tabIndex={0}

                        aria-valuemin={0}

                        aria-valuemax={totalDuration}

                        aria-valuenow={displayedTime}

                        aria-label="Seek time"

                        onPointerDown={handlePointerDown}

                        onPointerMove={handlePointerMove}

                        onPointerUp={handlePointerUp}

                        onPointerCancel={handlePointerUp}

                        onKeyDown={handleTimelineKeyDown}

                      >

                        <div className="music-timeline-bg">

                          <div className="music-timeline-fill" style={{ width: `${progressPercent}%` }} />

                          <div className="music-timeline-thumb" style={{ left: `${progressPercent}%` }} />

                        </div>

                      </div>

                      <span className="time-text">{formatTime(totalDuration)}</span>

                    </div>

                  );

                })()}



                {/* Actions: Controls & Volume */}

                {musicDownloadProgress && (
                  <div className="music-download-banner">
                    <div className="dl-info">
                      <span>DOWNLOADING: {musicDownloadProgress.title}</span>
                      <span>{musicDownloadProgress.progress}%</span>
                    </div>
                    <div className="dl-track">
                      <div className="dl-fill" style={{ width: `${musicDownloadProgress.progress}%` }}></div>
                    </div>
                  </div>
                )}

                <div className="music-actions">

                  <div className="music-ctrls-left">

                    <button className="ctrl-btn" onClick={prevTrack} title="Previous Track">

                      <PrevTrackIcon size={12} />

                    </button>

                    

                    <button 

                      className="ctrl-btn play-btn" 

                      onClick={togglePlay}

                      title={isPlaying ? "Pause" : "Play"}

                    >

                      {isPlaying ? <PauseIcon size={14} /> : <PlayIcon size={14} />}

                    </button>



                    <button className="ctrl-btn" onClick={nextTrack} title="Next Track">

                      <NextTrackIcon size={12} />

                    </button>



                    <button 

                      className={`ctrl-btn ${isLooping ? 'active' : ''}`} 

                      onClick={() => {

                        const newLoop = !isLooping;

                        setIsLooping(newLoop);

                        localStorage.setItem("music_loop", String(newLoop));

                      }}

                      title={isLooping ? "Repeat Track: ON" : "Repeat Track: OFF (Album Loop Active)"}

                    >

                      <RepeatIcon size={12} active={isLooping} />

                    </button>



                    <button 

                      className={`ctrl-btn ${showPlaylist ? 'active' : ''}`} 

                      onClick={() => setShowPlaylist(!showPlaylist)}

                      title="Playlist"

                    >

                      <PlaylistIcon size={12} />

                    </button>

                  </div>



                  <div className="volume-slider-group">

                    <VolumeIcon size={12} />

                    <input 

                      type="range" 

                      className="vol-seek" 

                      min="0" 

                      max="1" 

                      step="0.01" 

                      value={volume} 

                      onChange={handleVolumeChange}

                      title={`Volume: ${Math.round(volume * 100)}%`}

                    />

                  </div>

                </div>

              </div>



              {/* PLAYLIST POPOVER (DROPS DOWN UNDER MUSIC CARD, NEVER OVERFLOWS) */}

              {showPlaylist && (

                <div className="music-playlist-popover">

                  <div className="playlist-dropdown-head">

                    <div className="p-head-left">

                      <PlaylistIcon size={12} />

                      <span>PLAYLIST ({playlist.length})</span>

                    </div>

                    <button 

                      className="playlist-close-x" 

                      onClick={() => setShowPlaylist(false)}

                      title="Close Playlist"

                    >

                      <CloseIcon size={11} />

                    </button>

                  </div>



                  {/* Playlist Song Search */}

                  <div className="playlist-search-wrap">

                    <SearchIcon size={11} className="playlist-search-icon" />

                    <input 

                      type="text" 

                      className="playlist-search-input"

                      placeholder="Search songs..." 

                      value={musicSearchQuery}

                      onChange={(e) => setMusicSearchQuery(e.target.value)}

                      autoFocus

                    />

                    {musicSearchQuery && (

                      <button 

                        className="playlist-search-clear"

                        onClick={() => setMusicSearchQuery("")}

                        title="Clear search"

                      >

                        <CloseIcon size={10} />

                      </button>

                    )}

                  </div>



                  <div className="playlist-dropdown-list">

                    {(() => {

                      const query = musicSearchQuery.trim().toLowerCase();

                      const filtered = playlist

                        .map((track, originalIndex) => ({ track, originalIndex }))

                        .filter(({ track }) => !query || track.title.toLowerCase().includes(query));



                      if (filtered.length === 0) {

                        return <div className="playlist-empty">No songs found</div>;

                      }



                      return filtered.map(({ track, originalIndex }) => (

                        <div 

                          key={track.id} 

                          className={`playlist-dropdown-item ${originalIndex === currentTrackIndex ? 'active' : ''}`}

                          onClick={() => {

                            playSpecificTrack(originalIndex);

                            setShowPlaylist(false);

                          }}

                        >

                          <span className="p-num">{String(originalIndex + 1).padStart(2, '0')}</span>

                          <span className="p-title">{track.title}</span>

                          {originalIndex === currentTrackIndex && isPlaying && <span className="p-dot" />}

                        </div>

                      ));

                    })()}

                  </div>

                </div>

              )}

            </div>

          )}



        </section>



      </main>



    </div>

  );

}



export default App;

