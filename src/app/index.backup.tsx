import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, Dimensions } from 'react-native';

const getScreen = () => Dimensions.get('window');
const GRAVITY = 0.7;
const JUMP_FORCE = -15;
const MOVE_SPEED = 4;
const PLAYER_W = 20;
const PLAYER_H = 28;

function getLevel1(W: number, H: number) {
  const groundY = H * 0.72;
  const upperY = H * 0.35;
  return {
    playerStart: { x: W * 0.25, y: groundY - PLAYER_H },
    door: { x: W * 0.78, y: upperY - 50, w: 22, h: 38 },
    platforms: [
      { x: W * 0.22, y: groundY, w: W * 0.78, h: H * 0.28, fake: false },
      { x: W * 0.22, y: upperY, w: W * 0.78, h: 18, fake: false },
      { x: W * 0.5, y: upperY + 18, w: W * 0.08, h: groundY - upperY - 18, fake: false },
    ],
    spikes: [
      { x: W * 0.35, y: groundY - 14 },
      { x: W * 0.38, y: groundY - 14 },
      { x: W * 0.41, y: groundY - 14 },
      { x: W * 0.62, y: groundY - 14 },
      { x: W * 0.65, y: groundY - 14 },
    ],
  };
}

function getLevel2(W: number, H: number) {
  const groundY = H * 0.75;
  const midY = H * 0.5;
  const topY = H * 0.28;
  return {
    playerStart: { x: W * 0.1, y: groundY - PLAYER_H },
    door: { x: W * 0.82, y: topY - 50, w: 22, h: 38 },
    platforms: [
      { x: W * 0.05, y: groundY, w: W * 0.3, h: 18, fake: false },
      { x: W * 0.4, y: groundY, w: W * 0.25, h: 18, fake: true },
      { x: W * 0.7, y: groundY, w: W * 0.25, h: 18, fake: false },
      { x: W * 0.05, y: midY, w: W * 0.2, h: 18, fake: false },
      { x: W * 0.3, y: midY, w: W * 0.25, h: 18, fake: true },
      { x: W * 0.6, y: midY, w: W * 0.15, h: 18, fake: false },
      { x: W * 0.4, y: topY, w: W * 0.2, h: 18, fake: true },
      { x: W * 0.65, y: topY, w: W * 0.3, h: 18, fake: false },
      { x: 0, y: H * 0.92, w: W, h: 18, fake: false },
    ],
    spikes: [
      { x: W * 0.42, y: H * 0.92 - 14 },
      { x: W * 0.46, y: H * 0.92 - 14 },
      { x: W * 0.5, y: H * 0.92 - 14 },
      { x: W * 0.72, y: H * 0.92 - 14 },
      { x: W * 0.76, y: H * 0.92 - 14 },
    ],
  };
}

function getLevel3(W: number, H: number) {
  const groundY = H * 0.75;
  const midY = H * 0.48;
  const topY = H * 0.25;
  return {
    playerStart: { x: W * 0.08, y: groundY - PLAYER_H },
    door: { x: W * 0.85, y: topY - 50, w: 22, h: 38 },
    platforms: [
      { x: W * 0.05, y: groundY, w: W * 0.25, h: 18, fake: false },
      { x: W * 0.35, y: groundY, w: W * 0.2, h: 18, fake: true },
      { x: W * 0.6, y: groundY, w: W * 0.15, h: 18, fake: false },
      { x: W * 0.8, y: groundY, w: W * 0.15, h: 18, fake: true },
      { x: W * 0.1, y: midY, w: W * 0.15, h: 18, fake: true },
      { x: W * 0.3, y: midY, w: W * 0.2, h: 18, fake: false },
      { x: W * 0.55, y: midY, w: W * 0.15, h: 18, fake: true },
      { x: W * 0.75, y: midY, w: W * 0.2, h: 18, fake: false },
      { x: W * 0.05, y: topY, w: W * 0.2, h: 18, fake: true },
      { x: W * 0.3, y: topY, w: W * 0.15, h: 18, fake: false },
      { x: W * 0.5, y: topY, w: W * 0.15, h: 18, fake: true },
      { x: W * 0.7, y: topY, w: W * 0.25, h: 18, fake: false },
      { x: 0, y: H * 0.93, w: W, h: 18, fake: false },
    ],
    spikes: [
      { x: W * 0.3, y: H * 0.93 - 14 },
      { x: W * 0.34, y: H * 0.93 - 14 },
      { x: W * 0.55, y: H * 0.93 - 14 },
      { x: W * 0.59, y: H * 0.93 - 14 },
      { x: W * 0.63, y: H * 0.93 - 14 },
    ],
  };
}

