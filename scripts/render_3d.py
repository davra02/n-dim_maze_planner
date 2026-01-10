#!/usr/bin/env python3
import argparse
import json
import os
import re
from pathlib import Path
from typing import Optional

CELL_OBJ_RE = re.compile(r"\bc\w+\b")
CELL_3D_SPLIT_RE = re.compile(r"^c(\d+)[,_-](\d+)[,_-](\d+)$")
CELL_3D_FIXED_RE = re.compile(r"^c(\d)(\d)(\d)$")
PLAN_RE = re.compile(r"\(([^)]+)\)")


def parse_adjacency(problem_path: Path):
  raw = problem_path.read_text(encoding="utf-8", errors="ignore")
  text = "\n".join(line.split(";", 1)[0] for line in raw.splitlines())
  # (adjacent c0_0_0 c0_0_1)
  return {
    (m.group(1), m.group(2))
    for m in re.finditer(r"\(adjacent\s+(c\w+)\s+(c\w+)\)", text)
  }


def parse_connects(problem_path: Path):
  raw = problem_path.read_text(encoding="utf-8", errors="ignore")
  text = "\n".join(line.split(";", 1)[0] for line in raw.splitlines())
  return {
    (m.group(1), m.group(2), m.group(3))
    for m in re.finditer(r"\(connects\s+(\w+)\s+(c\w+)\s+(c\w+)\)", text)
  }


def parse_stairs(problem_path: Path):
  raw = problem_path.read_text(encoding="utf-8", errors="ignore")
  text = "\n".join(line.split(";", 1)[0] for line in raw.splitlines())
  return {
    (m.group(1), m.group(2))
    for m in re.finditer(r"\(stairs\s+(c\w+)\s+(c\w+)\)", text)
  }


def parse_elevator_connects(problem_path: Path):
  raw = problem_path.read_text(encoding="utf-8", errors="ignore")
  text = "\n".join(line.split(";", 1)[0] for line in raw.splitlines())
  return {
    (m.group(1), m.group(2), m.group(3))
    for m in re.finditer(r"\(elevator-connects\s+(\w+)\s+(c\w+)\s+(c\w+)\)", text)
  }


def filter_traversable_cells(cells: dict, edges: set, extra_cells: set):
  traversable = set(extra_cells)
  for a, b in edges:
    traversable.add(a)
    traversable.add(b)
  return {name: pos for name, pos in cells.items() if name in traversable}


def parse_cell_name(name: str):
    match = CELL_3D_SPLIT_RE.match(name)
    if match:
        z, r, c = match.groups()
        return int(z), int(r), int(c)
    match = CELL_3D_FIXED_RE.match(name)
    if match:
        z, r, c = match.groups()
        return int(z), int(r), int(c)
    return None


def parse_problem(problem_path: Path):
    raw = problem_path.read_text(encoding="utf-8", errors="ignore")
    text = "\n".join(line.split(";", 1)[0] for line in raw.splitlines())

    obj_block = ""
    obj_start = text.find("(:objects")
    init_start = text.find("(:init")
    if obj_start != -1 and init_start != -1 and init_start > obj_start:
        obj_block = text[obj_start:init_start]

    cells = {}
    for name in CELL_OBJ_RE.findall(obj_block):
        parsed = parse_cell_name(name)
        if parsed:
            z, r, c = parsed
            cells[name] = (c, r, z)

    # Prefer multi-agent format: (agent-at a1 c...)
    agent = "a1"
    if not re.search(r"\ba1\b", obj_block):
        # Fall back to first declared agent name if any
        m_agent = re.search(r"\b(\w+)\s*-\s*agent\b", obj_block)
        if m_agent:
            agent = m_agent.group(1)

    start = None
    goal = None
    init_at = re.search(rf"\(agent-at\s+{re.escape(agent)}\s+(c\w+)\)", text)
    if init_at:
        start = init_at.group(1)
    goal_at = re.search(rf"\(agent-at\s+{re.escape(agent)}\s+(c\w+)\)", text[text.find("(:goal"):])
    if goal_at:
        goal = goal_at.group(1)

    # Back-compat (old single-agent): (at c...)
    if start is None:
        init_at_old = re.search(r"\(at\s+(c\w+)\)", text)
        if init_at_old:
            start = init_at_old.group(1)
    if goal is None:
        goal_at_old = re.search(r"\(at\s+(c\w+)\)", text[text.find("(:goal"):])
        if goal_at_old:
            goal = goal_at_old.group(1)

    buttons = {}
    for match in re.finditer(r"\(button-at\s+(\w+)\s+(c\w+)\)", text):
        buttons[match.group(1)] = match.group(2)

    return cells, start, goal, buttons


