import { useState, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  Physics,
  useBox,
  useCylinder,
  BoxProps,
  CylinderProps,
} from "@react-three/cannon";

// 定義遊戲狀態的型別
interface GameState {
  coins: number;
  wonCoins: number;
}

// 定義硬幣的型別
interface CoinData {
  id: number;
  position: [number, number, number];
}

// 遊戲控制面板組件
function GameControls({
  coins,
  wonCoins,
  onInsertCoin,
  onReset,
}: {
  coins: number;
  wonCoins: number;
  onInsertCoin: () => void;
  onReset: () => void;
}) {
  return (
    <div className="fixed top-0 left-0 w-full p-4 bg-gray-100 flex justify-between items-center">
      <div className="text-lg">
        硬幣數量: <span className="font-bold">{coins}</span> | 贏得硬幣:{" "}
        <span className="font-bold">{wonCoins}</span>
      </div>
      <div className="space-x-2">
        <button
          onClick={onInsertCoin}
          disabled={coins <= 0}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
        >
          投入硬幣
        </button>
        <button
          onClick={onReset}
          className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
        >
          重新開始
        </button>
      </div>
    </div>
  );
}

// 底座組件
function Base() {
  const [ref] = useBox(
    () =>
      ({
        args: [10, 1, 10],
        position: [0, -0.5, 0],
        mass: 0,
      } as BoxProps)
  );

  return (
    <mesh ref={ref} receiveShadow>
      <boxGeometry args={[10, 1, 10]} />
      <meshPhongMaterial color="#555555" />
    </mesh>
  );
}

// 平台組件
function Platform() {
  const [ref] = useBox(
    () =>
      ({
        args: [8, 0.5, 8],
        position: [0, 0.25, 0],
        mass: 0,
      } as BoxProps)
  );

  return (
    <mesh ref={ref} receiveShadow>
      <boxGeometry args={[8, 0.5, 8]} />
      <meshPhongMaterial color="#3377aa" />
    </mesh>
  );
}

// Ease-in-out function
function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

// 推板組件
function Pusher() {
  const [pusherRef, pusherApi] = useBox(
    () =>
      ({
        args: [6, 0.5, 1],
        position: [0, 0.5, 3.5],
        mass: 10,
      } as BoxProps)
  );

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const cycle = t % 2; // Cycle between 0 and 2
    const easedT = easeInOut(cycle < 1 ? cycle : 2 - cycle); // Apply easeInOut to the cycle
    const z = 3.5 + easedT * 1.5 * 2 - 1.5; // Map easedT to the desired Z range
    pusherApi.position.set(0, 0.5, z);
    const vz = (easedT - 0.5) * 3;
    pusherApi.velocity.set(0, 0, vz);
  });

  return (
    <mesh ref={pusherRef} castShadow>
      <boxGeometry args={[6, 0.5, 1]} />
      <meshPhongMaterial color="#aa3377" />
    </mesh>
  );
}

// 邊牆組件
function Wall({
  position,
  args,
}: {
  position: [number, number, number];
  args: [number, number, number];
}) {
  const [ref] = useBox(
    () =>
      ({
        args,
        position,
        mass: 0,
      } as BoxProps)
  );

  return (
    <mesh ref={ref} castShadow receiveShadow>
      <boxGeometry args={args} />
      <meshPhongMaterial color="#999999" />
    </mesh>
  );
}

interface Body {
  userData: {
    type: string;
    remove: boolean;
  };
}

interface DropZoneProps extends BoxProps {
  onCoinCollect: () => void;
}

