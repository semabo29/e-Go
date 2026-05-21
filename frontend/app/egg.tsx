import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Dimensions,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

const { width, height } = Dimensions.get('window');
const LANE_WIDTH = (width*0.9) / 2;
const CAR_SIZE = 50;
const OBSTACLE_SIZE = 40;

interface Obstacle {
  id: number;
  lane: number;
  y: number;
}

interface VoltixGameProps {
  visible: boolean;
  onClose: () => void;
  theme: {
    accent: string;
    danger: string;
    title: string;
    surface: string;
    overlay: string;
  };
}

export default function egg({ visible, onClose, theme }: VoltixGameProps) {
  const [playerLane, setPlayerLane] = useState(0);
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);

  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);
  const obstacleIdRef = useRef(0);
  const gameStateRef = useRef({
    score: 0,
    lastObstacleScore: 0,
    lastFrameTime: 0,
    elapsedTime: 0,
  });

  const resetGame = () => {
    setObstacles([]);
    setScore(0);
    setGameOver(false);
    setGameStarted(true);
    obstacleIdRef.current = 0;
    gameStateRef.current = {
      score: 0,
      lastObstacleScore: 0,
      lastFrameTime: Date.now(),
      elapsedTime: 0,
    };
  };

  const startGameLoop = () => {
    if (gameLoopRef.current) {
      clearInterval(gameLoopRef.current);
    }

    gameStateRef.current.lastFrameTime = Date.now();

    gameLoopRef.current = setInterval(() => {
      const now = Date.now();
      const deltaTime = now - gameStateRef.current.lastFrameTime;
      gameStateRef.current.lastFrameTime = now;
      gameStateRef.current.elapsedTime += deltaTime;

      // Incrementar score basado en tiempo real (1 punto cada ~33ms = 30 FPS)
      const pointsToAdd = Math.floor(gameStateRef.current.elapsedTime / 33);
      if (pointsToAdd > 0) {
        gameStateRef.current.elapsedTime -= pointsToAdd * 33;
        gameStateRef.current.score += pointsToAdd;
        setScore(gameStateRef.current.score);
      }

      setObstacles(prev => {
        const baseSpeed = 8 + (gameStateRef.current.score / 150); // Aumenta velocidad gradualmente
        const moved = prev.map(obs => ({ ...obs, y: obs.y + baseSpeed }));
        const filtered = moved.filter(obs => obs.y < height + OBSTACLE_SIZE);

        // Añadir obstáculo cada 25 puntos
        if (gameStateRef.current.score - gameStateRef.current.lastObstacleScore >= 20 && Math.random() < 0.05) {
          gameStateRef.current.lastObstacleScore = gameStateRef.current.score;
          const newLane = Math.random() < 0.5 ? 0 : 1;
          filtered.push({
            id: obstacleIdRef.current++,
            lane: newLane,
            y: -150, // Aparecen detrás del header
          });
        }

        return filtered;
      });
    }, 16); // ~60 FPS
  };

  useEffect(() => {
    if (visible && gameStarted && !gameOver) {
      startGameLoop();
    } else {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
      }
    }

    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
      }
    };
  }, [visible, gameStarted, gameOver]);

  // Collision detection
  useEffect(() => {
    if (!gameStarted || gameOver) return;

    const playerY = (0.8 * height) - 100 - CAR_SIZE;

    for (const obs of obstacles) {
      if (
        obs.y + OBSTACLE_SIZE > playerY &&
        obs.y < playerY + CAR_SIZE &&
        obs.lane === playerLane
      ) {
        setGameOver(true);
        if (gameLoopRef.current) {
          clearInterval(gameLoopRef.current);
        }
        break;
      }
    }
  }, [obstacles, playerLane, gameStarted, gameOver]);

  const handlePress = () => {
    if (gameOver) {
      resetGame();
    } else if (!gameStarted) {
      resetGame();
    } else {
      setPlayerLane(prev => prev === 0 ? 1 : 0);
    }
  };

  const handleClose = () => {
    if (gameLoopRef.current) {
      clearInterval(gameLoopRef.current);
    }
    setGameStarted(false);
    setGameOver(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.modalBackdrop}>
        <View style={[styles.gameContainer, { backgroundColor: theme.surface }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.score, { color: theme.title }]}>Score: {score}</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color={theme.title} />
            </TouchableOpacity>
          </View>

          {/* Game Area */}
          <TouchableOpacity 
            style={styles.gameArea} 
            onPress={handlePress}
            activeOpacity={1}
          >
            {/* Lane dividers */}
            <View style={[styles.laneDivider, { left: LANE_WIDTH }]} />

            {/* Player Car */}
            <View
              style={[
                styles.car,
                {
                  left: playerLane === 0 ? LANE_WIDTH / 2 - CAR_SIZE / 2 : LANE_WIDTH + LANE_WIDTH / 2 - CAR_SIZE / 2,
                  bottom: 15,
                  backgroundColor: theme.accent,
                },
              ]}
            >
              <MaterialIcons name="directions-car" size={30} color="#fff" />
            </View>

            {/* Obstacles */}
            {obstacles.map(obs => (
              <View
                key={obs.id}
                style={[
                  styles.obstacle,
                  {
                    left: obs.lane === 0 ? LANE_WIDTH / 2 - OBSTACLE_SIZE / 2 : LANE_WIDTH + LANE_WIDTH / 2 - OBSTACLE_SIZE / 2,
                    top: obs.y,
                    backgroundColor: theme.danger,
                  },
                ]}
              >
                <MaterialIcons name="warning" size={24} color="#fff" />
              </View>
            ))}

            {/* Start Screen */}
            {!gameStarted && (
              <View style={styles.overlay}>
                <Text style={[styles.overlayTitle, { color: theme.title }]}>VOLTIX</Text>
                <Text style={[styles.overlayText, { color: theme.title }]}>
                  Tap to switch lanes
                </Text>
                <Text style={[styles.overlayText, { color: theme.title }]}>
                  Avoid the obstacles!
                </Text>
                <TouchableOpacity style={[styles.startButton, { backgroundColor: theme.accent }]} onPress={handlePress}>
                  <Text style={styles.startButtonText}>START</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Game Over Screen */}
            {gameOver && (
              <View style={styles.overlay}>
                <Text style={[styles.overlayTitle, { color: theme.danger }]}>GAME OVER</Text>
                <Text style={[styles.overlayText, { color: theme.title }]}>
                  Score: {score}
                </Text>
                <TouchableOpacity style={[styles.startButton, { backgroundColor: theme.accent }]} onPress={handlePress}>
                  <Text style={styles.startButtonText}>PLAY AGAIN</Text>
                </TouchableOpacity>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gameContainer: {
    width: width * 0.9,
    height: height * 0.8,
    borderRadius: 20,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  score: {
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    padding: 8,
  },
  gameArea: {
    flex: 1,
    position: 'relative',
  },
  laneDivider: {
    position: 'absolute',
    width: 2,
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  car: {
    position: 'absolute',
    width: CAR_SIZE,
    height: CAR_SIZE,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  obstacle: {
    position: 'absolute',
    width: OBSTACLE_SIZE,
    height: OBSTACLE_SIZE,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  overlayTitle: {
    fontSize: 32,
    fontWeight: '700',
  },
  overlayText: {
    fontSize: 16,
    fontWeight: '500',
  },
  startButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});
