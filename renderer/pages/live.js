import Layout from '../components/Layout';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../lib/auth';
import { supabase, HAS_SUPABASE } from '../lib/supabase';
import { listChat, sendChat, endLivestream, getActiveLivestreamForModule, getModule } from '../lib/db';
import { toast } from '../lib/toast';
import Avatar from '../components/Avatar';

const LIVEKIT_URL = process.env.NEXT_PUBLIC_LIVEKIT_URL;

const I = {
  mic: 'M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0M12 19v3M8 22h8',
  micOff: 'M9 9V6a3 3 0 0 1 5.12-2.12M15 10v1a3 3 0 0 1-5.06 2.18M17 11a5 5 0 0 1-7.69 4.22M12 19v3M3 3l18 18',
  cam: 'M3 7a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7zm13 3l5-3v10l-5-3',
  camOff: 'M3 3l18 18M16 16H5a2 2 0 0 1-2-2V8m4-3h7a2 2 0 0 1 2 2v3l4-3v10',
  end: 'M3 11a9 9 0 0 1 18 0v3l-4-2v-2a5 5 0 0 0-10 0v2L3 14v-3z',
  set: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  copy: 'M9 9h10v10H9zM5 15H3V5h10v2',
  play: 'M5 3l14 9-14 9V3z',
};

function Icon({ name, size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d={I[name]} />
    </svg>
  );
}

