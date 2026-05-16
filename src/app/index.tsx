import { useState, useEffect, useRef } from 'react';
import { View, Text, Dimensions } from 'react-native';

const getScreen = () => Dimensions.get('window');
const GRAVITY = 0.7;
const JUMP_FORCE = -15;
const MOVE_SPEED = 4;
const PLAYER_W = 28;
const PLAYER_H = 28;

function getLevel(W: number, H: number) {
  const groundY = H * 0.72;
  const upperY = H * 0.35;
  return {
    playerStart: { x: W * 0.25, y: groundY - PLAYER_H },
    door: { x: W * 0.78, y: upperY - 50, w: 24, h: 44 },
    platforms: [
      { x: W * 0.22, y: groundY, w: W * 0.78, h: H * 0.28, trap: false },
      { x: W * 0.22, y: upperY, w: W * 0.78, h: 18, trap: false },
      { x: W * 0.5, y: upperY + 18, w: W * 0.08, h: groundY - upperY - 18, trap: false },
    ],
    spikes: [
      { x: W * 0.35, y: groundY - 18 },
      { x: W * 0.38, y: groundY - 18 },
      { x: W * 0.41, y: groundY - 18 },
      { x: W * 0.62, y: groundY - 18 },
      { x: W * 0.65, y: groundY - 18 },
    ],
  };
}

