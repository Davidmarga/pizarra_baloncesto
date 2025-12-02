// src/App.js
import React from "react";
import { Stage, Layer, Line, Image as KImage, Circle, Group, Text } from "react-konva";
import courtImg2 from "./resources/img.jpg";
import courtImgFull from "./resources/completa.png";

// ---- useImage local (sin dependencias) ----
function useImage(src) {
  const [img, setImg] = React.useState(null);
  React.useEffect(() => {
    if (!src) {
      setImg(null);
      return;
    }
    const image = new window.Image();
    image.crossOrigin = "anonymous";
    image.onload = () => setImg(image);
    image.src = src;
  }, [src]);
  return img;
}

export default function App() {
  const stageRef = React.useRef(null);

  const [isFullscreen, setIsFullscreen] = React.useState(false);

  // responsive stage
  const [stageSize, setStageSize] = React.useState({
    width: window.innerWidth - 20,
    height: window.innerHeight - 100,
  });

  React.useEffect(() => {
    function resize() {
      if (!isFullscreen) {
        setStageSize({
          width: window.innerWidth - 20,
          height: window.innerHeight - 100,
        });
      }
    }
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [isFullscreen]);

  const [useFullCourt, setUseFullCourt] = React.useState(false);
  const courtUrl = useFullCourt ? courtImgFull : courtImg2;
  const courtImage = useImage(courtUrl);

  const [mode, setMode] = React.useState("play");
  const [players, setPlayers] = React.useState([]);
  const [drawLines, setDrawLines] = React.useState([]);
  const drawingRef = React.useRef(false);

  // enter fullscreen
  const enterFullscreen = () => {
    document.documentElement.requestFullscreen?.();
    setIsFullscreen(true);
  };

  // exit fullscreen
  const exitFullscreen = () => {
    document.exitFullscreen?.();
    setIsFullscreen(false);
  };

  React.useEffect(() => {
    const handler = () => {
      if (!document.fullscreenElement) {
        setIsFullscreen(false);
      }
    };
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  // add/remove/update players
  const addPlayer = () => {
    setPlayers((prev) => {
      const id = prev.length ? Math.max(...prev.map((p) => p.id)) + 1 : 1;
      const newPlayer = {
        id,
        name: String.fromCharCode(65 + (prev.length % 26)),
        x: 0.2 + prev.length * 0.04,
        y: 0.2 + prev.length * 0.03,
        color: `hsl(${(id * 73) % 360} 80% 55%)`,
        path: [],
      };
      return [...prev, newPlayer];
    });
  };

  const removePlayer = (id) => setPlayers((prev) => prev.filter((p) => p.id !== id));
  const updatePlayer = (id, patch) =>
    setPlayers((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  const clearPlayerPaths = () =>
    setPlayers((prev) => prev.map((p) => ({ ...p, path: [] })));

  // drawing handlers
  const handlePointerDown = (e) => {
    if (mode !== "draw") return;
    drawingRef.current = true;
    const pos = stageRef.current.getPointerPosition();
    setDrawLines((prev) => [...prev, { points: [pos.x, pos.y], stroke: "#000", strokeWidth: 3 }]);
  };

  const handlePointerMove = () => {
    if (!drawingRef.current || mode !== "draw") return;
    const pos = stageRef.current.getPointerPosition();
    setDrawLines((prev) => {
      const last = prev[prev.length - 1];
      last.points = [...last.points, pos.x, pos.y];
      return [...prev.slice(0, -1), last];
    });
  };

  const handlePointerUp = () => {
    drawingRef.current = false;
  };

  const undoDraw = () => setDrawLines((prev) => prev.slice(0, -1));
  const clearAll = () => setDrawLines([]);

  // calculate court rectangle responsive
  const getCourtRect = () => {
    if (!courtImage)
      return { x: 0, y: 0, width: 0, height: 0 };

    const ratio = courtImage.width / courtImage.height;

    let width = isFullscreen ? window.innerWidth : stageSize.width;
    let height = isFullscreen ? window.innerHeight : stageSize.height;

    if (width / height > ratio) {
      width = height * ratio;
    } else {
      height = width / ratio;
    }

    return {
      x: ( (isFullscreen ? window.innerWidth : stageSize.width) - width ) / 2,
      y: ( (isFullscreen ? window.innerHeight : stageSize.height) - height ) / 2,
      width,
      height,
    };
  };

  const courtRect = getCourtRect();

  // handle player drag
  const handlePlayerDragMove = (e, id) => {
    if (mode !== "play") return;
    const pos = e.target.position();
    const relX = (pos.x - courtRect.x) / courtRect.width;
    const relY = (pos.y - courtRect.y) / courtRect.height;

    setPlayers((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, x: relX, y: relY, path: [...p.path, { x: relX, y: relY }] } : p
      )
    );
  };

  // save players
  React.useEffect(() => {
    try {
      localStorage.setItem("sketch_players_v1", JSON.stringify(players));
    } catch {}
  }, [players]);

  return (
    <div className="min-h-screen p-2 flex flex-col gap-4 bg-gray-50">

      {/* HEADER — oculto en fullscreen */}
      {!isFullscreen && (
        <div className="flex flex-wrap gap-2 items-center transition-all">
          <button
            onClick={() => setMode("play")}
            className={`px-3 py-1 rounded ${mode === "play" ? "bg-blue-600 text-white" : "bg-gray-200"}`}
          >
            Modo Jugada
          </button>
          <button
            onClick={() => setMode("draw")}
            className={`px-3 py-1 rounded ${mode === "draw" ? "bg-green-600 text-white" : "bg-gray-200"}`}
          >
            Modo Dibujo Libre
          </button>

          <button onClick={addPlayer} className="px-3 py-1 bg-blue-500 text-white rounded">
            + Añadir jugador
          </button>
          <button onClick={clearPlayerPaths} className="px-3 py-1 bg-yellow-400 rounded">
            Limpiar trayectorias
          </button>
          <button onClick={undoDraw} className="px-3 py-1 bg-gray-300 rounded">
            Deshacer
          </button>
          <button onClick={clearAll} className="px-3 py-1 bg-red-500 text-white rounded">
            Limpiar todo
          </button>

          <button
            className="px-3 py-1 bg-purple-600 text-white rounded"
            onClick={() => setUseFullCourt((v) => !v)}
          >
            {useFullCourt ? "Ver pista recortada" : "Ver pista completa"}
          </button>

          {/* jugadores */}
          <div className="flex flex-wrap gap-2 items-center ml-4">
            {players.map((p) => (
              <div key={p.id} className="flex items-center gap-1 bg-gray-100 p-1 rounded">
                <div style={{ width: 18, height: 18, background: p.color, borderRadius: 6 }} />
                <input
                  value={p.name}
                  onChange={(e) => updatePlayer(p.id, { name: e.target.value })}
                  className="border p-1 rounded w-12 text-sm"
                />
                <button
                  onClick={() => removePlayer(p.id)}
                  className="px-2 py-1 bg-red-100 rounded text-sm"
                >
                  X
                </button>
              </div>
            ))}
          </div>

          {/* botón pantalla completa */}
          <button
            onClick={enterFullscreen}
            className="px-3 py-1 bg-black text-white rounded ml-4"
          >
            Pantalla completa
          </button>
        </div>
      )}

      {/* BOTÓN SALIR FULLSCREEN (siempre visible EN modo fullscreen) */}
      {isFullscreen && (
        <div
          style={{
            position: "fixed",
            top: 10,
            right: 10,
            zIndex: 50,
          }}
        >
          <button
            onClick={exitFullscreen}
            className="px-4 py-2 bg-red-600 text-white rounded shadow-lg"
          >
            Salir pantalla completa
          </button>
        </div>
      )}

      {/* Stage */}
      <div
        style={{
          width: "100%",
          height: isFullscreen ? "100vh" : stageSize.height,
          overflow: "hidden",
          background: "white",
          borderRadius: isFullscreen ? 0 : 12,
        }}
      >
        <Stage
          ref={stageRef}
          width={isFullscreen ? window.innerWidth : stageSize.width}
          height={isFullscreen ? window.innerHeight : stageSize.height}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          <Layer>
            {courtImage && (
              <KImage
                image={courtImage}
                x={courtRect.x}
                y={courtRect.y}
                width={courtRect.width}
                height={courtRect.height}
              />
            )}

            {mode === "play" &&
              players.map((p) =>
                p.path.length > 1 ? (
                  <Line
                    key={`trail-${p.id}`}
                    points={p.path.flatMap((pt) => [
                      courtRect.x + pt.x * courtRect.width,
                      courtRect.y + pt.y * courtRect.height,
                    ])}
                    stroke={p.color}
                    strokeWidth={4}
                    tension={0.4}
                    lineCap="round"
                  />
                ) : null
              )}

            {drawLines.map((l, i) => (
              <Line
                key={`draw-${i}`}
                points={l.points}
                stroke={l.stroke}
                strokeWidth={l.strokeWidth}
                tension={0.3}
                lineCap="round"
              />
            ))}

            {mode === "play" &&
              players.map((p) => (
                <Group key={p.id}>
                  <Circle
                    x={courtRect.x + p.x * courtRect.width}
                    y={courtRect.y + p.y * courtRect.height}
                    radius={20}
                    fill={p.color}
                    draggable
                    shadowBlur={5}
                    onDragMove={(e) => handlePlayerDragMove(e, p.id)}
                    onDragEnd={(e) => handlePlayerDragMove(e, p.id)}
                  />
                  <Text
                    x={courtRect.x + p.x * courtRect.width - 6}
                    y={courtRect.y + p.y * courtRect.height - 8}
                    text={p.name}
                    fontSize={14}
                    fill="#fff"
                  />
                </Group>
              ))}
          </Layer>
        </Stage>
      </div>
    </div>
  );
}