def parse_agents(problem_path: Path):
    raw = problem_path.read_text(encoding="utf-8", errors="ignore")
    text = "\n".join(line.split(";", 1)[0] for line in raw.splitlines())
    obj_start = text.find("(:objects")
    init_start = text.find("(:init")
    obj_block = text[obj_start:init_start] if obj_start != -1 and init_start != -1 and init_start > obj_start else ""

    agents = re.findall(r"\b(\w+)\s*-\s*agent\b", obj_block)

    # Preserve order and uniqueness
    seen = set()
    unique = []
    for agent in agents:
        if agent not in seen:
            unique.append(agent)
            seen.add(agent)
    return unique


def parse_problem_multi(problem_path: Path, agents: list):
    raw = problem_path.read_text(encoding="utf-8", errors="ignore")
    text = "\n".join(line.split(";", 1)[0] for line in raw.splitlines())

    obj_block = ""
    obj_start = text.find("(:objects")
    init_start = text.find("(:init")
    if obj_start != -1 and init_start != -1 and init_start > obj_start:
        obj_block = text[obj_start:init_start]

    cells = {}
    for name in CELL_OBJ_RE.findall(obj_block):
        parsed = parse_cell_name(name)
        if parsed:
            z, r, c = parsed
            cells[name] = (c, r, z)

    buttons = {}
    for match in re.finditer(r"\(button-at\s+(\w+)\s+(c\w+)\)", text):
        buttons[match.group(1)] = match.group(2)

    starts = {}
    goals = {}
    goal_section = text[text.find("(:goal"):] if "(:goal" in text else text

    for agent in agents:
        init_at = re.search(rf"\(agent-at\s+{re.escape(agent)}\s+(c\w+)\)", text)
        if init_at:
            starts[agent] = init_at.group(1)
        goal_at = re.search(rf"\(agent-at\s+{re.escape(agent)}\s+(c\w+)\)", goal_section)
        if goal_at:
            goals[agent] = goal_at.group(1)

    return cells, starts, goals, buttons


def parse_plan(plan_path: Path, agent: Optional[str] = "a1"):
    if plan_path is None or not plan_path.exists():
        return []

    text = plan_path.read_text(encoding="utf-8", errors="ignore")
    cells = []
    for line in text.splitlines():
        m = PLAN_RE.search(line)
        if not m:
            continue
        parts = m.group(1).split()
        if not parts:
            continue

        action = parts[0]

        if action in {"move", "move-through-door", "take-stairs", "take-elevator"}:
            # Multi-agent: action <agent> <from> <to> ...
            is_multi_agent = len(parts) >= 4 and not parts[1].startswith("c")
            if is_multi_agent:
                if agent is None or parts[1] == agent:
                    cells.append(parts[2])
                    cells.append(parts[3])
                # Important: do NOT fall back to the single-agent parse for other agents.
                continue

            # Back-compat (old single-agent): action <from> <to> ...
            if len(parts) >= 3:
                cells.append(parts[1])
                cells.append(parts[2])

        elif action in {"press-button", "activate-elevator"}:
            # Keep the path continuous by including the location cell.
            # Multi-agent signatures:
            #   press-button <agent> <button> <door> <cell>
            #   activate-elevator <agent> <button> <elevator> <cell>
            if len(parts) >= 5 and not parts[1].startswith("c"):
                if agent is None or parts[1] == agent:
                    cells.append(parts[4])
                continue

            # Back-compat: press-button <button> <door> <cell>
            if len(parts) >= 4:
                cells.append(parts[3])

    if not cells:
        return cells
    compact = [cells[0]]
    for name in cells[1:]:
        if name != compact[-1]:
            compact.append(name)
    return compact