function getLevelData(level: number, W: number, H: number) {
  if (level === 1) return getLevel1(W, H);
  if (level === 2) return getLevel2(W, H);
  return getLevel3(W, H);
}

// Pixel spike triangle using Views
function Spike({ x, y }: { x: number; y: number }) {
  return (
    <View style={{ position: 'absolute', left: x, top: y, width: 14, height: 14,
      borderLeftWidth: 7, borderRightWidth: 7, borderBottomWidth: 14,
      borderLeftColor: 'transparent', borderRightColor: 'transparent',
      borderBottomColor: '#5a3000' }} />
  );
}

export default function Game() {
  const audioCtx = useRef<any>(null);

  function getAudio() {
    if (typeof window === 'undefined') return null;
    if (!audioCtx.current) {
      audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioCtx.current;
  }

  function playJump() {
    const ctx = getAudio(); if (!ctx) return;
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.frequency.setValueAtTime(300, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.12);
    g.gain.setValueAtTime(0.3, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    o.start(); o.stop(ctx.currentTime + 0.15);
  }

  function playDeath() {
    const ctx = getAudio(); if (!ctx) return;
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(400, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.4);
    g.gain.setValueAtTime(0.4, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    o.start(); o.stop(ctx.currentTime + 0.4);
  }

  function playLevelComplete() {
    const ctx = getAudio(); if (!ctx) return;
    [523, 659, 784, 1047].forEach((freq, i) => {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.12);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.2);
      o.start(ctx.currentTime + i * 0.12);
      o.stop(ctx.currentTime + i * 0.12 + 0.2);
    });
  }
  const [screen, setScreen] = useState<'splash' | 'map' | 'game' | 'win'>('splash');
  const [tick, setTick] = useState(0);
  const [lives, setLives] = useState(5);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [unlockedLevels, setUnlockedLevels] = useState(1);
  const [dims, setDims] = useState(getScreen());
  const [facingRight, setFacingRight] = useState(true);
  const [deathFlash, setDeathFlash] = useState(false);
  const [shakeX, setShakeX] = useState(0);
  const [isDead, setIsDead] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [splashEye, setSplashEye] = useState(false);

  const px = useRef(0);
  const py = useRef(0);
  const vy = useRef(0);
  const onGround = useRef(false);
  const moving = useRef<'left' | 'right' | null>(null);
  const jumpCooldown = useRef(false);
  const alive = useRef(true);
  const fakePlatforms = useRef<{ [key: number]: number }>({});
  const leftTouchId = useRef<number | null>(null);
  const leftTouchX = useRef<number | null>(null);
  const jumpTouchId = useRef<number | null>(null);

  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => setDims(window));
    return () => sub?.remove();
  }, []);

  // Splash eye blink
  useEffect(() => {
    if (screen !== 'splash') return;
    const t = setTimeout(() => setSplashEye(true), 800);
    const t2 = setTimeout(() => setScreen('map'), 2200);
    return () => { clearTimeout(t); clearTimeout(t2); };
  }, [screen]);

  const W = dims.width;
  const H = dims.height;
  const BTN_W = 80;
  const BTN_H = 44;
  const btnY = H - BTN_H - 28;
  const leftBtnX = 18;
  const rightBtnX = 108;
  const jumpBtnX = W - BTN_W - 18;

  function resetLevel() {
    const lev = getLevelData(currentLevel, W, H);
    px.current = lev.playerStart.x;
    py.current = lev.playerStart.y;
    vy.current = 0;
    onGround.current = false;
    alive.current = true;
    jumpCooldown.current = false;
    moving.current = null;
    fakePlatforms.current = {};
    leftTouchX.current = null;
    leftTouchId.current = null;
    jumpTouchId.current = null;
    setFacingRight(true);
    setIsDead(false);
  }

  function startLevel(level: number) {
    setCurrentLevel(level);
    setTimeout(() => {
      const lev = getLevelData(level, W, H);
      px.current = lev.playerStart.x;
      py.current = lev.playerStart.y;
      vy.current = 0;
      onGround.current = false;
      alive.current = true;
      jumpCooldown.current = false;
      moving.current = null;
      fakePlatforms.current = {};
      leftTouchX.current = null;
      leftTouchId.current = null;
      jumpTouchId.current = null;
      setFacingRight(true);
      setIsDead(false);
      setScreen('game');
    }, 50);
  }

  function die() {
    if (!alive.current || isPaused) return;
    alive.current = false;
    playDeath();
    setDeathFlash(true);
    setIsDead(true);
    setTimeout(() => setDeathFlash(false), 400);
    let shakes = 0;
    const si = setInterval(() => {
      setShakeX(Math.random() > 0.5 ? 7 : -7);
      shakes++;
      if (shakes > 8) { clearInterval(si); setShakeX(0); }
    }, 40);
    setLives(l => {
      const n = l - 1;
      if (n <= 0) {
        setTimeout(() => { setLives(5); setUnlockedLevels(1); setScreen('map'); }, 900);
        return 5;
      }
      return n;
    });
  }

  function retryLevel() {
    resetLevel();
  }

  function doJump() {
    if (onGround.current && !jumpCooldown.current) {
      vy.current = JUMP_FORCE;
      playJump();
      onGround.current = false;
      jumpCooldown.current = true;
      setTimeout(() => { jumpCooldown.current = false; }, 320);
    }
  }

  function handleTouchStart(e: any) {
    if (screen !== 'game') return;
    if (isDead) { retryLevel(); return; }
    const touches = e.nativeEvent.changedTouches;
    for (let i = 0; i < touches.length; i++) {
      const t = touches[i];
      const tx = t.pageX; const ty = t.pageY;
      if (tx >= leftBtnX && tx <= leftBtnX + BTN_W && ty >= btnY && ty <= btnY + BTN_H) {
        leftTouchId.current = t.identifier; leftTouchX.current = tx;
        moving.current = 'left'; setFacingRight(false);
      } else if (tx >= rightBtnX && tx <= rightBtnX + BTN_W && ty >= btnY && ty <= btnY + BTN_H) {
        leftTouchId.current = t.identifier; leftTouchX.current = tx;
        moving.current = 'right'; setFacingRight(true);
      } else if (tx >= jumpBtnX && tx <= jumpBtnX + BTN_W && ty >= btnY && ty <= btnY + BTN_H) {
        jumpTouchId.current = t.identifier; doJump();
      }
    }
  }

  function handleTouchMove(e: any) {
    if (screen !== 'game' || isDead) return;
    const touches = e.nativeEvent.changedTouches;
    for (let i = 0; i < touches.length; i++) {
      const t = touches[i];
      if (t.identifier === leftTouchId.current) {
        const dx = t.pageX - (leftTouchX.current ?? t.pageX);
        leftTouchX.current = t.pageX;
        if (dx > 2) { moving.current = 'right'; setFacingRight(true); }
        else if (dx < -2) { moving.current = 'left'; setFacingRight(false); }
      }
      if (t.identifier === jumpTouchId.current) doJump();
    }
  }

  function handleTouchEnd(e: any) {
    if (screen !== 'game') return;
    const touches = e.nativeEvent.changedTouches;
    for (let i = 0; i < touches.length; i++) {
      const t = touches[i];
      if (t.identifier === leftTouchId.current) {
        leftTouchId.current = null; leftTouchX.current = null; moving.current = null;
      }
      if (t.identifier === jumpTouchId.current) jumpTouchId.current = null;
    }
  }

  useEffect(() => {
    if (screen !== 'game') return;
    const interval = setInterval(() => {
      if (!alive.current) return;
      const lev = getLevelData(currentLevel, W, H);
      let vx = 0;
      if (moving.current === 'right') vx = MOVE_SPEED;
      else if (moving.current === 'left') vx = -MOVE_SPEED;
      vy.current += GRAVITY;
      px.current += vx;
      py.current += vy.current;
      onGround.current = false;
      lev.platforms.forEach((p, i) => {
        if (p.fake && fakePlatforms.current[i] === 2) return;
        const pb = py.current + PLAYER_H;
        const pr = px.current + PLAYER_W;
        const prevB = pb - vy.current;
        const overX = pr > p.x + 2 && px.current < p.x + p.w - 2;
        const falling = vy.current >= 0;
        const crossed = prevB <= p.y + 12 && pb >= p.y;
        if (overX && falling && crossed) {
          py.current = p.y - PLAYER_H;
          vy.current = 0;
          onGround.current = true;
          if (p.fake && fakePlatforms.current[i] === undefined) {
            fakePlatforms.current[i] = 1;
            setTimeout(() => { fakePlatforms.current[i] = 2; }, 600);
          }
        }
      });
      if (px.current < 0) px.current = 0;
      if (px.current + PLAYER_W > W) px.current = W - PLAYER_W;
      if (py.current > H + 50) { die(); return; }
      for (const s of lev.spikes) {
        if (px.current + PLAYER_W > s.x && px.current < s.x + 14 &&
          py.current + PLAYER_H > s.y && py.current < s.y + 14) {
          die(); return;
        }
      }
      const d = lev.door;
      if (px.current + PLAYER_W > d.x && px.current < d.x + d.w &&
        py.current + PLAYER_H > d.y && py.current < d.y + d.h) {
        alive.current = false;
    playDeath();
        setUnlockedLevels(u => Math.max(u, currentLevel + 1));
        playLevelComplete();
        if (currentLevel < 3) {
          setTimeout(() => startLevel(currentLevel + 1), 400);
        } else {
          setScreen('win');
        }
        return;
      }
      setTick(t => t + 1);
    }, 16);
    return () => clearInterval(interval);
  }, [screen, currentLevel, dims]);

  // SPLASH
  if (screen === 'splash') return (
    <View style={{ width: W, height: H, backgroundColor: '#6b0a00', justifyContent: 'center', alignItems: 'center' }}>
      {splashEye && (
        <View style={{ flexDirection: 'row', gap: 40 }}>
          {[0, 1].map(i => (
            <View key={i} style={{ width: 38, height: 22, backgroundColor: '#c44b00', borderRadius: 3,
              transform: [{ rotate: i === 0 ? '-18deg' : '18deg' }] }} />
          ))}
        </View>
      )}
    </View>
  );

  // MAP
  if (screen === 'map') return (
    <View style={{ width: W, height: H, backgroundColor: '#e8820a', overflow: 'hidden' }}>
      {/* Flame header */}
      <View style={{ width: W, height: H * 0.22, backgroundColor: '#6b0a00', justifyContent: 'flex-end', paddingBottom: 8, alignItems: 'center' }}>
        {/* Flame tips */}
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', flexWrap: 'wrap' }}>
          {Array.from({ length: 28 }).map((_, i) => (
            <View key={i} style={{ width: W / 28, height: 18 + (i % 3) * 10,
              borderTopLeftRadius: 6, borderTopRightRadius: 6,
              backgroundColor: i % 2 === 0 ? '#e8820a' : '#d4700a' }} />
          ))}
        </View>
        <Text style={{ fontSize: 36, color: '#c44b00', fontWeight: 'bold', letterSpacing: 4, fontFamily: 'monospace', zIndex: 1 }}>LEVEL DEVIL</Text>
      </View>

      {/* Lives */}
      <View style={{ position: 'absolute', left: 16, top: H * 0.26, flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ width: 22, height: 22, backgroundColor: '#5a3000', borderRadius: 3, justifyContent: 'center', alignItems: 'center', marginRight: 6 }}>
          <Text style={{ color: '#e8820a', fontSize: 13 }}>👻</Text>
        </View>
        <Text style={{ color: '#5a3000', fontSize: 18, fontWeight: 'bold', fontFamily: 'monospace' }}>{lives}</Text>
      </View>

      {/* Level dots */}
      <View style={{ position: 'absolute', top: H * 0.3, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ flexDirection: 'row', gap: 24, alignItems: 'center' }}>
          {[1, 2, 3].map(lvl => (
            <View key={lvl} style={{ alignItems: 'center' }}
              onTouchEnd={() => { if (unlockedLevels >= lvl) startLevel(lvl); }}>
              <View style={{
                width: 52, height: 62,
                backgroundColor: unlockedLevels >= lvl ? '#c8641a' : '#a05a10',
                borderRadius: 26,
                borderBottomLeftRadius: 6, borderBottomRightRadius: 6,
                justifyContent: 'center', alignItems: 'center',
                borderWidth: 3, borderColor: '#5a3000',
              }}>
                {unlockedLevels >= lvl ? (
                  <Text style={{ color: '#2a1000', fontSize: 22, fontWeight: 'bold', fontFamily: 'monospace' }}>{lvl}</Text>
                ) : (
                  <Text style={{ fontSize: 20 }}>🔒</Text>
                )}
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );

  // WIN
  if (screen === 'win') return (
    <View style={{ width: W, height: H, backgroundColor: '#e8820a', justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 32, color: '#5a3000', fontWeight: 'bold', fontFamily: 'monospace', marginBottom: 8 }}>LEVEL CLEAR!</Text>
      <Text style={{ fontSize: 18, color: '#5a3000', fontFamily: 'monospace', marginBottom: 32 }}>Level {currentLevel} complete</Text>
      {currentLevel < 3 && (
        <View style={{ backgroundColor: '#5a3000', paddingHorizontal: 28, paddingVertical: 12, borderRadius: 6, marginBottom: 14 }}
          onTouchEnd={() => startLevel(currentLevel + 1)}>
          <Text style={{ color: '#e8820a', fontSize: 18, fontWeight: 'bold', fontFamily: 'monospace' }}>NEXT LEVEL</Text>
        </View>
      )}
      <View style={{ backgroundColor: '#5a3000', paddingHorizontal: 28, paddingVertical: 12, borderRadius: 6 }}
        onTouchEnd={() => setScreen('map')}>
        <Text style={{ color: '#e8820a', fontSize: 16, fontFamily: 'monospace' }}>MAP</Text>
      </View>
    </View>
  );

  // GAME
  const lev = getLevelData(currentLevel, W, H);

  return (
    <View
      style={{ width: W, height: H, backgroundColor: '#c8780a', overflow: 'hidden', transform: [{ translateX: shakeX }] }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd} onContextMenu={(e: any) => e.preventDefault()}
    >
      {/* Platforms */}
      {lev.platforms.map((p, i) => {
        const state = fakePlatforms.current[i];
        if (state === 2) return null;
        return (
          <View key={i} style={{
            position: 'absolute',
            left: p.x + (state === 1 ? (Math.random() > 0.5 ? 3 : -3) : 0),
            top: p.y, width: p.w, height: p.h,
            backgroundColor: p.fake ? '#b06010' : '#e8a830',
          }} />
        );
      })}

      {/* Spikes */}
      {lev.spikes.map((s, i) => <Spike key={i} x={s.x} y={s.y} />)}

      {/* Door */}
      <View style={{ position: 'absolute', left: lev.door.x, top: lev.door.y,
        width: lev.door.w, height: lev.door.h,
        backgroundColor: '#c0b090', borderRadius: 2,
        borderWidth: 2, borderColor: '#8a7060' }} />

      {/* Player - black silhouette */}
      {!isDead && (
        <View style={{
          position: 'absolute', left: px.current, top: py.current,
          width: PLAYER_W, height: PLAYER_H,
          backgroundColor: '#1a0a00',
          transform: [{ scaleX: facingRight ? 1 : -1 }],
        }}>
          {/* Head */}
          <View style={{ position: 'absolute', top: 0, left: 3, width: 14, height: 14, backgroundColor: '#1a0a00', borderRadius: 3 }} />
        </View>
      )}

      {/* HUD - lives as squares */}
      <View style={{ position: 'absolute', top: 16, left: W / 2 - (lives * 14) / 2, flexDirection: 'row', gap: 4 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <View key={i} style={{ width: 12, height: 12, backgroundColor: i < lives ? '#1a0a00' : '#a06010', borderRadius: 1 }} />
        ))}
      </View>

      {/* Pause + Back */}
      <View style={{ position: 'absolute', top: 14, left: 12, flexDirection: 'row', gap: 6 }}>
        <View style={{ width: 30, height: 30, backgroundColor: '#5a3000', borderRadius: 4, justifyContent: 'center', alignItems: 'center' }}
          onTouchEnd={() => setIsPaused(true)}>
          <Text style={{ color: '#e8820a', fontSize: 12, fontWeight: 'bold' }}>II</Text>
        </View>
        <View style={{ width: 30, height: 30, backgroundColor: '#5a3000', borderRadius: 4, justifyContent: 'center', alignItems: 'center' }}
          onTouchEnd={() => setScreen('map')}>
          <Text style={{ color: '#e8820a', fontSize: 14 }}>↩</Text>
        </View>
      </View>
{/* Pause popup */}
      {isPaused && (
        <View style={{ position: 'absolute', top: 0, left: 0, width: W, height: H, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#5a3000', borderRadius: 12, padding: 28, alignItems: 'center', gap: 14 }}>
            <Text style={{ color: '#e8820a', fontSize: 22, fontWeight: 'bold', fontFamily: 'monospace', marginBottom: 8 }}>PAUSED</Text>
            <View style={{ backgroundColor: '#e8820a', paddingHorizontal: 32, paddingVertical: 12, borderRadius: 8 }}
              onTouchEnd={() => setIsPaused(false)}>
              <Text style={{ color: '#5a3000', fontSize: 18, fontWeight: 'bold', fontFamily: 'monospace' }}>RESUME</Text>
            </View>
            <View style={{ backgroundColor: '#e8820a', paddingHorizontal: 32, paddingVertical: 12, borderRadius: 8 }}
              onTouchEnd={() => { setIsPaused(false); resetLevel(); }}>
              <Text style={{ color: '#5a3000', fontSize: 18, fontWeight: 'bold', fontFamily: 'monospace' }}>RESTART</Text>
            </View>
            <View style={{ backgroundColor: '#e8820a', paddingHorizontal: 32, paddingVertical: 12, borderRadius: 8 }}
              onTouchEnd={() => { setIsPaused(false); setScreen('map'); }}>
              <Text style={{ color: '#5a3000', fontSize: 18, fontWeight: 'bold', fontFamily: 'monospace' }}>MAP</Text>
            </View>
          </View>
        </View>
      )}
      {/* TAP TO RETRY */}
      {isDead && (
        <View style={{ position: 'absolute', top: H * 0.15, left: 0, right: 0, alignItems: 'center' }}>
          <Text style={{ color: '#e8a830', fontSize: 18, fontFamily: 'monospace', letterSpacing: 3 }}>TAP TO RETRY</Text>
        </View>
      )}

      {/* Buttons - outline style */}
      <View style={{ position: 'absolute', left: leftBtnX, top: btnY, width: BTN_W, height: BTN_H,
        borderRadius: 22, borderWidth: 3, borderColor: '#5a3000', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: 20, color: '#5a3000' }}>◀</Text>
      </View>
      <View style={{ position: 'absolute', left: rightBtnX, top: btnY, width: BTN_W, height: BTN_H,
        borderRadius: 22, borderWidth: 3, borderColor: '#5a3000', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: 20, color: '#5a3000' }}>▶</Text>
      </View>
      <View style={{ position: 'absolute', left: jumpBtnX, top: btnY, width: BTN_W, height: BTN_H,
        borderRadius: 22, borderWidth: 3, borderColor: '#5a3000', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: 20, color: '#5a3000' }}>▲</Text>
      </View>

      {/* Death flash */}
      {deathFlash && (
        <View style={{ position: 'absolute', top: 0, left: 0, width: W, height: H, backgroundColor: 'rgba(255,0,0,0.35)' }} />
      )}
    </View>
  );
}