// src/App.js
import React from "react";
import { Stage, Layer, Line, Image as KImage, Circle, Group, Text } from "react-konva";
import localCourt from "./resources/img.png";
import courtImg from "./resources/img.png";
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

const defaultPlayers = [
  { id: 1, name: "A", x: 120, y: 120, color: "#ef4444", path: [] },
  { id: 2, name: "B", x: 220, y: 180, color: "#3b82f6", path: [] },
  { id: 3, name: "C", x: 420, y: 240, color: "#10b981", path: [] },
  { id: 4, name: "D", x: 520, y: 300, color: "#4b10b9ff", path: [] },
  { id: 5, name: "E", x: 620, y: 360, color: "#b91048ff", path: [] },
];

export default function App() {
  const stageRef = React.useRef(null);

  const [stageSize, setStageSize] = React.useState({ width: 900, height: 600 });
  React.useEffect(() => {
    function resize() {
      const w = Math.min(window.innerWidth - 40, 1200);
      const h = Math.min(window.innerHeight - 160, 900);
      setStageSize({ width: Math.max(360, w), height: Math.max(320, h) });
    }
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  
 const [useFullCourt, setUseFullCourt] = React.useState(false);

 const courtUrl = useFullCourt ? courtImgFull : courtImg;
 const courtImage = useImage(courtUrl);

  const [mode, setMode] = React.useState("play");

  const [players, setPlayers] = React.useState(() => {
    try {
      const raw = localStorage.getItem("sketch_players_v1");
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return defaultPlayers;
  });

  const [drawLines, setDrawLines] = React.useState([]);
  const drawingRef = React.useRef(false);

  const [courtHeightScale, setCourtHeightScale] = React.useState(1);

  const addPlayer = () => {
    setPlayers(prev => {
      const id = prev.length ? Math.max(...prev.map(p => p.id)) + 1 : 1;
      const newPlayer = {
        id,
        name: String.fromCharCode(65 + (prev.length % 26)),
        x: Math.min(200 + prev.length * 40, stageSize.width - 60),
        y: Math.min(120 + prev.length * 30, stageSize.height - 60),
        color: `hsl(${(id * 73) % 360} 80% 55%)`,
        path: [],
      };
      return [...prev, newPlayer];
    });
  };

  const removePlayer = id => {
    setPlayers(prev => prev.filter(p => p.id !== id));
  };

  const updatePlayer = (id, patch) => {
    setPlayers(prev => prev.map(p => (p.id === id ? { ...p, ...patch } : p)));
  };

  const handlePlayerDragMove = (e, id) => {
    if (mode !== "play") return;
    const pos = e.target.position();
    setPlayers(prev =>
      prev.map(p =>
        p.id === id
          ? { ...p, x: pos.x, y: pos.y, path: [...p.path, { x: pos.x, y: pos.y }] }
          : p
      )
    );
  };

  const clearPlayerPaths = () => {
    setPlayers(prev => prev.map(p => ({ ...p, path: [] })));
  };

  const handlePointerDown = e => {
    if (mode !== "draw") return;
    drawingRef.current = true;
    const pos = stageRef.current.getPointerPosition();
    setDrawLines(prev => [...prev, { points: [pos.x, pos.y], stroke: "#000", strokeWidth: 3 }]);
  };

  const handlePointerMove = e => {
    if (!drawingRef.current || mode !== "draw") return;
    const pos = stageRef.current.getPointerPosition();
    setDrawLines(prev => {
      const last = prev[prev.length - 1];
      last.points = [...last.points, pos.x, pos.y];
      return [...prev.slice(0, -1), last];
    });
  };

  const handlePointerUp = () => {
    drawingRef.current = false;
  };

  const undoDraw = () => {
    setDrawLines(prev => prev.slice(0, -1));
  };

  const clearAll = () => {
    setDrawLines([]);
    setPlayers(defaultPlayers.map(p => ({ ...p, path: [] })));
  };

const getCourtRect = () => {
  if (!courtImage) return { x: 0, y: 0, width: 0, height: 0 };

  const ratio = courtImage.width / courtImage.height;

  // espacio disponible para pintar pista (descontamos margen)
  const availWidth = stageSize.width - 40;  // 20px margen izq + 20px margen dcha
  const availHeight = stageSize.height - 20; // margen sup/inf para evitar overflow

  // pista según ancho máximo
  let widthByWidth = availWidth;
  let heightByWidth = widthByWidth / ratio;

  // pista según alto máximo
  let heightByHeight = availHeight;
  let widthByHeight = heightByHeight * ratio;

  // elegimos la que mantiene la pista dentro
  let finalWidth, finalHeight;

  if (heightByWidth <= availHeight) {
    // el ancho encaja bien: usamos widthByWidth
    finalWidth = widthByWidth;
    finalHeight = heightByWidth;
  } else {
    // si la versión basada en ancho no encaja, usamos la de alto
    finalWidth = widthByHeight;
    finalHeight = heightByHeight;
  }

  // aplicamos tu slider
  finalHeight *= courtHeightScale;
  finalWidth = finalHeight * ratio;

  return {
    x: 20, // pegado a la izquierda
    y: (stageSize.height - finalHeight) / 2, // centrado vertical sin desbordar
    width: finalWidth,
    height: finalHeight,
  };
};




  const courtRect = getCourtRect();

  React.useEffect(() => {
    try {
      localStorage.setItem("sketch_players_v1", JSON.stringify(players));
    } catch (e) {}
  }, [players]);

  return (
    <div className="min-h-screen p-4 flex flex-col gap-4 bg-gray-50">
      <div className="flex gap-3 items-center">
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

        <div className="ml-4 flex gap-2">
          <button onClick={addPlayer} className="px-3 py-1 bg-blue-500 text-white rounded">+ Añadir jugador</button>
          <button onClick={clearPlayerPaths} className="px-3 py-1 bg-yellow-400 rounded">Limpiar trayectorias</button>
          <button onClick={undoDraw} className="px-3 py-1 bg-gray-300 rounded">Deshacer</button>
          <button onClick={clearAll} className="px-3 py-1 bg-red-500 text-white rounded">Limpiar todo</button>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <label className="text-sm">Altura pista</label>
          <input
            type="range"
            min="0.6"
            max="1.6"
            step="0.05"
            value={courtHeightScale}
            onChange={e => setCourtHeightScale(Number(e.target.value))}
          />
        </div>
      </div>

      <div className="flex gap-4 items-start">
        {/* menú lateral */}
        <div className="w-64 bg-white p-4 rounded-xl shadow">
          <h2 className="text-lg font-semibold mb-2">Controles</h2>

          <div className="mb-3">
            <label className="text-sm">Imagen pista</label>
              <button
                className="px-3 py-1 rounded bg-purple-600 text-white w-full"
                onClick={() => setUseFullCourt(v => !v)}
              >
                {useFullCourt ? "Ver pista recortada" : "Ver pista completa"}
                </button>
          </div>

          <div className="mb-3">
            <div className="text-sm font-medium mb-1">Jugadores</div>
            <div className="flex flex-col gap-2">
              {players.map(p => (
                <div key={p.id} className="flex items-center gap-2">
                  <div style={{ width: 18, height: 18, background: p.color, borderRadius: 6 }} />
                  <input
                    value={p.name}
                    onChange={e => updatePlayer(p.id, { name: e.target.value })}
                    className="border p-1 rounded flex-1"
                  />
                  <input
                    type="color"
                    value={p.color}
                    onChange={e => updatePlayer(p.id, { color: e.target.value })}
                  />
                  <button onClick={() => removePlayer(p.id)} className="px-2 py-1 bg-red-100 rounded">X</button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* stage */}
        <div className="flex-1 bg-white p-2 rounded-xl shadow">
          <div className="mb-2 text-xs text-gray-600">Arrastra jugadores. En modo dibujo, pinta sobre la pista.</div>

          <div style={{ width: stageSize.width, height: stageSize.height, borderRadius: 12, overflow: "hidden" }}>
            <Stage
              ref={stageRef}
              width={stageSize.width}
              height={stageSize.height}
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

                {/* trails de jugadores → SOLO si mode === "play" */}
                {mode === "play" &&
                  players.map(p =>
                    p.path.length > 1 ? (
                      <Line
                        key={`trail-${p.id}`}
                        points={p.path.flatMap(pt => [pt.x, pt.y])}
                        stroke={p.color}
                        strokeWidth={4}
                        tension={0.4}
                        lineCap="round"
                      />
                    ) : null
                  )}

                {/* dibujo libre */}
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

                {/* jugadores → SOLO si mode === "play" */}
                {mode === "play" &&
                  players.map(p => (
                    <Group key={p.id}>
                      <Circle
                        x={p.x}
                        y={p.y}
                        radius={20}
                        fill={p.color}
                        draggable
                        shadowBlur={5}
                        onDragMove={e => handlePlayerDragMove(e, p.id)}
                        onDragEnd={e => handlePlayerDragMove(e, p.id)}
                      />
                      <Text
                        x={p.x - 6}
                        y={p.y - 8}
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
      </div>
    </div>
  );
}