def make_html(data, output_path: Path, use_local: bool):
    if use_local:
        vendor_dir = Path(__file__).resolve().parent / "vendor"
        three_file = vendor_dir / "three.module.js"
        orbit_file = vendor_dir / "OrbitControls.js"
        three_path = Path(os.path.relpath(three_file, output_path.parent)).as_posix()
        orbit_path = Path(os.path.relpath(orbit_file, output_path.parent)).as_posix()
    else:
        three_path = "https://unpkg.com/three@0.161.0/build/three.module.js"
        orbit_path = "https://unpkg.com/three@0.161.0/examples/jsm/controls/OrbitControls.js"

    payload = json.dumps(data)
    import_map = ""
    if use_local:
        import_map = f"""
<script type=\\"importmap\\">
{{
  \\"imports\\": {{
    \\"three\\": \\"{three_path}\\"
  }}
}}
</script>
"""

    steps_count = len(data.get("path", [])) if isinstance(data, dict) else 0
    if isinstance(data, dict) and "paths" in data and isinstance(data["paths"], list):
      steps_count = sum(len(p.get("path", [])) for p in data["paths"] if isinstance(p, dict))

    html = f"""<!doctype html>
<html>
<head>
  <meta charset=\"utf-8\" />
  <title>Maze 3D</title>
  <style>
    html, body {{ margin: 0; height: 100%; overflow: hidden; background: #0b1020; }}
    #info {{ position: absolute; top: 10px; left: 10px; color: #cbd5f5; font-family: monospace; z-index: 1; }}
    #legend {{ position: absolute; top: 10px; right: 10px; color: #cbd5f5; font-family: monospace; z-index: 1; background: rgba(10,16,32,0.8); padding: 10px; border: 1px solid #2a355a; max-width: 320px; }}
    #legend .row {{ display: flex; align-items: center; gap: 8px; margin: 4px 0; }}
    #legend .swatch {{ width: 14px; height: 14px; border: 1px solid #1b2440; }}
    #legend ol {{ margin: 6px 0 0 18px; max-height: 45vh; overflow: auto; padding-right: 8px; }}
    #legend li {{ margin: 2px 0; }}
  </style>
  {import_map}
</head>
<body>
<div id=\"info\">Drag to rotate, scroll to zoom. Cells: {len(data['cells'])}, Steps: {steps_count}</div>
<div id=\"legend\">
  <div><strong>Legend</strong></div>
  <div class=\"row\"><span class=\"swatch\" style=\"background:#2a6fd2;opacity:0.4\"></span>Cell</div>
  <div class=\"row\"><span class=\"swatch\" style=\"background:#ff3030\"></span>Path</div>
  <div class=\"row\"><span class=\"swatch\" style=\"background:#2ecc71\"></span>Start</div>
  <div class=\"row\"><span class=\"swatch\" style=\"background:#f1c40f\"></span>Goal</div>
  <div class=\"row\"><span class=\"swatch\" style=\"background:#ff7f0e\"></span>Button</div>
  <div style=\"margin-top:6px\"><strong>Path order</strong></div>
  <ol id=\"pathList\"></ol>
</div>
<script type=\"module\">
import * as THREE from '{three_path}';
import {{ OrbitControls }} from '{orbit_path}';

const data = {payload};
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b1020);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({{ antialias: true }});
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

const ambient = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambient);
const dir = new THREE.DirectionalLight(0xffffff, 0.6);
dir.position.set(10, 10, 10);
scene.add(dir);

const cubeGeom = new THREE.BoxGeometry(0.9, 0.9, 0.9);
const pathGeom = new THREE.BoxGeometry(0.6, 0.6, 0.6);

function addCube(pos, color, opacity, geom = cubeGeom) {{
  const mat = new THREE.MeshPhongMaterial({{ color, transparent: true, opacity }});
  const mesh = new THREE.Mesh(geom, mat);
  mesh.position.set(pos[0], pos[1], pos[2]);
  scene.add(mesh);
}}

const doorCells = new Set(data.doorCells || []);

for (const cell of data.cells) {{
  const isDoor = doorCells.has(cell.name);
  addCube(cell.pos, isDoor ? 0xff4d4d : 0x2a6fd2, 0.2);
}}

function lerp(a, b, t) {{
  return a + (b - a) * t;
}}

function lerpColor(c1, c2, t) {{
  const r1 = (c1 >> 16) & 255;
  const g1 = (c1 >> 8) & 255;
  const b1 = c1 & 255;
  const r2 = (c2 >> 16) & 255;
  const g2 = (c2 >> 8) & 255;
  const b2 = c2 & 255;
  const r = Math.round(lerp(r1, r2, t));
  const g = Math.round(lerp(g1, g2, t));
  const b = Math.round(lerp(b1, b2, t));
  return (r << 16) | (g << 8) | b;
}}

const pathPoints = [];
const pathList = document.getElementById('pathList');
for (let i = 0; i < data.path.length; i++) {{
  const cell = data.path[i];
  const t = data.path.length > 1 ? i / (data.path.length - 1) : 0;
  const color = lerpColor(0xff3030, 0xffaaaa, t);
  addCube(cell.pos, color, 0.9, pathGeom);
  pathPoints.push(new THREE.Vector3(cell.pos[0], cell.pos[1], cell.pos[2]));
  const li = document.createElement('li');
  li.textContent = `${{i + 1}}: ${{cell.name}}`;
  pathList.appendChild(li);
}}

function makeLabel(text) {{
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const fontSize = 32;
  ctx.font = `${{fontSize}}px monospace`;
  const width = ctx.measureText(text).width + 24;
  canvas.width = width;
  canvas.height = fontSize + 24;
  ctx.font = `${{fontSize}}px monospace`;
  ctx.fillStyle = 'rgba(10,16,32,0.8)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, 12, fontSize + 4);
  const texture = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({{ map: texture, transparent: true, opacity: 0.85 }});
  const sprite = new THREE.Sprite(mat);
  const scale = 0.006;
  sprite.scale.set(canvas.width * scale, canvas.height * scale, 1);
  return sprite;
}}

for (let i = 0; i < data.path.length; i++) {{
  const cell = data.path[i];
  const label = makeLabel(`${{i + 1}}:${{cell.name}}`);
  label.position.set(cell.pos[0], cell.pos[1] + 0.65, cell.pos[2]);
  scene.add(label);
}}

if (pathPoints.length >= 2) {{
  const lineGeom = new THREE.BufferGeometry().setFromPoints(pathPoints);
  const lineMat = new THREE.LineBasicMaterial({{ color: 0xff3030 }});
  const line = new THREE.Line(lineGeom, lineMat);
  scene.add(line);
}}

if (data.start) {{
  addCube(data.start.pos, 0x2ecc71, 0.9);
}}

if (data.goal) {{
  addCube(data.goal.pos, 0xf1c40f, 0.9);
}}

for (const cell of data.buttons) {{
  addCube(cell.pos, 0xff7f0e, 0.5);
}}

const bbox = new THREE.Box3();
for (const cell of data.cells) {{
  const v = new THREE.Vector3(cell.pos[0], cell.pos[1], cell.pos[2]);
  bbox.expandByPoint(v);
}}
const size = new THREE.Vector3();
bbox.getSize(size);
const center = new THREE.Vector3();
bbox.getCenter(center);

camera.position.set(center.x + size.x * 1.5 + 1, center.y + size.y * 1.5 + 1, center.z + size.z * 1.5 + 1);
controls.target.copy(center);

function onResize() {{
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}}
window.addEventListener('resize', onResize);

function animate() {{
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}}
animate();
</script>
</body>
</html>
"""
    output_path.write_text(html, encoding="utf-8")

