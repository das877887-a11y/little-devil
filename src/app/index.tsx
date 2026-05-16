import { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableWithoutFeedback, StyleSheet, Dimensions } from 'react-native';

const { width: W, height: H } = Dimensions.get('window');
const DEVIL_SIZE = 40;
const GRAVITY = 1.2;
const JUMP_FORCE = -18;
const SCROLL_SPEED = 3;
const GROUND_Y = H - 80;

export default function Game() {
  const [tick, setTick] = useState(0);
  const [started, setStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);

  const velY = useRef(0);
  const devilY = useRef(GROUND_Y - DEVIL_SIZE);
  const onGround = useRef(true);
  const scoreCount = useRef(0);
  const alive = useRef(true);

  const platforms = useRef([
    { x: 200, y: H - 160, w: 140 },
    { x: 380, y: H - 240, w: 120 },
    { x: 560, y: H - 180, w: 130 },
    { x: 740, y: H - 220, w: 110 },
  ]);

  function handleTap() {
    if (!started) {
      setStarted(true);
      alive.current = true;
      return;
    }
    if (gameOver) {
      // restart
      velY.current = 0;
      devilY.current = GROUND_Y - DEVIL_SIZE;
      onGround.current = true;
      scoreCount.current = 0;
      alive.current = true;
      platforms.current = [
        { x: 200, y: H - 160, w: 140 },
        { x: 380, y: H - 240, w: 120 },
        { x: 560, y: H - 180, w: 130 },
        { x: 740, y: H - 220, w: 110 },
      ];
      setScore(0);
      setGameOver(false);
      return;
    }
    if (onGround.current) {
      velY.current = JUMP_FORCE;
      onGround.current = false;
    }
  }

  useEffect(() => {
    if (!started || gameOver) return;

    const interval = setInterval(() => {
      if (!alive.current) return;

      // apply gravity
      velY.current += GRAVITY;
      devilY.current += velY.current;

      // ground check
      if (devilY.current >= GROUND_Y - DEVIL_SIZE) {
        devilY.current = GROUND_Y - DEVIL_SIZE;
        velY.current = 0;
        onGround.current = true;
      } else {
        onGround.current = false;
      }

      // scroll platforms
      platforms.current = platforms.current.map(p => ({ ...p, x: p.x - SCROLL_SPEED }));

      // remove old, add new
      platforms.current = platforms.current.filter(p => p.x + p.w > -10);
      while (platforms.current.length < 5) {
        const last = platforms.current[platforms.current.length - 1];
        const newX = last ? last.x + 160 + Math.random() * 80 : W + 50;
        const newY = H - 140 - Math.random() * 160;
        const newW = 100 + Math.random() * 80;
        platforms.current.push({ x: newX, y: newY, w: newW });
      }

// platform collision
      for (const p of platforms.current) {
        const devilLeft = 100;
        const devilRight = 100 + DEVIL_SIZE;
        const devilBottom = devilY.current + DEVIL_SIZE;

        const overlapX = devilRight > p.x + 5 && devilLeft < p.x + p.w - 5;
        const falling = velY.current >= 0;
        const nearTop = devilBottom >= p.y && devilBottom <= p.y + 30;

        if (overlapX && falling && nearTop) {
          devilY.current = p.y - DEVIL_SIZE;
          velY.current = 0;
          onGround.current = true;
        }
      }

      // fall off screen
      if (devilY.current > H + 50) {
        alive.current = false;
        setGameOver(true);
        return;
      }

      // score
      scoreCount.current += 1;
      if (scoreCount.current % 8 === 0) {
        setScore(s => s + 1);
      }

      setTick(t => t + 1);
    }, 16);

    return () => clearInterval(interval);
  }, [started, gameOver]);

  return (
    <TouchableWithoutFeedback onPress={handleTap}>
      <View style={styles.container}>

        {/* Score */}
        {started && !gameOver && (
          <Text style={styles.score}>🔥 {score}</Text>
        )}

        {/* Devil */}
        <View style={[styles.devil, { top: devilY.current, left: 100 }]}>
          <Text style={styles.devilEmoji}>😈</Text>
        </View>

        {/* Ground */}
        <View style={[styles.ground, { top: GROUND_Y }]} />

        {/* Platforms */}
        {platforms.current.map((p, i) => (
          <View key={i} style={[styles.platform, { left: p.x, top: p.y, width: p.w }]}>
            <Text style={styles.platformText}>🔥🔥🔥</Text>
          </View>
        ))}

        {/* Start screen */}
        {!started && (
          <View style={styles.overlay}>
            <Text style={styles.title}>😈</Text>
            <Text style={styles.titleText}>LITTLE DEVIL</Text>
            <Text style={styles.subtitle}>Tap to Start!</Text>
          </View>
        )}

        {/* Game over */}
        {gameOver && (
          <View style={styles.overlay}>
            <Text style={styles.title}>💀</Text>
            <Text style={styles.titleText}>GAME OVER</Text>
            <Text style={styles.scoreText}>Score: {score}</Text>
            <Text style={styles.subtitle}>Tap to Restart!</Text>
          </View>
        )}

      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a0000',
  },
  score: {
    position: 'absolute',
    top: 40,
    right: 20,
    color: '#ff4400',
    fontSize: 26,
    fontWeight: 'bold',
    zIndex: 10,
  },
  devil: {
    position: 'absolute',
    width: DEVIL_SIZE,
    height: DEVIL_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  devilEmoji: {
    fontSize: 34,
  },
  ground: {
    position: 'absolute',
    width: W,
    height: 20,
    backgroundColor: '#8B0000',
    borderTopWidth: 3,
    borderTopColor: '#ff4400',
  },
  platform: {
    position: 'absolute',
    height: 20,
    backgroundColor: '#8B0000',
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#ff4400',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  platformText: {
    fontSize: 10,
  },
  overlay: {
    position: 'absolute',
    width: W,
    height: H,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.75)',
  },
  title: {
    fontSize: 60,
    marginBottom: 10,
  },
  titleText: {
    fontSize: 40,
    color: '#ff4400',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 22,
    color: '#ffaa00',
    marginTop: 10,
  },
  scoreText: {
    fontSize: 28,
    color: '#ffffff',
    marginBottom: 10,
  },
});