export default function Game() {
  const [screen, setScreen] = useState<'map' | 'game' | 'dead' | 'win'>('map');
  const [tick, setTick] = useState(0);
  const [lives, setLives] = useState(6);
  const [dims, setDims] = useState(getScreen());
  const [facingRight, setFacingRight] = useState(true);

  const px = useRef(0);
  const py = useRef(0);
  const vy = useRef(0);
  const onGround = useRef(false);
  const moving = useRef<'left' | 'right' | null>(null);
  const jumpCooldown = useRef(false);
  const alive = useRef(true);

  const leftTouchX = useRef<number | null>(null);
  const leftTouchId = useRef<number | null>(null);
  const jumpTouchId = useRef<number | null>(null);

  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => setDims(window));
    return () => sub?.remove();
  }, []);

  const W = dims.width;
  const H = dims.height;
  const BTN_SIZE = 65;
  const leftBtnX = 10;
  const rightBtnX = 85;
  const btnY = H - BTN_SIZE - 20;
  const jumpBtnX = W - BTN_SIZE - 10;

  function resetLevel() {
    const lev = getLevel(W, H);
    px.current = lev.playerStart.x;
    py.current = lev.playerStart.y;
    vy.current = 0;
    onGround.current = false;
    alive.current = true;
    jumpCooldown.current = false;
    moving.current = null;
    leftTouchX.current = null;
    leftTouchId.current = null;
    jumpTouchId.current = null;
    setFacingRight(true);
  }

  function startLevel() { resetLevel(); setScreen('game'); }

  function die() {
    if (!alive.current) return;
    alive.current = false;
    setLives(l => {
      const n = l - 1;
      if (n <= 0) { setTimeout(() => setScreen('map'), 800); return 6; }
      setScreen('dead');
      return n;
    });
  }

  function doJump() {
    if (onGround.current && !jumpCooldown.current) {
      vy.current = JUMP_FORCE;
      onGround.current = false;
      jumpCooldown.current = true;
      setTimeout(() => { jumpCooldown.current = false; }, 320);
    }
  }

  function handleTouchStart(e: any) {
    if (screen !== 'game') return;
    const touches = e.nativeEvent.changedTouches;
    for (let i = 0; i < touches.length; i++) {
      const t = touches[i];
      const tx = t.pageX;
      const ty = t.pageY;
      if (tx >= leftBtnX && tx <= leftBtnX + BTN_SIZE && ty >= btnY && ty <= btnY + BTN_SIZE) {
        leftTouchId.current = t.identifier;
        leftTouchX.current = tx;
        moving.current = 'left';
        setFacingRight(false);
      } else if (tx >= rightBtnX && tx <= rightBtnX + BTN_SIZE && ty >= btnY && ty <= btnY + BTN_SIZE) {
        leftTouchId.current = t.identifier;
        leftTouchX.current = tx;
        moving.current = 'right';
        setFacingRight(true);
      } else if (tx >= jumpBtnX && tx <= jumpBtnX + BTN_SIZE && ty >= btnY && ty <= btnY + BTN_SIZE) {
        jumpTouchId.current = t.identifier;
        doJump();
      }
    }
  }

  function handleTouchMove(e: any) {
    if (screen !== 'game') return;
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
        leftTouchId.current = null;
        leftTouchX.current = null;
        moving.current = null;
      }
      if (t.identifier === jumpTouchId.current) jumpTouchId.current = null;
    }
  }

  useEffect(() => {
    if (screen !== 'game') return;
    const interval = setInterval(() => {
      if (!alive.current) return;
      const W = dims.width;
      const H = dims.height;
      const lev = getLevel(W, H);

      let vx = 0;
      if (moving.current === 'right') vx = MOVE_SPEED;
      else if (moving.current === 'left') vx = -MOVE_SPEED;

      vy.current += GRAVITY;
      px.current += vx;
      py.current += vy.current;
      onGround.current = false;

      for (const p of lev.platforms) {
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
        }
      }

      if (px.current < 0) px.current = 0;
      if (px.current + PLAYER_W > W) px.current = W - PLAYER_W;
      if (py.current > H + 50) { die(); return; }

      for (const s of lev.spikes) {
        if (px.current + PLAYER_W > s.x && px.current < s.x + 16 &&
          py.current + PLAYER_H > s.y && py.current < s.y + 16) {
          die(); return;
        }
      }

      const d = lev.door;
      if (px.current + PLAYER_W > d.x && px.current < d.x + d.w &&
        py.current + PLAYER_H > d.y && py.current < d.y + d.h) {
        alive.current = false;
        setScreen('win');
        return;
      }

      setTick(t => t + 1);
    }, 16);
    return () => clearInterval(interval);
  }, [screen, dims]);

  if (screen === 'map') return (
    <View style={{ width: W, height: H, backgroundColor: '#c8600a', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 36, color: '#7a1a00', fontWeight: 'bold', marginBottom: 30 }}>😈 LEVEL DEVIL</Text>
      <View style={{ width: W * 0.85, height: H * 0.5, backgroundColor: '#e8a020', borderRadius: 12, padding: 20 }}>
        <View style={{ width: 55, height: 55, backgroundColor: '#7a3a00', borderRadius: 28, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#fff' }} onTouchEnd={startLevel}>
          <Text style={{ color: '#fff', fontSize: 20, fontWeight: 'bold' }}>1</Text>
        </View>
      </View>
      <Text style={{ fontSize: 24, color: '#fff', marginTop: 20 }}>👻 {lives}</Text>
    </View>
  );

  if (screen === 'dead') return (
    <View style={{ width: W, height: H, backgroundColor: '#1a0000', justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 40, color: '#ff4400', fontWeight: 'bold', marginBottom: 16 }}>💀 YOU DIED</Text>
      <Text style={{ fontSize: 24, color: '#fff', marginBottom: 24 }}>👻 {lives} lives left</Text>
      <View style={{ backgroundColor: '#7a1a00', padding: 14, borderRadius: 10 }} onTouchEnd={startLevel}>
        <Text style={{ color: '#fff', fontSize: 20, fontWeight: 'bold' }}>TRY AGAIN</Text>
      </View>
    </View>
  );

  if (screen === 'win') return (
    <View style={{ width: W, height: H, backgroundColor: '#003300', justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 40, color: '#00ff00', fontWeight: 'bold', marginBottom: 20 }}>🎉 LEVEL CLEAR!</Text>
      <View style={{ backgroundColor: '#7a1a00', padding: 14, borderRadius: 10 }} onTouchEnd={() => setScreen('map')}>
        <Text style={{ color: '#fff', fontSize: 20, fontWeight: 'bold' }}>BACK TO MAP</Text>
      </View>
    </View>
  );

  const lev = getLevel(W, H);
  const groundY = H * 0.72;
  const upperY = H * 0.35;

  return (
    <View
      style={{ width: W, height: H, backgroundColor: '#c8841a', overflow: 'hidden' }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Background left side */}
      <View style={{ position: 'absolute', left: 0, top: 0, width: W * 0.22, height: H, backgroundColor: '#b87010' }} />

      {/* Upper platform */}
      <View style={{ position: 'absolute', left: W * 0.22, top: upperY, width: W * 0.78, height: 18, backgroundColor: '#a05c00' }} />

      {/* Ground block */}
      <View style={{ position: 'absolute', left: W * 0.22, top: groundY, width: W * 0.78, height: H - groundY, backgroundColor: '#c8a040' }} />

      {/* Middle pillar */}
      <View style={{ position: 'absolute', left: W * 0.5, top: upperY + 18, width: W * 0.08, height: groundY - upperY - 18, backgroundColor: '#c8a040' }} />

      {/* Spikes */}
      {lev.spikes.map((s, i) => (
        <Text key={i} style={{ position: 'absolute', left: s.x, top: s.y, fontSize: 14 }}>🔺</Text>
      ))}

      {/* Door */}
      <View style={{ position: 'absolute', left: lev.door.x, top: lev.door.y, width: lev.door.w, height: lev.door.h, backgroundColor: '#888', borderRadius: 3, borderWidth: 2, borderColor: '#fff' }} />

      {/* Player - kangaroo facing direction */}
      <Text style={{
        position: 'absolute',
        left: px.current,
        top: py.current,
        fontSize: 28,
        transform: [{ scaleX: facingRight ? -1 : 1 }]
      }}>🦘</Text>

      {/* HUD */}
      <View style={{ position: 'absolute', top: 20, left: 20, flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ width: 28, height: 36, backgroundColor: '#7a3a00', borderRadius: 3, marginRight: 6 }} />
        <View style={{ width: 28, height: 36, backgroundColor: '#7a3a00', borderRadius: 3, marginRight: 6 }} />
        <View style={{ width: 28, height: 20, backgroundColor: '#c8a040', borderRadius: 2, borderWidth: 2, borderColor: '#7a3a00' }} />
      </View>
      <Text style={{ position: 'absolute', top: 20, left: W / 2 - 60, color: '#333', fontSize: 18 }}>■□□□□</Text>
      <Text style={{ position: 'absolute', top: 20, right: 20, fontSize: 18, color: '#333' }}>👻 {lives}</Text>

      {/* Left button */}
      <View style={{ position: 'absolute', left: leftBtnX, top: btnY, width: BTN_SIZE, height: BTN_SIZE, backgroundColor: 'rgba(139,69,19,0.85)', borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' }}>
        <Text style={{ fontSize: 26, color: '#fff' }}>◀</Text>
      </View>

      {/* Right button */}
      <View style={{ position: 'absolute', left: rightBtnX, top: btnY, width: BTN_SIZE, height: BTN_SIZE, backgroundColor: 'rgba(139,69,19,0.85)', borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' }}>
        <Text style={{ fontSize: 26, color: '#fff' }}>▶</Text>
      </View>

      {/* Jump button */}
      <View style={{ position: 'absolute', left: jumpBtnX, top: btnY, width: BTN_SIZE, height: BTN_SIZE, backgroundColor: 'rgba(139,69,19,0.85)', borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' }}>
        <Text style={{ fontSize: 26, color: '#fff' }}>▲</Text>
      </View>

    </View>
  );
}