def make_html_babylon(data, output_path: Path):
    vendor_dir = Path(__file__).resolve().parent / "vendor"
    babylon_file = vendor_dir / "babylon.js"
    babylon_path = Path(os.path.relpath(babylon_file, output_path.parent)).as_posix()
    payload = json.dumps(data)
    steps_count = len(data.get("path", [])) if isinstance(data, dict) else 0
    if isinstance(data, dict) and "paths" in data and isinstance(data["paths"], list):
      steps_count = sum(len(p.get("path", [])) for p in data["paths"] if isinstance(p, dict))

    html = f"""<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Maze 3D (Babylon)</title>
  <style>
    html, body {{ margin: 0; height: 100%; overflow: hidden; background: #0b1020; }}
    #renderCanvas {{ width: 100%; height: 100%; touch-action: none; display: block; }}
    #info {{ position: absolute; top: 10px; left: 10px; color: #cbd5f5; font-family: monospace; z-index: 1; }}
    #legend {{ position: absolute; top: 10px; right: 10px; color: #cbd5f5; font-family: monospace; z-index: 1; background: rgba(10,16,32,0.8); padding: 10px; border: 1px solid #2a355a; max-width: 320px; }}
    #legend .row {{ display: flex; align-items: center; gap: 8px; margin: 4px 0; }}
    #legend .swatch {{ width: 14px; height: 14px; border: 1px solid #1b2440; }}
    #legend ol {{ margin: 6px 0 0 18px; max-height: 45vh; overflow: auto; padding-right: 8px; }}
    #legend li {{ margin: 2px 0; }}
  </style>
</head>
<body>
<div id="info">Drag to rotate, scroll to zoom. Cells: {len(data['cells'])}, Steps: {steps_count}</div>
<div id="legend">
  <div><strong>Legend</strong></div>
  <div class="row"><span class="swatch" style="background:#2a6fd2;opacity:0.4"></span>Cell</div>
  <div class="row"><span class="swatch" style="background:#ff3030"></span>Path</div>
  <div class="row"><span class="swatch" style="background:#2ecc71"></span>Start</div>
  <div class="row"><span class="swatch" style="background:#f1c40f"></span>Goal</div>
  <div class="row"><span class="swatch" style="background:#ff7f0e"></span>Button</div>
  <div style="margin-top:6px"><strong>Path order</strong></div>
  <ol id="pathList"></ol>
</div>
<canvas id="renderCanvas"></canvas>
<script src="{babylon_path}"></script>
<script>
const data = {payload};

const canvas = document.getElementById('renderCanvas');
const engine = new BABYLON.Engine(canvas, true);
const scene = new BABYLON.Scene(engine);
scene.clearColor = new BABYLON.Color4(0.04, 0.06, 0.12, 1.0);

const camera = new BABYLON.ArcRotateCamera('cam', Math.PI / 4, Math.PI / 3, 12, new BABYLON.Vector3(0, 0, 0), scene);
camera.attachControl(canvas, true);

const light = new BABYLON.HemisphericLight('light', new BABYLON.Vector3(0, 1, 0), scene);
light.intensity = 0.8;

function makeMat(color, alpha) {{
  const mat = new BABYLON.StandardMaterial('mat', scene);
  mat.diffuseColor = BABYLON.Color3.FromHexString(color);
  mat.alpha = alpha;
  return mat;
}}

function addBox(pos, size, color, alpha) {{
  const box = BABYLON.MeshBuilder.CreateBox('box', {{ size }}, scene);
  box.position = new BABYLON.Vector3(pos[0], pos[1], pos[2]);
  box.material = makeMat(color, alpha);
  return box;
}}

const doorCells = new Set(data.doorCells || []);

function addSphere(pos, diameter, color, alpha) {{
  const sphere = BABYLON.MeshBuilder.CreateSphere('sphere', {{ diameter }}, scene);
  sphere.position = new BABYLON.Vector3(pos[0], pos[1], pos[2]);
  sphere.material = makeMat(color, alpha);
  return sphere;
}}

function lerp(a, b, t) {{ return a + (b - a) * t; }}
function lerpColor(c1, c2, t) {{
  const r1 = parseInt(c1.slice(1, 3), 16);
  const g1 = parseInt(c1.slice(3, 5), 16);
  const b1 = parseInt(c1.slice(5, 7), 16);
  const r2 = parseInt(c2.slice(1, 3), 16);
  const g2 = parseInt(c2.slice(3, 5), 16);
  const b2 = parseInt(c2.slice(5, 7), 16);
  const r = Math.round(lerp(r1, r2, t));
  const g = Math.round(lerp(g1, g2, t));
  const b = Math.round(lerp(b1, b2, t));
  return `#${{r.toString(16).padStart(2,'0')}}${{g.toString(16).padStart(2,'0')}}${{b.toString(16).padStart(2,'0')}}`;
}}

const pathList = document.getElementById('pathList');
const pathPoints = [];

for (const cell of data.cells) {{
  const isDoor = doorCells.has(cell.name);
  addBox(cell.pos, 0.9, isDoor ? '#ff4d4d' : '#2a6fd2', 0.2);
}}

function addLabel(text, pos) {{
  const dt = new BABYLON.DynamicTexture('label', {{ width: 256, height: 64 }}, scene, true);
  dt.hasAlpha = true;
  dt.drawText(text, 6, 46, '36px monospace', '#ffffff', 'rgba(10,16,32,0.8)', true);
  const mat = new BABYLON.StandardMaterial('labelMat', scene);
  mat.diffuseTexture = dt;
  mat.opacityTexture = dt;
  const plane = BABYLON.MeshBuilder.CreatePlane('labelPlane', {{ width: 1.1, height: 0.28 }}, scene);
  plane.material = mat;
  plane.position = new BABYLON.Vector3(pos[0], pos[1] + 0.65, pos[2]);
  plane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
  return plane;
}}

function drawPath(pathData) {{
  const points = [];
  for (let i = 0; i < pathData.path.length; i++) {{
    const cell = pathData.path[i];
    points.push(new BABYLON.Vector3(cell.pos[0], cell.pos[1], cell.pos[2]));
    const li = document.createElement('li');
    li.textContent = `${{pathData.agent}} ${{i + 1}}: ${{cell.name}}`;
    pathList.appendChild(li);
    addLabel(`${{pathData.agent}}:${{i + 1}}:${{cell.name}}`, cell.pos);
  }}

  if (pathData.start) {{
    addSphere(pathData.start.pos, 0.65, '#2ecc71', 0.95);
  }}
  if (pathData.goal) {{
    addSphere(pathData.goal.pos, 0.65, '#f1c40f', 0.95);
  }}

  // Draw line for this agent
  if (points.length >= 2) {{
    const line = BABYLON.MeshBuilder.CreateLines(`path_${{pathData.agent}}`, {{ points }}, scene);
    line.color = BABYLON.Color3.FromHexString(pathData.color);
  }}
}}

// Back-compat: single-path renders
if (data.path) {{
  drawPath({{
    agent: 'a1',
    color: '#ff3030',
    path: data.path,
    start: data.start,
    goal: data.goal,
  }});
}}

// Multi-agent renders
if (data.paths) {{
  for (const p of data.paths) {{
    drawPath(p);
  }}
}}
for (const cell of data.buttons) {{
  // More translucent so it doesn't hide start/goal spheres if overlapping
  addBox(cell.pos, 0.7, '#ff7f0e', 0.5);
}}

// NOTE: we draw per-agent lines above; do not draw a combined polyline.

// Fit camera
if (data.cells.length > 0) {{
  const xs = data.cells.map(c => c.pos[0]);
  const ys = data.cells.map(c => c.pos[1]);
  const zs = data.cells.map(c => c.pos[2]);
  const center = new BABYLON.Vector3(
    (Math.min(...xs) + Math.max(...xs)) / 2,
    (Math.min(...ys) + Math.max(...ys)) / 2,
    (Math.min(...zs) + Math.max(...zs)) / 2
  );
  camera.target = center;
  camera.radius = Math.max(...xs.map(x => Math.abs(x - center.x))) + Math.max(...ys.map(y => Math.abs(y - center.y))) + 6;
}}

engine.runRenderLoop(() => scene.render());
window.addEventListener('resize', () => engine.resize());
</script>
</body>
</html>
"""
    output_path.write_text(html, encoding="utf-8")

