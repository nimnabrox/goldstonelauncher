import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog"; 
import loopVideo from "./gdl_bv_v1_loop.webm"; 
import goldstoneLogo from "./goldstone-logo.png";
import nbLogo from "./assets/nb_logo.jpg";
import defaultSong1 from "./assets/gscs_1.mp3";
import defaultSong2 from "./assets/gscs_2.mp3";
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
  SearchIcon
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
  filename: string;
  isBuiltin: boolean;
  url: string;
  streamUrl?: string;
}

export const DEFAULT_TRACKS: AudioTrack[] = [
  { 
    id: 'def-1', 
    title: 'Goldstone Ambient I', 
    filename: 'gscs_1.mp3', 
    isBuiltin: true, 
    url: defaultSong1,
    streamUrl: defaultSong1
  },
  { 
    id: 'def-2', 
    title: 'Goldstone Ambient II', 
    filename: 'gscs_2.mp3', 
    isBuiltin: true, 
    url: defaultSong2,
    streamUrl: defaultSong2
  },
];

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

    if (monitorEnabled) {
      setStatus("PLEASE WAIT TO AUTO-CONNECT - DO NOT CONNECT");
      try {
        await invoke('launch_teamspeak_backend', { server: TS_SERVER, nickname: nickname.trim(), customPath: customTs });
        await invoke('launch_redm_plain', { customPath: customRedm });
      } catch (e) { 
        handleError(e); 
      }
    } else {
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
    }
  };

  const launchRedMOnly = async () => {
    if (isLaunchingRef.current) return;
    isLaunchingRef.current = true;
    setTimeout(() => { isLaunchingRef.current = false; }, 2500);

    const customRedm = redmPath || null;
    invoke('start_log_watcher'); 

    if (monitorEnabled) {
      setStatus("PLEASE WAIT TO AUTO-CONNECT - DO NOT CONNECT");
      try { 
        await invoke('launch_redm_plain', { customPath: customRedm }); 
      } catch (e) { 
        handleError(e); 
      }
    } else {
      setStatus("LAUNCHING REDM...");
      try { 
        await invoke('launch_redm_fresh', { serverCode: SERVER_CODE, customPath: customRedm }); 
        setStatus("REDM LAUNCHED");
        setTimeout(() => setStatus("READY TO CONNECT"), 3000);
      } catch (e) { 
        handleError(e); 
      }
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
    const key = track.id || track.url;
    if (blobUrlCache.current.has(key)) {
      return blobUrlCache.current.get(key)!;
    }

    let blob: Blob;
    if (track.isBuiltin) {
      const assetUrl = track.url || (track.id === 'def-1' ? defaultSong1 : defaultSong2);
      try {
        const res = await fetch(assetUrl);
        blob = await res.blob();
      } catch {
        return assetUrl;
      }
    } else {
      const base64DataUri = await invoke<string>('read_audio_file_backend', { path: track.url });
      const parts = base64DataUri.split(',');
      const mime = parts[0].match(/:(.*?);/)?.[1] || 'audio/mpeg';
      const binary = atob(parts[1]);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      blob = new Blob([bytes], { type: mime });
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
      if (localStorage.getItem("ts_monitor_enabled") === "true") {
        setTargetHit(true); 
        setStatus("AUTO-CONNECTING TO GOLDSTONE...");
        setTimeout(() => {
          const path = localStorage.getItem("custom_redm_path") || null;
          invoke("launch_redm_backend", { serverCode: SERVER_CODE, customPath: path });
          setStatus("CONNECTED - ENJOY ROLEPLAY");
          setTimeout(() => setStatus("READY TO CONNECT"), 4000);
        }, 2200);
      }
      
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
                    if (isChecked && musicPath) loadPlaylist(musicPath);
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

          {/* QUICK RECOVERY TOOLS */}
          <div className="tools-card">
            <div className="tools-title">QUICK RECOVERY TOOLS</div>
            <div className="tools-grid">
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
