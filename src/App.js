// src/App.js
import React from "react";
import {
  Stage,
  Layer,
  Line,
  Image as KImage,
  Circle,
  Group,
  Text,
} from "react-konva";
import courtImg2 from "./resources/img.jpg";
import courtImgFull from "./resources/completa.png";

// ---- useImage local (espera onload) ----
function useImage(src) {
  const [img, setImg] = React.useState(null);
  React.useEffect(() => {
    if (!src) {
      setImg(null);
      return;
    }
    const image = new window.Image();
    image.crossOrigin = "anonymous";
    const handleLoad = () => setImg(image);
    const handleError = () => setImg(null);
    image.addEventListener("load", handleLoad);
    image.addEventListener("error", handleError);
    image.src = src;
    return () => {
      image.removeEventListener("load", handleLoad);
      image.removeEventListener("error", handleError);
    };
  }, [src]);
  return img;
}

export default function App() {
  const stageRef = React.useRef(null);

  const [isFullscreen, setIsFullscreen] = React.useState(false);
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
      } else {
        setStageSize({
          width: window.innerWidth,
          height: window.innerHeight,
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

  const [players, setPlayers] = React.useState(() => {
    try {
      const raw = localStorage.getItem("sketch_players_v1");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const linesRef = React.useRef([]);
  const currentLineIndex = React.useRef(-1);
  const isDrawing = React.useRef(false);
  const lastDraw = React.useRef(0);
  const drawThrottleMs = 8;

  const [renderTick, setRenderTick] = React.useState(0);
  const [drawColor, setDrawColor] = React.useState("#000");

  const getCourtRect = React.useCallback(() => {
    if (!courtImage) return { x: 0, y: 0, width: 0, height: 0 };
    const ratio = courtImage.width / courtImage.height;
    let width = isFullscreen ? window.innerWidth : stageSize.width;
    let height = isFullscreen ? window.innerHeight : stageSize.height;
    if (width / height > ratio) width = height * ratio;
    else height = width / ratio;
    const x = ((isFullscreen ? window.innerWidth : stageSize.width) - width) / 2;
    const y = ((isFullscreen ? window.innerHeight : stageSize.height) - height) / 2;
    return { x, y, width, height };
  }, [courtImage, isFullscreen, stageSize]);

  const courtRect = getCourtRect();

  const relToAbs = (relX, relY) => ({
    x: courtRect.x + relX * courtRect.width,
    y: courtRect.y + relY * courtRect.height,
  });
  const absToRel = (absX, absY) => ({
    x: (absX - courtRect.x) / courtRect.width,
    y: (absY - courtRect.y) / courtRect.height,
  });

  const addPlayer = () => {
    setPlayers((prev) => {
      const id = prev.length ? Math.max(...prev.map((p) => p.id)) + 1 : 1;
      return [
        ...prev,
        {
          id,
          name: String.fromCharCode(65 + (prev.length % 26)),
          x: 0.2 + prev.length * 0.04,
          y: 0.2 + prev.length * 0.03,
          color: `hsl(${(id * 73) % 360} 80% 55%)`,
          path: [],
        },
      ];
    });
  };
  const removePlayer = (id) => setPlayers((prev) => prev.filter((p) => p.id !== id));
  const updatePlayer = (id, patch) =>
    setPlayers((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  const clearDrawings = () => {
    linesRef.current = [];
    setRenderTick((t) => t + 1);
  };
  const clearTrails = () => {
    setPlayers((prev) => prev.map((p) => ({ ...p, path: [] })));
  };
  const undoDraw = () => {
    if (mode === "draw") {
      linesRef.current = linesRef.current.slice(0, -1);
      setRenderTick((t) => t + 1);
    }
  };
  const clearAll = () => {
    if (mode === "draw") clearDrawings();
    else clearTrails();
  };

  const handlePointerDown = () => {
    if (mode !== "draw") return;
    isDrawing.current = true;
    const pos = stageRef.current.getPointerPosition();
    linesRef.current.push({ points: [pos.x, pos.y], stroke: drawColor, strokeWidth: 3 });
    currentLineIndex.current = linesRef.current.length - 1;
    setRenderTick((t) => t + 1);
  };
  const handlePointerMove = () => {
    if (!isDrawing.current || mode !== "draw") return;
    const now = Date.now();
    if (now - lastDraw.current < drawThrottleMs) return;
    lastDraw.current = now;
    const pos = stageRef.current.getPointerPosition();
    if (!pos) return;
    const idx = currentLineIndex.current;
    if (idx < 0) return;
    linesRef.current[idx].points = linesRef.current[idx].points.concat([pos.x, pos.y]);
    setRenderTick((t) => t + 1);
  };
  const handlePointerUp = () => {
    if (mode === "draw") {
      isDrawing.current = false;
      currentLineIndex.current = -1;
    }
  };

  const handlePlayerDragMove = (e, id) => {
    if (mode !== "play") return;
    const pos = e.target.position();
    const rel = absToRel(pos.x, pos.y);
    setPlayers((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, x: rel.x, y: rel.y, path: [...p.path, { x: rel.x, y: rel.y }] } : p
      )
    );
  };

  React.useEffect(() => {
    try {
      localStorage.setItem("sketch_players_v1", JSON.stringify(players));
    } catch {}
  }, [players]);

  const enterFullscreen = () => {
    document.documentElement.requestFullscreen?.().catch(() => {});
    setIsFullscreen(true);
  };
  const exitFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    setIsFullscreen(false);
  };
  React.useEffect(() => {
    const handler = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const renderPlayerX = (p) => courtRect.x + p.x * courtRect.width;
  const renderPlayerY = (p) => courtRect.y + p.y * courtRect.height;

  return (
    <div style={{ minHeight: "100vh", padding: 8, boxSizing: "border-box", background: "#f8fafc" }}>
      {/* Header */}
      {!isFullscreen && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
          <button onClick={() => setMode("play")} className={`px-3 py-1 rounded ${mode === "play" ? "bg-blue-600 text-white" : "bg-gray-200"}`}>Modo Jugada</button>
          <button onClick={() => setMode("draw")} className={`px-3 py-1 rounded ${mode === "draw" ? "bg-green-600 text-white" : "bg-gray-200"}`}>Modo Dibujo Libre</button>

          <button onClick={addPlayer} className="px-3 py-1 bg-blue-500 text-white rounded">+ Añadir jugador</button>
          <button onClick={undoDraw} className="px-3 py-1 bg-gray-300 rounded">Deshacer</button>
          <button onClick={clearAll} className="px-3 py-1 bg-red-500 text-white rounded">Limpiar todo</button>

          {mode === "draw" && (
            <input type="color" value={drawColor} onChange={(e) => setDrawColor(e.target.value)} style={{ width: 36, height: 36, border: "none", padding: 0 }} />
          )}

          <button className="px-3 py-1 rounded bg-purple-600 text-white" onClick={() => setUseFullCourt((v) => !v)}>
            {useFullCourt ? "Ver pista recortada" : "Ver pista completa"}
          </button>
          <button onClick={enterFullscreen} style={{ marginLeft: 12 }} className="px-3 py-1 bg-black text-white rounded">Pantalla completa</button>
        </div>
      )}

      {/* Fullscreen controls */}
      {isFullscreen && (
        <div style={{ position: "fixed", top: 10, right: 10, zIndex: 9999, display: "flex", gap: 8, flexDirection: "row" }}>
          <button onClick={exitFullscreen} style={{ padding: "8px 12px", background: "#ef4444", color: "white", borderRadius: 8 }}>Salir pantalla completa</button>
          <button onClick={undoDraw} className="px-3 py-1 bg-gray-300 rounded">Deshacer</button>
          <button onClick={clearAll} className="px-3 py-1 bg-red-500 text-white rounded">Limpiar todo</button>
          {mode === "draw" && (
            <input type="color" value={drawColor} onChange={(e) => setDrawColor(e.target.value)} style={{ width: 36, height: 36, border: "none", padding: 0 }} />
          )}
        </div>
      )}

      {/* Lista de jugadores (si modo play) */}
      {mode === "play" && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
          {players.map((p) => (
            <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: 6, background: "#f1f5f9", borderRadius: 8 }}>
              <div style={{ width: 18, height: 18, background: p.color, borderRadius: 6 }} />
              <input
                value={p.name}
                onChange={(e) => updatePlayer(p.id, { name: e.target.value })}
                style={{ width: 40, padding: 4 }}
              />
              <button onClick={() => removePlayer(p.id)} style={{ padding: "4px 6px", background: "#fee2e2", borderRadius: 6 }}>X</button>
            </div>
          ))}
        </div>
      )}

      {/* Stage */}
      <div style={{ width: "100%", height: isFullscreen ? "100vh" : stageSize.height, borderRadius: isFullscreen ? 0 : 12, overflow: "hidden", background: "white" }}>
        <Stage
          ref={stageRef}
          width={isFullscreen ? window.innerWidth : stageSize.width}
          height={isFullscreen ? window.innerHeight : stageSize.height}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          style={{ touchAction: "none" }}
        >
          <Layer>
            {courtImage && (
              <KImage
                image={courtImage}
                x={courtRect.x}
                y={courtRect.y}
                width={courtRect.width}
                height={courtRect.height}
                listening={false}
                perfectDrawEnabled={false}
                shadowForStrokeEnabled={false}
                hitStrokeWidth={0}
              />
            )}
          </Layer>

          <Layer>
            {linesRef.current.map((ln, i) => (
              <Line
                key={i}
                points={ln.points}
                stroke={ln.stroke || "#000"}
                strokeWidth={ln.strokeWidth || 3}
                tension={0.3}
                lineCap="round"
                lineJoin="round"
              />
            ))}

            {mode === "play" &&
              players.map((p) =>
                p.path && p.path.length > 1 ? (
                  <Line
                    key={`trail-${p.id}`}
                    points={p.path.flatMap((pt) => [courtRect.x + pt.x * courtRect.width, courtRect.y + pt.y * courtRect.height])}
                    stroke={p.color}
                    strokeWidth={4}
                    tension={0.4}
                    lineCap="round"
                  />
                ) : null
              )}

            {mode === "play" &&
              players.map((p) => (
                <Group key={p.id}>
                  <Circle
                    x={renderPlayerX(p)}
                    y={renderPlayerY(p)}
                    radius={20}
                    fill={p.color}
                    draggable
                    shadowBlur={5}
                    onDragMove={(e) => handlePlayerDragMove(e, p.id)}
                    onDragEnd={(e) => handlePlayerDragMove(e, p.id)}
                  />
                  <Text
                    x={renderPlayerX(p) - 6}
                    y={renderPlayerY(p) - 8}
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