def main():
    parser = argparse.ArgumentParser(description="Render 3D maze as interactive HTML.")
    parser.add_argument("problem", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--plan", type=Path, help="Optional plan.out file to highlight path")
    parser.add_argument(
        "--agent",
        default=None,
        help="Agent name to render (multi-agent problems). Defaults to a1 or the first declared agent.",
    )
    parser.add_argument(
      "--agents",
      default=None,
      help="Comma-separated list of agents to render together (e.g. a1,a2). Overrides --agent.",
    )
    parser.add_argument(
        "--cdn",
        action="store_true",
        help="Use Three.js from CDN instead of local vendor files",
    )
    parser.add_argument(
        "--file",
        action="store_true",
        help="Generate a file:// compatible render using Babylon.js",
    )
    args = parser.parse_args()

    # Decide which agents to render
    requested_agents = None
    if args.agents:
      requested_agents = [a.strip() for a in args.agents.split(",") if a.strip()]

    if requested_agents and len(requested_agents) > 0:
      agents = requested_agents
    elif args.agent:
      agents = [args.agent]
    else:
      # Default: a1 if present, else first declared agent, else a1.
      agents_found = parse_agents(args.problem)
      agents = ["a1"] if "a1" in agents_found else ([agents_found[0]] if agents_found else ["a1"])

    # Parse cells, buttons, starts/goals
    if len(agents) == 1:
      cells, start, goal, buttons = parse_problem(args.problem)
      if not cells:
        print("Warning: no 3D cells parsed. Expect names like c012 or c0_1_2.", flush=True)

      adjacency = parse_adjacency(args.problem)
      connects = parse_connects(args.problem)
      stairs = parse_stairs(args.problem)
      elevators = parse_elevator_connects(args.problem)

      door_cells = {c for _, a, b in connects for c in (a, b)}
      edges = set(adjacency)
      edges |= {(a, b) for _, a, b in connects}
      edges |= set(stairs)
      edges |= {(a, b) for _, a, b in elevators}

      extra = set()
      if start:
        extra.add(start)
      if goal:
        extra.add(goal)
      extra |= set(buttons.values())

      filtered_cells = filter_traversable_cells(cells, edges, extra)
      path_cells = parse_plan(args.plan, agent=agents[0]) if args.plan else []
      data = {
        "cells": [{"name": k, "pos": v} for k, v in filtered_cells.items()],
        "path": [{"name": n, "pos": filtered_cells[n]} for n in path_cells if n in filtered_cells],
        "start": {"name": start, "pos": filtered_cells[start]} if start in filtered_cells else None,
        "goal": {"name": goal, "pos": filtered_cells[goal]} if goal in filtered_cells else None,
        "buttons": [{"name": b, "pos": filtered_cells[c]} for b, c in buttons.items() if c in filtered_cells],
        "doorCells": [c for c in door_cells if c in filtered_cells],
      }
    else:
      cells, starts, goals, buttons = parse_problem_multi(args.problem, agents)
      if not cells:
        print("Warning: no 3D cells parsed. Expect names like c012 or c0_1_2.", flush=True)

      adjacency = parse_adjacency(args.problem)
      connects = parse_connects(args.problem)
      stairs = parse_stairs(args.problem)
      elevators = parse_elevator_connects(args.problem)

      door_cells = {c for _, a, b in connects for c in (a, b)}
      edges = set(adjacency)
      edges |= {(a, b) for _, a, b in connects}
      edges |= set(stairs)
      edges |= {(a, b) for _, a, b in elevators}

      extra = set()
      for agent in agents:
        if starts.get(agent):
          extra.add(starts[agent])
        if goals.get(agent):
          extra.add(goals[agent])
      extra |= set(buttons.values())

      filtered_cells = filter_traversable_cells(cells, edges, extra)

      palette = ["#ff3030", "#8a5cff", "#2dd4bf", "#f97316", "#22c55e"]
      paths = []
      for idx, agent in enumerate(agents):
        path_cells = parse_plan(args.plan, agent=agent) if args.plan else []
        start = starts.get(agent)
        goal = goals.get(agent)
        paths.append(
          {
            "agent": agent,
            "color": palette[idx % len(palette)],
            "path": [{"name": n, "pos": filtered_cells[n]} for n in path_cells if n in filtered_cells],
            "start": {"name": start, "pos": filtered_cells[start]} if start in filtered_cells else None,
            "goal": {"name": goal, "pos": filtered_cells[goal]} if goal in filtered_cells else None,
          }
        )

      data = {
        "cells": [{"name": k, "pos": v} for k, v in filtered_cells.items()],
        "paths": paths,
        "buttons": [{"name": b, "pos": filtered_cells[c]} for b, c in buttons.items() if c in filtered_cells],
        "doorCells": [c for c in door_cells if c in filtered_cells],
      }

    if args.file:
        make_html_babylon(data, args.output)
    else:
        vendor_dir = Path(__file__).resolve().parent / "vendor"
        use_local = vendor_dir.exists() and not args.cdn
        make_html(data, args.output, use_local)


if __name__ == "__main__":
    main()