// 掉落區域組件
function DropZone({ onCoinCollect, ...props }: DropZoneProps) {
  const [ref] = useBox(
    () =>
      ({
        args: [8, 0.5, 2],
        position: [0, -2, 5],
        mass: 0,
        isTrigger: true,
        onCollide: (e: { body: Body }) => {
          if (e.body.userData && e.body.userData.type === "coin") {
            onCoinCollect();
            setTimeout(() => {
              e.body.userData.remove = true;
            }, 100);
          }
        },
        ...props,
      } as BoxProps)
  );

  return (
    <mesh ref={ref} receiveShadow>
      <boxGeometry args={[8, 0.5, 2]} />
      <meshPhongMaterial color="#33aa33" />
    </mesh>
  );
}

// 硬幣組件
function Coin({
  position,
  onRemove,
}: {
  position: [number, number, number];
  onRemove: () => void;
}) {
  const [ref] = useCylinder(
    () =>
      ({
        args: [0.5, 0.5, 0.1, 32],
        position,
        mass: 1,
        userData: { type: "coin", remove: false },
        rotation: [Math.PI / 2, 0, 0],
      } as CylinderProps)
  );

  useFrame(() => {
    if (ref.current && ref.current.userData && ref.current.userData.remove) {
      onRemove();
    }
  });

  return (
    <mesh ref={ref} castShadow>
      <cylinderGeometry args={[0.5, 0.5, 0.1, 32]} />
      <meshPhongMaterial color="#FFD700" />
    </mesh>
  );
}

// 主遊戲場景
function CoinPusherScene() {
  const [gameState, setGameState] = useState<GameState>({
    coins: 10,
    wonCoins: 0,
  });

  const [coinsList, setCoinsList] = useState<CoinData[]>([]);
  const coinIdRef = useRef<number>(0);

  const handleInsertCoin = () => {
    if (gameState.coins > 0) {
      const id = coinIdRef.current++;
      const x = Math.random() * 4 - 2;
      const z = Math.random() * 2 - 4;

      setCoinsList((prev) => [...prev, { id, position: [x, 5, z] }]);

      setGameState((prev) => ({
        ...prev,
        coins: prev.coins - 1,
      }));
    } else {
      alert("沒有硬幣了！");
    }
  };

  const handleCoinCollect = () => {
    setGameState((prev) => ({
      ...prev,
      wonCoins: prev.wonCoins + 1,
    }));
  };

  const handleCoinRemove = (id: number) => {
    setCoinsList((prev) => prev.filter((coin) => coin.id !== id));
  };

  const handleReset = () => {
    setCoinsList([]);
    setGameState({
      coins: 10,
      wonCoins: 0,
    });
    coinIdRef.current = 0;
  };

  return (
    <div className="flex flex-col h-screen">
      <div className="z-10">
        <GameControls
          coins={gameState.coins}
          wonCoins={gameState.wonCoins}
          onInsertCoin={handleInsertCoin}
          onReset={handleReset}
        />
      </div>
      <Canvas
        shadows
        camera={{ position: [0, 5, 10], fov: 75 }}
        className="flex-1"
      >
        <color attach="background" args={["#87CEEB"]} />
        <ambientLight intensity={0.5} />
        <directionalLight
          position={[10, 20, 10]}
          intensity={0.8}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-left={-10}
          shadow-camera-right={10}
          shadow-camera-top={10}
          shadow-camera-bottom={-10}
        />
        <Physics
          gravity={[0, -9.82, 0]}
          defaultContactMaterial={{
            friction: 0.3,
            restitution: 0.3,
          }}
        >
          <Base />
          <Platform />
          <Pusher />
          <Wall position={[-4.5, 1, 0]} args={[1, 2, 8]} />
          <Wall position={[4.5, 1, 0]} args={[1, 2, 8]} />
          <Wall position={[0, 1, -4.5]} args={[10, 2, 1]} />
          <DropZone onCoinCollect={handleCoinCollect} />
          {coinsList.map((coin) => (
            <Coin
              key={coin.id}
              position={coin.position}
              onRemove={() => handleCoinRemove(coin.id)}
            />
          ))}
        </Physics>
      </Canvas>
    </div>
  );
}

export default function CoinPusherGame() {
  return <CoinPusherScene />;
}
