// src/App.js
import React from "react";
import { Stage, Layer, Line, Image as KImage, Circle, Group, Text } from "react-konva";
import courtImg from "./resources/img.png";
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

  // responsive stage
  const [stageSize, setStageSize] = React.useState({ width: window.innerWidth - 20, height: window.innerHeight - 100 });
  React.useEffect(() => {
    function resize() {
      setStageSize({ width: window.innerWidth - 20, height: window.innerHeight - 100 });
    }
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  const [useFullCourt, setUseFullCourt] = React.useState(false);
  const courtUrl = useFullCourt ? courtImgFull : courtImg2;
  const courtImage = useImage(courtUrl);

  const [mode, setMode] = React.useState("play");
  const [players, setPlayers] = React.useState([]);
  const [drawLines, setDrawLines] = React.useState([]);
  const drawingRef = React.useRef(false);

  const [courtHeightScale, setCourtHeightScale] = React.useState(1);

  // add/remove/update players
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

  const removePlayer = id => setPlayers(prev => prev.filter(p => p.id !== id));
  const updatePlayer = (id, patch) => setPlayers(prev => prev.map(p => (p.id === id ? { ...p, ...patch } : p)));
  const clearPlayerPaths = () => setPlayers(prev => prev.map(p => ({ ...p, path: [] })));

  const handlePlayerDragMove = (e, id) => {
    if (mode !== "play") return;
    const pos = e.target.position();
    setPlayers(prev =>
      prev.map(p =>
        p.id === id ? { ...p, x: pos.x, y: pos.y, path: [...p.path, { x: pos.x, y: pos.y }] } : p
      )
    );
  };

  // drawing handlers
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

  const undoDraw = () => setDrawLines(prev => prev.slice(0, -1));
  const clearAll = () => setDrawLines([]);

  // calculate court rectangle responsive
  const getCourtRect = () => {
    if (!courtImage) return { x: 0, y: 0, width: 0, height: 0 };
    const ratio = courtImage.width / courtImage.height;

    let width = stageSize.width * 0.9;
    let height = width / ratio;

    if (height > stageSize.height * 0.8) {
      height = stageSize.height * 0.8;
      width = height * ratio;
    }

    width *= courtHeightScale;
    height *= courtHeightScale;

    return {
      x: (stageSize.width - width) / 2,
      y: (stageSize.height - height) / 2,
      width,
      height,
    };
  };

  const courtRect = getCourtRect();
  const scaleFactor = courtRect.width / 900; // escala relativa para jugadores

  // save players to localStorage
  React.useEffect(() => {
    try {
      localStorage.setItem("sketch_players_v1", JSON.stringify(players));
    } catch (e) {}
  }, [players]);

  return (
    <div className="min-h-screen p-2 flex flex-col gap-4 bg-gray-50">
      {/* header buttons */}
      <div className="flex flex-wrap gap-2 items-center">
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

        <button onClick={addPlayer} className="px-3 py-1 bg-blue-500 text-white rounded">+ Añadir jugador</button>
        <button onClick={clearPlayerPaths} className="px-3 py-1 bg-yellow-400 rounded">Limpiar trayectorias</button>
        <button onClick={undoDraw} className="px-3 py-1 bg-gray-300 rounded">Deshacer</button>
        <button onClick={clearAll} className="px-3 py-1 bg-red-500 text-white rounded">Limpiar todo</button>

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

      <div className="flex gap-4 items-start flex-wrap">
        {/* menú lateral: oculto en pantallas pequeñas */}
        <div className="hidden md:flex flex-col w-64 bg-white p-4 rounded-xl shadow">
          <h2 className="text-lg font-semibold mb-2">Controles</h2>

          <div className="mb-3">
            <label className="text-sm">Imagen pista</label>
            <button
              className="px-3 py-1 rounded bg-purple-600 text-white w-full mt-1"
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
                        points={p.path.flatMap(pt => [pt.x * scaleFactor, pt.y * scaleFactor])}
                        stroke={p.color}
                        strokeWidth={4 * scaleFactor}
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
                        x={p.x * scaleFactor}
                        y={p.y * scaleFactor}
                        radius={20 * scaleFactor}
                        fill={p.color}
                        draggable
                        shadowBlur={5}
                        onDragMove={e => handlePlayerDragMove(e, p.id)}
                        onDragEnd={e => handlePlayerDragMove(e, p.id)}
                      />
                      <Text
                        x={p.x * scaleFactor - 6 * scaleFactor}
                        y={p.y * scaleFactor - 8 * scaleFactor}
                        text={p.name}
                        fontSize={14 * scaleFactor}
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
