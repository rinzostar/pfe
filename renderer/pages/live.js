import Layout from '../components/Layout';
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../lib/auth';
import { getModule, getActiveLivestreamForModule, endLivestream, listChat, sendChat, createLivestream } from '../lib/db';
import { convex } from '../lib/convexClient';
import { api } from '../../convex/_generated/api';
import { toast } from '../lib/toast';
import Avatar from '../components/Avatar';
import FadeIn from '../components/FadeIn';
import { Room, RoomEvent } from 'livekit-client';

const LIVEKIT_URL = 'wss://rinzo-qce35wpz.livekit.cloud';

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

function Icon({ name, size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={I[name]} />
    </svg>
  );
}

async function getLivekitToken({ roomName, identity, name, isHost }) {
  const res = await convex.action(api.livekit.getToken, { roomName, identity, name, isHost });
  return res.token;
}

export default function Live() {
  const router = useRouter();
  const { user } = useAuth();
  const queryModule = Array.isArray(router.query.module) ? router.query.module[0] : router.query.module;

  const [livestream, setLivestream] = useState(null);
  const [moduleInfo, setModuleInfo] = useState(null);
  const [isLive, setIsLive] = useState(false);
  const [loading, setLoading] = useState(true);
  const isHost = useMemo(() => {
    return !!user && (user.role === 'admin' || (user.role === 'professor' && moduleInfo?.ownerId === user.id));
  }, [user, moduleInfo]);

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const bodyRef = useRef(null);

  const [status, setStatus] = useState('idle');
  const [participants, setParticipants] = useState(0);

  const [camOn, setCamOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  const videoRef = useRef(null);
  const previewStreamRef = useRef(null);
  const roomRef = useRef(null);

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
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [queryModule]);

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
    if (router.isReady && !queryModule) {
      setLoading(true);
      toast.error('Open live from a module');
      router.replace('/browse');
    }
  }, [router, queryModule]);

  // Lobby preview
  useEffect(() => {
    if (isHost && !isLive && !loading) {
      (async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: camOn ? true : false,
            audio: micOn ? true : false,
          });
          previewStreamRef.current = stream;
          if (videoRef.current) videoRef.current.srcObject = stream;
        } catch (e) {
          console.warn('Preview error:', e);
        }
      })();
    } else {
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
  }, [isHost, isLive, loading, camOn, micOn]);

  // Load chat
  useEffect(() => {
    if (!livestream?._id) return;
    const loadChat = async () => {
      const { data } = await listChat(String(livestream._id));
      if (data) setMessages(data.map(m => ({ id: m._id, sender_id: m.senderId, sender_name: m.senderName, message: m.message })));
    };
    loadChat();
    const interval = setInterval(loadChat, 5000);
    return () => clearInterval(interval);
  }, [livestream?._id]);

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [messages]);

  // LiveKit room connection
  useEffect(() => {
    if (!isLive || !user || !queryModule) return;

    let room = null;
    let mounted = true;

    const connect = async () => {
      try {
        setStatus('connecting');

        const token = await getLivekitToken({
          roomName: `module-${queryModule}`,
          identity: String(user.id),
          name: user.name || 'Anonymous',
          isHost,
        });

        room = new Room({
          adaptiveStream: true,
          dynacast: true,
        });
        roomRef.current = room;

        room.on(RoomEvent.ParticipantConnected, () => {
          if (!mounted) return;
          setParticipants(room.remoteParticipants.size + 1);
        });

        room.on(RoomEvent.ParticipantDisconnected, () => {
          if (!mounted) return;
          setParticipants(room.remoteParticipants.size + 1);
        });

        room.on(RoomEvent.LocalTrackPublished, (publication) => {
          if (!mounted) return;
          if (publication.track?.kind === 'video' && videoRef.current) {
            publication.track.attach(videoRef.current);
          }
        });

        room.on(RoomEvent.LocalTrackUnpublished, (publication) => {
          if (!mounted) return;
          if (publication.track?.kind === 'video' && videoRef.current) {
            publication.track.detach(videoRef.current);
          }
        });

        room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
          if (!mounted) return;
          if (participant === room.localParticipant) return;
          if (videoRef.current) {
            track.attach(videoRef.current);
          }
        });

        room.on(RoomEvent.TrackUnsubscribed, (track) => {
          track.detach();
        });

        room.on(RoomEvent.Disconnected, () => {
          if (!mounted) return;
          roomRef.current = null;
          setStatus('idle');
        });

        await room.connect(LIVEKIT_URL, token);
        if (!mounted) {
          room.disconnect();
          return;
        }

        if (isHost) {
          await room.localParticipant.setCameraEnabled(camOn);
          await room.localParticipant.setMicrophoneEnabled(micOn);
        }

        setParticipants(room.remoteParticipants.size + 1);
        setStatus('connected');
      } catch (e) {
        console.error('LiveKit connect error:', e);
        if (mounted) {
          setStatus('error');
          toast.error('Failed to connect to live session');
        }
      }
    };

    connect();

    return () => {
      mounted = false;
      if (room) {
        room.disconnect();
        roomRef.current = null;
      }
    };
  }, [isLive, user, queryModule, isHost]);

  // Toggle cam/mic while connected
  useEffect(() => {
    const room = roomRef.current;
    if (!room || !isHost || status !== 'connected') return;
    room.localParticipant.setCameraEnabled(camOn).catch(() => {});
    room.localParticipant.setMicrophoneEnabled(micOn).catch(() => {});
  }, [camOn, micOn, isHost, status]);

  const startSession = async () => {
    setStatus('connecting');
    const { data, error } = await createLivestream({
      moduleId: String(queryModule),
      moduleName: moduleInfo?.name || 'Live',
      roomName: `module-${queryModule}`,
    });
    if (error) {
      toast.error('Failed to start live');
      setStatus('idle');
      return;
    }
    setLivestream(data);
    setIsLive(true);
    toast.success('Module is live');
  };

  const endSession = async () => {
    if (!confirm('End live for this module?')) return;
    setIsLive(false);
    await endLivestream(livestream?._id).catch(() => {});
    setLivestream(null);
    setMessages([]);
    setStatus('idle');
    toast.success('Module is offline');
  };

  const leave = async () => {
    router.back();
  };

  const send = async (e) => {
    e.preventDefault();
    if (!text.trim() || !user || !livestream) return;
    const msg = text.trim();
    setText('');
    const newMsg = { id: Date.now(), sender_name: user.name || 'You', message: msg };
    setMessages(prev => [...prev, newMsg]);
    await sendChat(String(livestream.id), user.id, user.name || 'You', msg).catch(() => {});
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
      <FadeIn>
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
      </FadeIn>

      <div className="live-wrap">
        <div className="video-stage">
          {isLive && status === 'connected' && <span className="pill live live-badge">On air</span>}

          {!isLive && !isHost && (
            <div className="live-placeholder">
              <div style={{ fontSize: 36, marginBottom: 14 }}>⏳</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 6 }}>Session hasn't started yet</div>
              <div style={{ color: '#9ca3af', maxWidth: 260, fontWeight: 500 }}>This page will join automatically when the professor starts.</div>
              <button className="btn sm ghost" style={{ marginTop: 22 }} onClick={() => refreshLiveState()}>Check now</button>
            </div>
          )}

          {!isLive && isHost && (
            <div className="live-placeholder" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)', zIndex: 10 }}>
              <div style={{ fontSize: 36, marginBottom: 14 }}>🎬</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 10 }}>Ready to start?</div>
              <div style={{ color: 'rgba(255,255,255,0.7)', marginBottom: 28, maxWidth: 320, fontWeight: 500 }}>
                Check your camera and microphone before students join.
              </div>
              <button className="btn live" style={{ padding: '14px 28px', fontSize: 16 }} onClick={startSession} disabled={status === 'connecting'}>
                {status === 'connecting' ? 'Starting...' : <><Icon name="play" size={20} /> Go live</>}
              </button>
            </div>
          )}

          {isLive && status === 'error' && (
            <div className="live-placeholder">
              <div style={{ fontSize: 28, marginBottom: 10 }}>⚠️</div>
              <button className="btn sm" style={{ marginTop: 14 }} onClick={() => router.reload()}>Retry</button>
            </div>
          )}

          {isLive && status === 'connecting' && (
            <div className="live-placeholder"><div className="spinner" />{statusLabel}</div>
          )}

          {isLive && status === 'connected' && !camOn && isHost && (
            <div className="live-placeholder">
              <div style={{ fontSize: 28, marginBottom: 10 }}>📷</div>
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
              display: (isHost || (isLive && status === 'connected')) ? 'block' : 'none',
            }}
          />

          {isHost && (
            <div className="live-controls">
              <button
                className={`live-ctrl ${micOn ? '' : 'off'}`}
                onClick={() => setMicOn(!micOn)}
                title={micOn ? 'Mute mic' : 'Unmute mic'}
              >
                <Icon name={micOn ? 'mic' : 'micOff'} size={20} />
              </button>
              <button
                className={`live-ctrl ${camOn ? '' : 'off'}`}
                onClick={() => setCamOn(!camOn)}
                title={camOn ? 'Turn camera off' : 'Turn camera on'}
              >
                <Icon name={camOn ? 'cam' : 'camOff'} size={20} />
              </button>
              <button
                className="live-ctrl"
                onClick={() => setShowSettings(v => !v)}
                title="Devices"
              >
                <Icon name="set" size={20} />
              </button>

              {showSettings && (
                <div className="live-settings" onClick={(e) => e.stopPropagation()}>
                  <label>Camera</label>
                  <select><option>Default Camera</option></select>
                  <label>Microphone</label>
                  <select><option>Default Microphone</option></select>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="chat">
          <div className="chat-head row between">
            <span>Live chat</span>
            <span style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600 }}>{messages.length} messages</span>
          </div>
          <div className="chat-body" ref={bodyRef}>
            {messages.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--ink-4)', textAlign: 'center', marginTop: 18, fontWeight: 500 }}>
                {isLive ? 'Be the first to say hi' : 'Chat will be available once live'}
              </div>
            ) : messages.map((m, i) => (
              <div key={m.id || i} className="msg row" style={{ alignItems: 'flex-start', gap: 10 }}>
                <Avatar name={m.sender_name} id={m.sender_id || m.sender_name} size={28} fontSize={11} />
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