export default function Live() {
  const router = useRouter();
  const { user } = useAuth();
  const { module: queryModule } = router.query;

  // State
  const [livestream, setLivestream] = useState(null); // { id, room_name, module_id }
  const [moduleInfo, setModuleInfo] = useState(null);
  const [isLive, setIsLive] = useState(false);
  const [loading, setLoading] = useState(true);
  const isHost = !!user && (user.role === 'admin' || (user.role === 'professor' && moduleInfo?.owner_id === user.id));

  // Chat
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const bodyRef = useRef(null);

  // Connection
  const [status, setStatus] = useState('idle'); // idle | connecting | connected | reconnecting | error
  const [errorMsg, setErrorMsg] = useState('');
  const [participants, setParticipants] = useState(0);
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false);

  // Devices
  const [devices, setDevices] = useState({ cameras: [], mics: [] });
  const [camId, setCamId] = useState(null);
  const [micId, setMicId] = useState(null);
  const [camOn, setCamOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  // Refs
  const videoRef = useRef(null);
  const audioContainerRef = useRef(null);
  const roomRef = useRef(null);
  const previewStreamRef = useRef(null);

  const refreshLiveState = useCallback(async ({ showLoading = false } = {}) => {
    if (!queryModule) return;
    if (showLoading) setLoading(true);
    try {
      const [{ data: moduleData }, { data: active }] = await Promise.all([
        getModule(queryModule),
        getActiveLivestreamForModule(queryModule),
      ]);
      setModuleInfo(moduleData);
      setLivestream(active || null);
      setIsLive(!!active);
    } catch (e) {
      console.error('Live state error:', e);
      toast.error('Could not load live status');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [queryModule]);

  // -------- Init & Check Status --------
  useEffect(() => {
    if (!router.isReady || !user) return;
    refreshLiveState({ showLoading: true });
  }, [router.isReady, user, refreshLiveState]);

  useEffect(() => {
    if (!router.isReady || !user || !queryModule) return;
    const timer = setInterval(() => {
      if (!isHost || !isLive) refreshLiveState();
    }, 5000);
    return () => clearInterval(timer);
  }, [router.isReady, user, queryModule, isHost, isLive, refreshLiveState]);

  useEffect(() => {
    if (!HAS_SUPABASE || !queryModule) return;
    const ch = supabase
      .channel(`module-live-${queryModule}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'livestreams',
        filter: `module_id=eq.${queryModule}`,
      }, () => refreshLiveState())
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [queryModule, refreshLiveState]);

  useEffect(() => {
    if (router.isReady && !queryModule) {
      setLoading(true);
      toast.error('Open live from a module');
      router.replace('/browse');
    }
  }, [router, queryModule]);

  // -------- Lobby / Preview for Host --------
  useEffect(() => {
    if (isHost && !isLive && !loading) {
      (async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: camOn ? { deviceId: camId || undefined } : false,
            audio: micOn ? { deviceId: micId || undefined } : false,
          });
          previewStreamRef.current = stream;
          if (videoRef.current) videoRef.current.srcObject = stream;
        } catch (e) {
          console.warn('Preview error:', e);
        }
      })();
    } else {
      // Stop preview when going live or leaving lobby
      if (previewStreamRef.current) {
        previewStreamRef.current.getTracks().forEach(t => t.stop());
        previewStreamRef.current = null;
      }
      if (videoRef.current && !isLive) videoRef.current.srcObject = null;
    }

    return () => {
      if (previewStreamRef.current) {
        previewStreamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, [isHost, isLive, loading, camId, micId, camOn, micOn]);

  // -------- Chat --------
  useEffect(() => {
    const lsid = livestream?.id;
    if (!lsid) return;
    if (!HAS_SUPABASE) {
      setMessages([
        { id: 1, sender_name: 'Sara', message: 'Hello everyone!' },
        { id: 2, sender_name: 'Karim', message: 'Audio is clear ✅' },
      ]);
      return;
    }
    listChat(lsid).then(({ data }) => {
      setMessages((data || []).map(m => ({ ...m, sender_name: m.profiles?.full_name || 'User' })));
    });
    const ch = supabase
      .channel(`chat-${lsid}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'chat_messages',
        filter: `livestream_id=eq.${lsid}`,
      }, async (payload) => {
        const m = payload.new;
        const { data: prof } = await supabase.from('profiles').select('full_name').eq('id', m.sender_id).single();
        setMessages(prev => [...prev, { ...m, sender_name: prof?.full_name || 'User' }]);
      })
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [livestream?.id]);

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [messages]);

  // -------- Enumerate devices --------
  const refreshDevices = useCallback(async () => {
    try {
      try {
        const probe = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        probe.getTracks().forEach(t => t.stop());
      } catch { /* ignore */ }
      const all = await navigator.mediaDevices.enumerateDevices();
      const cameras = all.filter(d => d.kind === 'videoinput');
      const mics = all.filter(d => d.kind === 'audioinput');
      setDevices({ cameras, mics });
      setCamId(prev => prev || cameras[0]?.deviceId || null);
      setMicId(prev => prev || mics[0]?.deviceId || null);
    } catch (e) {
      toast.error('Could not list devices: ' + e.message);
    }
  }, []);

  useEffect(() => {
    refreshDevices();
    const onChange = () => refreshDevices();
    navigator.mediaDevices?.addEventListener?.('devicechange', onChange);
    return () => navigator.mediaDevices?.removeEventListener?.('devicechange', onChange);
  }, [refreshDevices]);

  // -------- LiveKit room --------
  useEffect(() => {
    const roomName = livestream?.room_name;
    if (!user || !isLive || !roomName || !LIVEKIT_URL) return;

    let cancelled = false;
    let room;

    (async () => {
      try {
        setStatus('connecting');
        setErrorMsg('');

        const { Room, RoomEvent, Track, ConnectionState } = await import('livekit-client');

        const tokenRes = await fetch('/api/livekit-token', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roomName, identity: user.id, name: user.name, isHost }),
        });
        const { token, error } = await tokenRes.json();
        if (error) { setStatus('error'); setErrorMsg(error); return; }

        room = new Room({
          adaptiveStream: true,
          dynacast: true,
          publishDefaults: { simulcast: true, videoSimulcastLayers: undefined },
          videoCaptureDefaults: isHost ? { deviceId: camId || undefined, resolution: { width: 1280, height: 720 } } : undefined,
          audioCaptureDefaults: isHost ? { deviceId: micId || undefined, echoCancellation: true, noiseSuppression: true } : undefined,
        });
        roomRef.current = room;

        const updateCount = () => setParticipants(room.remoteParticipants.size + 1);

        room
          .on(RoomEvent.ParticipantConnected, updateCount)
          .on(RoomEvent.ParticipantDisconnected, updateCount)
          .on(RoomEvent.TrackSubscribed, (track) => {
            if (track.kind === Track.Kind.Video && videoRef.current) {
              track.attach(videoRef.current);
              setHasRemoteVideo(true);
            } else if (track.kind === Track.Kind.Audio) {
              const el = track.attach();
              el.autoplay = true;
              audioContainerRef.current?.appendChild(el);
            }
          })
          .on(RoomEvent.TrackUnsubscribed, (track) => {
            track.detach().forEach(el => el.remove());
            if (track.kind === Track.Kind.Video) setHasRemoteVideo(false);
          })
          .on(RoomEvent.LocalTrackPublished, (pub) => {
            if (isHost && pub.kind === Track.Kind.Video && videoRef.current) {
              pub.track?.attach(videoRef.current);
            }
          })
          .on(RoomEvent.Reconnecting, () => setStatus('reconnecting'))
          .on(RoomEvent.Reconnected, () => setStatus('connected'))
          .on(RoomEvent.ConnectionStateChanged, (s) => {
            if (s === ConnectionState.Connected) setStatus('connected');
            else if (s === ConnectionState.Connecting) setStatus('connecting');
            else if (s === ConnectionState.Reconnecting) setStatus('reconnecting');
            else if (s === ConnectionState.Disconnected) setStatus('idle');
          })
          .on(RoomEvent.Disconnected, (reason) => {
            setStatus('idle');
            if (reason && !cancelled) toast.info('Disconnected from live');
          });

        await room.connect(LIVEKIT_URL, token);
        if (cancelled) { await room.disconnect(); return; }
        setStatus('connected');
        updateCount();

        if (isHost) {
          await room.localParticipant.setCameraEnabled(camOn, { deviceId: camId || undefined });
          await room.localParticipant.setMicrophoneEnabled(micOn, { deviceId: micId || undefined });
          // Attach own preview right away
          for (const pub of room.localParticipant.videoTrackPublications.values()) {
            if (pub.track && videoRef.current) pub.track.attach(videoRef.current);
          }
        }
      } catch (e) {
        if (cancelled) return;
        setStatus('error');
        setErrorMsg(e.message || 'Failed to connect');
        toast.error('LiveKit: ' + (e.message || e));
      }
    })();

    return () => {
      cancelled = true;
      try { room?.disconnect(); } catch { /* ignore */ }
      roomRef.current = null;
      if (audioContainerRef.current) audioContainerRef.current.innerHTML = '';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, livestream?.room_name, isLive, isHost]);

  // -------- Device / Mute Controls --------
  const switchCamera = useCallback(async (id) => {
    setCamId(id);
    const room = roomRef.current;
    if (!room || !isHost || !isLive) return;
    try {
      await room.switchActiveDevice('videoinput', id);
      for (const pub of room.localParticipant.videoTrackPublications.values()) {
        if (pub.track && videoRef.current) pub.track.attach(videoRef.current);
      }
    } catch (e) { toast.error('Camera: ' + e.message); }
  }, [isHost, isLive]);

  const switchMic = useCallback(async (id) => {
    setMicId(id);
    const room = roomRef.current;
    if (!room || !isHost || !isLive) return;
    try {
      await room.switchActiveDevice('audioinput', id);
    } catch (e) { toast.error('Mic: ' + e.message); }
  }, [isHost, isLive]);

  const toggleCam = useCallback(async () => {
    const next = !camOn; setCamOn(next);
    const room = roomRef.current;
    if (!room || !isHost || !isLive) return;
    try {
      await room.localParticipant.setCameraEnabled(next, { deviceId: camId || undefined });
      if (next) {
        for (const pub of room.localParticipant.videoTrackPublications.values()) {
          if (pub.track && videoRef.current) pub.track.attach(videoRef.current);
        }
      }
    } catch (e) { toast.error('Camera: ' + e.message); }
  }, [camOn, camId, isHost, isLive]);

  const toggleMic = useCallback(async () => {
    const next = !micOn; setMicOn(next);
    const room = roomRef.current;
    if (!room || !isHost || !isLive) return;
    try { await room.localParticipant.setMicrophoneEnabled(next, { deviceId: micId || undefined }); }
    catch (e) { toast.error('Mic: ' + e.message); }
  }, [micOn, micId, isHost, isLive]);

  // -------- Actions --------
  const startSession = async () => {
    try {
      setStatus('connecting');
      const res = await fetch('/api/start-live', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ module_id: queryModule, host_id: user.id }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);

      setLivestream(data.livestream);
      setIsLive(true);
      toast.success('Module is live');
    } catch (e) {
      setStatus('idle');
      toast.error('Start: ' + e.message);
    }
  };

  const endSession = async () => {
    if (!confirm('End live for this module?')) return;
    const lsid = livestream?.id;
    await endLivestream(lsid).catch(() => {});
    await fetch('/api/end-live', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ module_id: Number(queryModule), livestream_id: lsid }),
    }).catch(() => {});
    if (roomRef.current) await roomRef.current.disconnect();
    setLivestream(null);
    setIsLive(false);
    setMessages([]);
    setStatus('idle');
    toast.success('Module is offline');
  };

  const leave = async () => {
    if (roomRef.current) await roomRef.current.disconnect();
    router.back();
  };

  const send = async (e) => {
    e.preventDefault();
    if (!text.trim() || !user || !livestream) return;
    const msg = text.trim();
    setText('');
    if (HAS_SUPABASE) {
      const { error } = await sendChat(livestream.id, user.id, msg);
      if (error) toast.error(error.message);
    } else {
      setMessages(prev => [...prev, { id: Date.now(), sender_name: user.name || 'You', message: msg }]);
    }
  };

  const copyInvite = () => {
    const link = typeof window !== 'undefined'
      ? `${window.location.origin}/live?module=${queryModule}`
      : '';
    if (link && navigator.clipboard) {
      navigator.clipboard.writeText(link);
      toast.success('Module live link copied');
    }
  };

  const statusLabel = {
    idle: isLive ? 'Disconnected' : 'Ready',
    connecting: 'Connecting…',
    connected: `Live · ${participants}`,
    reconnecting: 'Reconnecting…',
    error: 'Error',
  }[status];

  if (loading) return (
    <Layout>
      <div className="live-wrap" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" />
      </div>
    </Layout>
  );

  return (
    <Layout>
      <div className="page-header">
        <div className="crumb">Module live</div>
        <div className="row between">
          <h1>{moduleInfo ? moduleInfo.name : 'Live'}</h1>
          <div className="row">
            {isLive && <span className={`pill ${status === 'connected' ? 'live' : ''}`}>{statusLabel}</span>}
            {isHost && isLive && (
              <button className="btn ghost sm" onClick={copyInvite} title="Copy live link">
                <Icon name="copy" /> Copy link
              </button>
            )}
            {isHost
              ? (isLive ? <button className="btn danger sm" onClick={endSession}>End session</button> : null)
              : <button className="btn ghost sm" onClick={leave}>Leave</button>}
          </div>
        </div>
        <p className="sub">
          {isHost ? (isLive ? 'Broadcasting to this module' : 'Preview first, then start the module live') : (isLive ? 'Watching this module live' : 'Waiting for the module to go live')}
        </p>
      </div>

      <div className="live-wrap">
        <div className="video-stage">
          {isLive && status === 'connected' && <span className="pill live live-badge">On air</span>}

          {!isLive && !isHost && (
            <div className="live-placeholder">
              <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
              <div style={{ fontSize: 16, fontWeight: 500, color: '#fff', marginBottom: 4 }}>Session hasn't started yet</div>
              <div style={{ color: 'var(--ink-4)', maxWidth: 240 }}>This page will join automatically when the professor starts.</div>
              <button className="btn sm ghost" style={{ marginTop: 20 }} onClick={() => refreshLiveState()}>Check now</button>
            </div>
          )}

          {!isLive && isHost && (
            <div className="live-placeholder" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', zIndex: 10 }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🎬</div>
              <div style={{ fontSize: 18, fontWeight: 600, color: '#fff', marginBottom: 8 }}>Ready to start?</div>
              <div style={{ color: 'rgba(255,255,255,0.7)', marginBottom: 24, maxWidth: 300 }}>
                Check your camera and microphone before students join.
              </div>
              <button className="btn live" style={{ padding: '12px 24px', fontSize: 15 }} onClick={startSession} disabled={status === 'connecting'}>
                {status === 'connecting' ? 'Starting...' : <><Icon name="play" size={18} /> Go live</>}
              </button>
            </div>
          )}

          {isLive && !LIVEKIT_URL && (
            <div className="live-placeholder">📹 Set NEXT_PUBLIC_LIVEKIT_URL to enable video</div>
          )}

          {isLive && LIVEKIT_URL && status === 'error' && (
            <div className="live-placeholder">
              <div style={{ fontSize: 24, marginBottom: 8 }}>⚠️</div>
              <div>{errorMsg || 'Could not connect'}</div>
              <button className="btn sm" style={{ marginTop: 12 }} onClick={() => router.reload()}>Retry</button>
            </div>
          )}

          {isLive && LIVEKIT_URL && (status === 'connecting' || status === 'reconnecting') && (
            <div className="live-placeholder"><div className="spinner" />{statusLabel}</div>
          )}

          {isLive && LIVEKIT_URL && status === 'connected' && !isHost && !hasRemoteVideo && (
            <div className="live-placeholder">Waiting for the host's video…</div>
          )}

          {isLive && LIVEKIT_URL && status === 'connected' && isHost && !camOn && (
            <div className="live-placeholder">
              <div style={{ fontSize: 24, marginBottom: 8 }}>📷</div>
              Camera is off
            </div>
          )}

          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={isHost}
            className={`live-video ${isHost ? 'mirror' : ''}`}
            style={{
              display: (isHost || (isLive && status === 'connected' && hasRemoteVideo)) ? 'block' : 'none',
            }}
          />
          <div ref={audioContainerRef} style={{ display: 'none' }} />

          {/* Controls */}
          {isHost && LIVEKIT_URL && (
            <div className="live-controls">
              <button
                className={`live-ctrl ${micOn ? '' : 'off'}`}
                onClick={toggleMic}
                title={micOn ? 'Mute mic' : 'Unmute mic'}
              >
                <Icon name={micOn ? 'mic' : 'micOff'} size={18} />
              </button>
              <button
                className={`live-ctrl ${camOn ? '' : 'off'}`}
                onClick={toggleCam}
                title={camOn ? 'Turn camera off' : 'Turn camera on'}
              >
                <Icon name={camOn ? 'cam' : 'camOff'} size={18} />
              </button>
              <button
                className="live-ctrl"
                onClick={() => setShowSettings(v => !v)}
                title="Devices"
              >
                <Icon name="set" size={18} />
              </button>

              {showSettings && (
                <div className="live-settings" onClick={(e) => e.stopPropagation()}>
                  <label>Camera</label>
                  <select value={camId || ''} onChange={(e) => switchCamera(e.target.value)}>
                    {devices.cameras.length === 0 && <option value="">No camera detected</option>}
                    {devices.cameras.map(d => (
                      <option key={d.deviceId} value={d.deviceId}>{d.label || `Camera ${d.deviceId.slice(0, 4)}`}</option>
                    ))}
                  </select>
                  <label>Microphone</label>
                  <select value={micId || ''} onChange={(e) => switchMic(e.target.value)}>
                    {devices.mics.length === 0 && <option value="">No mic detected</option>}
                    {devices.mics.map(d => (
                      <option key={d.deviceId} value={d.deviceId}>{d.label || `Mic ${d.deviceId.slice(0, 4)}`}</option>
                    ))}
                  </select>
                  <button className="btn ghost sm" onClick={refreshDevices} style={{ marginTop: 6 }}>Refresh devices</button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="chat">
          <div className="chat-head row between">
            <span>Live chat</span>
            <span style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 400 }}>{messages.length} messages</span>
          </div>
          <div className="chat-body" ref={bodyRef}>
            {messages.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--ink-4)', textAlign: 'center', marginTop: 16 }}>
                {isLive ? 'Be the first to say hi' : 'Chat will be available once live'}
              </div>
            ) : messages.map((m, i) => (
              <div key={m.id || i} className="msg row" style={{ alignItems: 'flex-start', gap: 8 }}>
                <Avatar name={m.sender_name} id={m.sender_id || m.sender_name} size={24} fontSize={10} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="who">{m.sender_name}</div>
                  <div className="text">{m.message}</div>
                </div>
              </div>
            ))}
          </div>
          <form className="chat-input" onSubmit={send}>
            <input
              placeholder={user ? (isLive ? 'Send a message…' : 'Wait for live to chat') : 'Sign in to chat'}
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={!user || !isLive}
            />
            <button className="btn sm" type="submit" disabled={!text.trim() || !isLive}>Send</button>
          </form>
        </div>
      </div>
    </Layout>
  );
}
