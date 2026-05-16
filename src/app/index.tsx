import { useState, useEffect, useRef } from 'react';
import { View, Text, Dimensions } from 'react-native';

const getScreen = () => Dimensions.get('window');
const GRAVITY = 0.6;
const JUMP_FORCE = -14;
const MOVE_SPEED = 4;
const PLAYER_W = 20;
const PLAYER_H = 36;

function getLevel(W: number, H: number) {
  return {
    playerStart: { x: 80, y: H - 200 },
    door: { x: W - 80, y: H - 280, w: 30, h: 50 },
    platforms: [
      { x: 0, y: H - 160, w: W * 0.4, h: 20, trap: false },
      { x: W * 0.4 + 20, y: H - 160, w: W * 0.2, h: 20, trap: true },
      { x: W * 0.65, y: H - 220, w: W * 0.35, h: 20, trap: false },
      { x: 0, y: H - 80, w: W, h: 20, trap: false },
    ],
    spikes: [
      { x: W * 0.4 + 20, y: H - 96 },
      { x: W * 0.4 + 40, y: H - 96 },
      { x: W * 0.4 + 60, y: H - 96 },
      { x: W * 0.7, y: H - 96 },
      { x: W * 0.7 + 20, y: H - 96 },
    ],
  };
}

export default function Game() {
  const [screen, setScreen] = useState<'map' | 'game' | 'dead' | 'win'>('map');
  const [tick, setTick] = useState(0);
  const [lives, setLives] = useState(6);
  const [dims, setDims] = useState(getScreen());

  const px = useRef(0);
  const py = useRef(0);
  const vy = useRef(0);
  const onGround = useRef(false);
  const moving = useRef<'left' | 'right' | null>(null);
  const jumpHeld = useRef(false);
  const jumpCooldown = useRef(false);
  const trapDropped = useRef<{ [key: number]: number }>({});
  const alive = useRef(true);

  // Track each finger by identifier
  const touches = useRef<{ [id: string]: { x: number; y: number } }>({});

  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => setDims(window));
    return () => sub?.remove();
  }, []);

  function resetLevel() {
    const lev = getLevel(dims.width, dims.height);
    px.current = lev.playerStart.x;
    py.current = lev.playerStart.y;
    vy.current = 0;
    onGround.current = false;
    trapDropped.current = {};
    alive.current = true;
    jumpCooldown.current = false;
    jumpHeld.current = false;
    moving.current = null;
    touches.current = {};
  }

  function startLevel() {
    resetLevel();
    setScreen('game');
  }

  function die() {
    if (!alive.current) return;
    alive.current = false;
    setLives(l => {
      const newLives = l - 1;
      if (newLives <= 0) { setTimeout(() => setScreen('map'), 1000); return 6; }
      setScreen('dead');
      return newLives;
    });
  }

  function updateMovement(W: number) {
    // Check all active touches
    let goLeft = false;
    let goRight = false;
    let doJump = false;

    for (const id in touches.current) {
      const t = touches.current[id];
      if (t.x < W / 2) {
        // Left half of screen — movement zone
        // Divide into 3 zones: left third = go left, middle = stop, right third = go right
        const zone = (t.x / (W / 2));
        if (zone < 0.35) goLeft = true;
        else if (zone > 0.65) goRight = true;
      } else {
        // Right half — jump zone
        doJump = true;
      }
    }

    if (goLeft) moving.current = 'left';
    else if (goRight) moving.current = 'right';
    else moving.current = null;

    jumpHeld.current = doJump;
  }

  useEffect(() => {
    if (screen !== 'game') return;
    const interval = setInterval(() => {
      if (!alive.current) return;

      const W = dims.width;
      const H = dims.height;
      const lev = getLevel(W, H);

      // movement
      let vx = 0;
      if (moving.current === 'right') vx = MOVE_SPEED;
      else if (moving.current === 'left') vx = -MOVE_SPEED;

      // jump
      if (jumpHeld.current && onGround.current && !jumpCooldown.current) {
        vy.current = JUMP_FORCE;
        onGround.current = false;
        jumpCooldown.current = true;
        setTimeout(() => { jumpCooldown.current = false; }, 350);
      }

      vy.current += GRAVITY;
      px.current += vx;
      py.current += vy.current;
      onGround.current = false;

      const platforms = lev.platforms.map((p, i) => ({
        ...p,
        y: p.trap && trapDropped.current[i] !== undefined ? p.y + trapDropped.current[i] : p.y,
        index: i,
      }));

      for (const p of platforms) {
        const pb = py.current + PLAYER_H;
        const pr = px.current + PLAYER_W;
        const prevB = pb - vy.current;
        const overX = pr > p.x + 4 && px.current < p.x + p.w - 4;
        const falling = vy.current >= 0;
        const crossed = prevB <= p.y + 10 && pb >= p.y;
        if (overX && falling && crossed) {
          py.current = p.y - PLAYER_H;
          vy.current = 0;
          onGround.current = true;
          if (p.trap && trapDropped.current[p.index] === undefined) {
            trapDropped.current[p.index] = 0;
            const fall = setInterval(() => {
              trapDropped.current[p.index] += 5;
              if (trapDropped.current[p.index] > 400) clearInterval(fall);
            }, 16);
          }
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

  const W = dims.width;
  const H = dims.height;

  // Touch handlers for the whole screen
  function onTouchStart(e: any) {
    if (screen !== 'game') return;
    const t = e.nativeEvent.changedTouches;
    for (let i = 0; i < t.length; i++) {
      touches.current[t[i].identifier] = { x: t[i].pageX, y: t[i].pageY };
    }
    updateMovement(W);
  }

  function onTouchMove(e: any) {
    if (screen !== 'game') return;
    const t = e.nativeEvent.changedTouches;
    for (let i = 0; i < t.length; i++) {
      touches.current[t[i].identifier] = { x: t[i].pageX, y: t[i].pageY };
    }
    updateMovement(W);
  }

  function onTouchEnd(e: any) {
    if (screen !== 'game') return;
    const t = e.nativeEvent.changedTouches;
    for (let i = 0; i < t.length; i++) {
      delete touches.current[t[i].identifier];
    }
    updateMovement(W);
  }

  if (screen === 'map') return (
    <View style={{ width: W, height: H, backgroundColor: '#c8600a', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 42, color: '#8B0000', fontWeight: 'bold', marginBottom: 40 }}>😈 LEVEL DEVIL</Text>
      <View style={{ width: '90%', height: '50%', backgroundColor: '#e8a020', borderRadius: 10, padding: 20 }}>
        <View
          style={{ width: 60, height: 60, backgroundColor: '#8B4513', borderRadius: 30, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#fff' }}
          onTouchEnd={startLevel}
        >
          <Text style={{ color: '#fff', fontSize: 22, fontWeight: 'bold' }}>1</Text>
        </View>
      </View>
      <Text style={{ fontSize: 26, color: '#fff', marginTop: 20 }}>👻 {lives}</Text>
    </View>
  );

  if (screen === 'dead') return (
    <View style={{ width: W, height: H, backgroundColor: '#1a0000', justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 42, color: '#ff4400', fontWeight: 'bold', marginBottom: 20 }}>💀 YOU DIED</Text>
      <Text style={{ fontSize: 26, color: '#fff', marginBottom: 20 }}>👻 {lives} lives left</Text>
      <View style={{ backgroundColor: '#8B0000', padding: 16, borderRadius: 10 }} onTouchEnd={startLevel}>
        <Text style={{ color: '#fff', fontSize: 22, fontWeight: 'bold' }}>TRY AGAIN</Text>
      </View>
    </View>
  );

  if (screen === 'win') return (
    <View style={{ width: W, height: H, backgroundColor: '#003300', justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 42, color: '#00ff00', fontWeight: 'bold', marginBottom: 20 }}>🎉 LEVEL CLEAR!</Text>
      <View style={{ backgroundColor: '#8B0000', padding: 16, borderRadius: 10 }} onTouchEnd={() => setScreen('map')}>
        <Text style={{ color: '#fff', fontSize: 22, fontWeight: 'bold' }}>BACK TO MAP</Text>
      </View>
    </View>
  );

  const lev = getLevel(W, H);
  const platforms = lev.platforms.map((p, i) => ({
    ...p,
    y: p.trap && trapDropped.current[i] !== undefined ? p.y + trapDropped.current[i] : p.y,
  }));

  return (
    <View
      style={{ width: W, height: H, backgroundColor: '#e8a020', overflow: 'hidden' }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Platforms */}
      {platforms.map((p, i) => (
        <View key={i} style={{
          position: 'absolute', left: p.x, top: p.y, width: p.w, height: p.h,
          backgroundColor: p.trap ? '#cc2200' : '#8B4513', borderRadius: 4,
        }} />
      ))}

      {/* Spikes */}
      {lev.spikes.map((s, i) => (
        <Text key={i} style={{ position: 'absolute', left: s.x, top: s.y, fontSize: 16 }}>🔺</Text>
      ))}

      {/* Door */}
      <View style={{
        position: 'absolute', left: lev.door.x, top: lev.door.y,
        width: lev.door.w, height: lev.door.h,
        backgroundColor: '#555', borderRadius: 4, borderWidth: 2, borderColor: '#fff'
      }} />

      {/* Player */}
      <View style={{ position: 'absolute', left: px.current, top: py.current, width: PLAYER_W, height: PLAYER_H, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: 30 }}>🕴️</Text>
      </View>

      {/* HUD */}
      <Text style={{ position: 'absolute', top: 40, left: 20, fontSize: 24, color: '#fff', fontWeight: 'bold' }}>👻 {lives}</Text>

{/* Left button */}
      <View style={{ position: 'absolute', bottom: 20, left: 10, width: 65, height: 65, backgroundColor: 'rgba(139,69,19,0.9)', borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' }}>
        <Text style={{ fontSize: 26, color: '#fff' }}>◀</Text>
      </View>

      {/* Right button */}
      <View style={{ position: 'absolute', bottom: 20, left: 85, width: 65, height: 65, backgroundColor: 'rgba(139,69,19,0.9)', borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' }}>
        <Text style={{ fontSize: 26, color: '#fff' }}>▶</Text>
      </View>

      {/* Jump button */}
      <View style={{ position: 'absolute', bottom: 20, right: 10, width: 65, height: 65, backgroundColor: 'rgba(139,69,19,0.9)', borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' }}>
        <Text style={{ fontSize: 26, color: '#fff' }}>▲</Text>
      </View>

      {/* Visual zones */}
      <View style={{ position: 'absolute', bottom: 0, left: 0, width: W / 2, height: H, borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.05)' }} />
    </View>
  );
}