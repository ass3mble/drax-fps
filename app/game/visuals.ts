import type * as ThreeType from 'three';
import type { MapId } from './maps';

type Bounds = { minX: number; maxX: number; minZ: number; maxZ: number };
type VisualPreset = { rainCount: number; shadowMapSize: number };

export function enhanceArenaVisuals(
  THREE: typeof ThreeType,
  scene: ThreeType.Scene,
  mapId: MapId,
  bounds: Bounds,
  groundMaterial: ThreeType.MeshStandardMaterial,
  materials: Record<string, ThreeType.MeshStandardMaterial>,
) {
  let disposed = false;
  const ownedTextures = new Set<ThreeType.Texture>();
  let seed = 0x51a9d3;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const canvas = (w: number, h = w) => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  };
  const texture = (c: HTMLCanvasElement, repeatX = 1, repeatY = repeatX, srgb = true) => {
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeatX, repeatY);
    t.anisotropy = 8;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    ownedTextures.add(t);
    return t;
  };

  // Procedural PBR maps give every arena micro-surface detail without extra downloads.
  const groundC = canvas(1024);
  const gc = groundC.getContext('2d')!;
  gc.fillStyle = mapId === 'sun-relay' ? '#c6bda7' : mapId === 'drax-docks' ? '#747d7a' : '#89918e';
  gc.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 52000; i++) {
    const light = Math.floor(70 + rand() * 95);
    gc.fillStyle = `rgba(${light},${light + 4},${light + 3},${0.035 + rand() * 0.11})`;
    gc.fillRect(rand() * 1024, rand() * 1024, 0.4 + rand() * 2.2, 0.4 + rand() * 2.2);
  }
  for (let i = 0; i < 70; i++) {
    let x = rand() * 1024, y = rand() * 1024;
    gc.strokeStyle = `rgba(20,27,27,${0.07 + rand() * 0.12})`;
    gc.lineWidth = 0.7 + rand() * 1.8;
    gc.beginPath(); gc.moveTo(x, y);
    for (let j = 0; j < 7; j++) { x += rand() * 65 - 32; y += 18 + rand() * 48; gc.lineTo(x, y); }
    gc.stroke();
  }
  for (let i = 0; i < 18; i++) {
    const x = rand() * 1024, y = rand() * 1024, r = 18 + rand() * 70;
    const stain = gc.createRadialGradient(x, y, 0, x, y, r);
    stain.addColorStop(0, `rgba(23,30,28,${0.1 + rand() * 0.12})`);
    stain.addColorStop(1, 'rgba(23,30,28,0)');
    gc.fillStyle = stain; gc.fillRect(x - r, y - r, r * 2, r * 2);
  }

  const roughC = canvas(512);
  const rc = roughC.getContext('2d')!;
  rc.fillStyle = '#dddddd'; rc.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 9000; i++) {
    const v = 150 + Math.floor(rand() * 95);
    rc.fillStyle = `rgba(${v},${v},${v},${0.15 + rand() * 0.35})`;
    rc.fillRect(rand() * 512, rand() * 512, 1 + rand() * 5, 1 + rand() * 5);
  }
  if (mapId === 'drax-docks' || mapId === 'lockgate') {
    for (let i = 0; i < 30; i++) {
      const x = rand() * 512, y = rand() * 512, r = 18 + rand() * 62;
      const wet = rc.createRadialGradient(x, y, 0, x, y, r);
      wet.addColorStop(0, 'rgba(45,45,45,.82)'); wet.addColorStop(0.55, 'rgba(75,75,75,.45)'); wet.addColorStop(1, 'rgba(160,160,160,0)');
      rc.fillStyle = wet; rc.fillRect(x - r, y - r, r * 2, r * 2);
    }
  }

  const bumpC = canvas(512);
  const bc = bumpC.getContext('2d')!;
  bc.fillStyle = '#808080'; bc.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 23000; i++) {
    const v = 105 + Math.floor(rand() * 50);
    bc.fillStyle = `rgba(${v},${v},${v},${0.18 + rand() * 0.32})`;
    bc.fillRect(rand() * 512, rand() * 512, 0.5 + rand() * 2.5, 0.5 + rand() * 2.5);
  }
  groundMaterial.map = texture(groundC, 18, 24);
  groundMaterial.roughnessMap = texture(roughC, 18, 24, false);
  groundMaterial.bumpMap = texture(bumpC, 34, 44, false);
  groundMaterial.bumpScale = mapId === 'sun-relay' ? 0.022 : 0.038;
  groundMaterial.roughness = mapId === 'drax-docks' ? 0.82 : 0.9;
  groundMaterial.needsUpdate = true;

  const surfaceC = canvas(512);
  const sc = surfaceC.getContext('2d')!;
  sc.fillStyle = '#d4d4cf'; sc.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 10000; i++) {
    const shade = 130 + Math.floor(rand() * 95);
    sc.fillStyle = `rgba(${shade},${shade},${shade},${0.06 + rand() * 0.18})`;
    sc.fillRect(rand() * 512, rand() * 512, 0.6 + rand() * 2, 0.6 + rand() * 11);
  }
  for (let i = 0; i < 55; i++) {
    sc.fillStyle = `rgba(73,49,36,${0.06 + rand() * 0.1})`;
    sc.fillRect(rand() * 512, rand() * 512, 2 + rand() * 8, 18 + rand() * 65);
  }
  const surfaceMap = texture(surfaceC, 3);
  const surfaceBump = texture(surfaceC, 3, 3, false);
  for (const [name, material] of Object.entries(materials)) {
    material.map = surfaceMap; material.bumpMap = surfaceBump;
    material.bumpScale = name === 'concrete' ? 0.035 : 0.016;
    material.envMapIntensity = name === 'concrete' ? 0.38 : 0.82;
    material.needsUpdate = true;
  }

  // Start with procedural maps so the game remains fully usable while image
  // assets decode. Local CC0 Poly Haven PBR then replaces the fallback maps.
  const textureLoader = new THREE.TextureLoader();
  const configureImage = (map: ThreeType.Texture, repeatX: number, repeatY: number, srgb = false) => {
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.repeat.set(repeatX, repeatY);
    map.anisotropy = 8;
    if (srgb) map.colorSpace = THREE.SRGBColorSpace;
    return map;
  };
  const applyPbr = async (
    material: ThreeType.MeshStandardMaterial,
    slug: string,
    repeatX: number,
    repeatY: number,
    normalStrength = 0.55,
  ) => {
    try {
      const root = `/textures/polyhaven/${slug}/${slug}`;
      const [albedo, normal, roughness] = await Promise.all([
        textureLoader.loadAsync(`${root}_diff_1k.jpg`),
        textureLoader.loadAsync(`${root}_nor_gl_1k.jpg`),
        textureLoader.loadAsync(`${root}_rough_1k.jpg`),
      ]);
      if (disposed) {
        albedo.dispose();
        normal.dispose();
        roughness.dispose();
        return;
      }
      ownedTextures.add(albedo);
      ownedTextures.add(normal);
      ownedTextures.add(roughness);
      material.map = configureImage(albedo, repeatX, repeatY, true);
      material.normalMap = configureImage(normal, repeatX, repeatY);
      material.normalScale.set(normalStrength, normalStrength);
      material.roughnessMap = configureImage(roughness, repeatX, repeatY);
      material.bumpMap = null;
      material.needsUpdate = true;
    } catch {
      // Procedural fallback above deliberately remains valid offline.
    }
  };
  void applyPbr(groundMaterial, 'concrete_floor_01', 11, 15, mapId === 'sun-relay' ? 0.28 : 0.48);
  if (materials.concrete) void applyPbr(materials.concrete, 'concrete_floor_01', 2.6, 2.6, 0.42);
  if (materials.steel) void applyPbr(materials.steel, 'rusty_metal_02', 2.2, 2.2, 0.34);
  if (materials.dark) void applyPbr(materials.dark, 'rusty_metal_02', 2.7, 2.7, 0.3);

  // Coherent reflections for metal, wet ground and water.
  const envC = canvas(1024, 512);
  const ec = envC.getContext('2d')!;
  const envGradient = ec.createLinearGradient(0, 0, 0, 512);
  if (mapId === 'sun-relay') {
    envGradient.addColorStop(0, '#6b98af'); envGradient.addColorStop(0.52, '#d7c4a4'); envGradient.addColorStop(1, '#394f55');
  } else if (mapId === 'drax-docks') {
    envGradient.addColorStop(0, '#07131d'); envGradient.addColorStop(0.5, '#284858'); envGradient.addColorStop(0.7, '#7d6b54'); envGradient.addColorStop(1, '#101a20');
  } else {
    envGradient.addColorStop(0, '#172e40'); envGradient.addColorStop(0.55, '#66808a'); envGradient.addColorStop(1, '#24343a');
  }
  ec.fillStyle = envGradient; ec.fillRect(0, 0, 1024, 512);
  const glows = mapId === 'drax-docks' ? [[140, 335, 100], [520, 315, 68], [845, 340, 95]] : [[180, 330, 95], [760, 310, 70]];
  for (const [x, y, r] of glows) {
    const g = ec.createRadialGradient(x, y, 1, x, y, r);
    g.addColorStop(0, mapId === 'sun-relay' ? 'rgba(255,225,166,.7)' : 'rgba(255,190,119,.62)'); g.addColorStop(1, 'rgba(255,190,119,0)');
    ec.fillStyle = g; ec.fillRect(x - r, y - r, r * 2, r * 2);
  }
  const envTexture = texture(envC);
  envTexture.mapping = THREE.EquirectangularReflectionMapping;
  scene.environment = envTexture;
  scene.environmentIntensity = mapId === 'drax-docks' ? 0.95 : 0.72;

  // Keep decorative geometry under one root so the engine's top-level bullet raycast
  // only sees authoritative gameplay geometry created by arena.ts.
  const visualRoot = new THREE.Group();
  visualRoot.name = 'arena-visuals';
  scene.add(visualRoot);

  const visualLights: ThreeType.Light[] = [];
  const animatedTextures: { texture: ThreeType.Texture; x: number; y: number }[] = [];
  let elapsed = 0;

  // Visual-only batches never enter collision/navigation.
  const detailBox = new THREE.BoxGeometry(1, 1, 1);
  const detailBatches = new Map<ThreeType.Material, ThreeType.Matrix4[]>();
  const helper = new THREE.Object3D();
  const addDetailBox = (material: ThreeType.Material, x: number, y: number, z: number, w: number, h: number, d: number, rotationY = 0) => {
    helper.position.set(x, y, z); helper.rotation.set(0, rotationY, 0); helper.scale.set(w, h, d); helper.updateMatrix();
    const batch = detailBatches.get(material) ?? []; batch.push(helper.matrix.clone()); detailBatches.set(material, batch);
  };
  const trim = new THREE.MeshStandardMaterial({ color: 0x263b43, roughness: 0.47, metalness: 0.62, envMapIntensity: 1.1 });
  const rust = new THREE.MeshStandardMaterial({ color: 0x674235, roughness: 0.67, metalness: 0.42, envMapIntensity: 0.7 });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x12191b, roughness: 0.88, metalness: 0.02 });
  const yellow = new THREE.MeshStandardMaterial({ color: 0xc59b38, roughness: 0.48, metalness: 0.35, envMapIntensity: 0.9 });
  const lamp = new THREE.MeshStandardMaterial({ color: 0xffd8a3, emissive: 0xffb45d, emissiveIntensity: mapId === 'drax-docks' ? 3.6 : 2.2, roughness: 0.28, metalness: 0.08 });
  const coolLamp = new THREE.MeshStandardMaterial({ color: 0xccefff, emissive: 0x7ecfff, emissiveIntensity: 2.5, roughness: 0.25 });

  const addCylinder = (material: ThreeType.Material, x: number, y: number, z: number, radius: number, height: number, rotationZ = 0, segments = 12) => {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, segments), material);
    mesh.position.set(x, y, z); mesh.rotation.z = rotationZ; mesh.castShadow = false; mesh.receiveShadow = true; visualRoot.add(mesh); return mesh;
  };
  const makeTextPlane = (text: string, x: number, y: number, z: number, width: number, color: string, rotationY = 0) => {
    const c = canvas(512, 128), ctx = c.getContext('2d')!;
    ctx.fillStyle = 'rgba(15,28,34,.9)'; ctx.fillRect(0, 0, 512, 128); ctx.fillStyle = color; ctx.fillRect(0, 0, 10, 128);
    ctx.strokeStyle = 'rgba(210,226,224,.6)'; ctx.lineWidth = 3; ctx.strokeRect(18, 12, 480, 104);
    ctx.fillStyle = '#f0efe7'; ctx.font = '700 48px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 260, 66);
    const map = new THREE.CanvasTexture(c); map.colorSpace = THREE.SRGBColorSpace;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, width / 4), new THREE.MeshStandardMaterial({ map, transparent: true, roughness: 0.7, metalness: 0.05 }));
    mesh.position.set(x, y, z); mesh.rotation.y = rotationY; visualRoot.add(mesh);
  };
  const addGroundStencil = (text: string, x: number, z: number, size: number, color = '#d0a53e') => {
    const c = canvas(256), ctx = c.getContext('2d')!;
    ctx.clearRect(0, 0, 256, 256); ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 10; ctx.strokeRect(34, 34, 188, 188);
    ctx.font = '900 142px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 128, 138);
    const map = new THREE.CanvasTexture(c); map.colorSpace = THREE.SRGBColorSpace;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, opacity: 0.6 }));
    mesh.rotation.x = -Math.PI / 2; mesh.position.set(x, 0.032, z); visualRoot.add(mesh);
  };
  const addPuddle = (x: number, z: number, sx: number, sz: number, rotation = 0) => {
    const material = new THREE.MeshPhysicalMaterial({ color: 0x20343a, transparent: true, opacity: 0.38, roughness: 0.14, metalness: 0.02, clearcoat: 1, clearcoatRoughness: 0.08, depthWrite: false, envMapIntensity: 1.7 });
    const mesh = new THREE.Mesh(new THREE.CircleGeometry(1, 28), material);
    mesh.rotation.x = -Math.PI / 2; mesh.rotation.z = rotation; mesh.scale.set(sx, sz, 1); mesh.position.set(x, 0.029, z); visualRoot.add(mesh);
  };
  const addFloodLight = (x: number, z: number, aimX: number, aimZ: number, cool = false) => {
    addDetailBox(trim, x, 3.1, z, 0.17, 6.2, 0.17); addDetailBox(trim, x, 6.18, z, 1.1, 0.16, 0.45); addDetailBox(cool ? coolLamp : lamp, x, 6.05, z, 0.82, 0.08, 0.3);
    const light = new THREE.SpotLight(cool ? 0x9edcff : 0xffc87d, cool ? 42 : 58, 25, Math.PI / 4.4, 0.6, 1.55);
    light.position.set(x, 6.05, z); light.castShadow = false; light.target.position.set(aimX, 0.3, aimZ); visualRoot.add(light, light.target); visualLights.push(light);
  };
  const decorateContainer = (x: number, z: number, w: number, h: number, d: number, paint: ThreeType.Material) => {
    for (const side of [-1, 1]) {
      const faceZ = z + side * (d / 2 + 0.025);
      addDetailBox(trim, x, h - 0.11, faceZ, w + 0.05, 0.13, 0.04); addDetailBox(trim, x, 0.12, faceZ, w + 0.05, 0.13, 0.04);
      for (let rib = -w / 2 + 0.28; rib < w / 2 - 0.1; rib += 0.47) addDetailBox(paint, x + rib, h / 2, faceZ + side * 0.018, 0.08, h - 0.34, 0.035);
      for (const edge of [-1, 1]) addDetailBox(trim, x + edge * (w / 2 + 0.025), h / 2, faceZ, 0.08, h, 0.055);
    }
    for (const side of [-1, 1]) {
      const faceX = x + side * (w / 2 + 0.025);
      addDetailBox(trim, faceX, h / 2, z, 0.045, h, d + 0.06);
      for (const dz of [-d * 0.27, d * 0.27]) addDetailBox(paint, faceX + side * 0.018, h / 2, z + dz, 0.035, h - 0.32, 0.09);
    }
  };

  if (mapId === 'drax-docks') {
    scene.background = new THREE.Color(0x102430);
    if (scene.fog instanceof THREE.FogExp2) { scene.fog.color.setHex(0x17313c); scene.fog.density = 0.0052; }
    for (const object of scene.children) {
      if (object instanceof THREE.HemisphereLight) object.intensity = 0.72;
      else if (object instanceof THREE.AmbientLight) object.intensity = 0.08;
      else if (object instanceof THREE.DirectionalLight) object.intensity *= object.position.z > 0 ? 0.48 : 0.7;
      else if (object instanceof THREE.Mesh && object.material instanceof THREE.ShaderMaterial && object.geometry.type === 'SphereGeometry') object.visible = false;
    }
    const dockSky = new THREE.Mesh(new THREE.SphereGeometry(125, 32, 18), new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false,
      vertexShader: 'varying vec3 vD;void main(){vD=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: `varying vec3 vD;float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1.,0.)),f.x),mix(h(i+vec2(0.,1.)),h(i+vec2(1.)),f.x),f.y);}void main(){vec3 d=normalize(vD);float y=max(d.y,0.);vec3 c=mix(vec3(.17,.29,.34),vec3(.018,.045,.073),smoothstep(0.,.82,y));vec2 uv=d.xz/max(.15,y+.22);float q=n(uv*1.7)*.62+n(uv*4.1)*.27+n(uv*8.6)*.11;float cl=smoothstep(.43,.7,q);c=mix(c,vec3(.035,.06,.073),cl*.78);float hz=pow(1.-y,5.);c+=vec3(.16,.115,.07)*hz*(1.-cl)*.55;gl_FragColor=vec4(c,1.);}`,
    }));
    dockSky.renderOrder = -100; visualRoot.add(dockSky);

    decorateContainer(-21.5, 3.8, 5, 2.7, 2.3, rust); decorateContainer(21.5, 3.8, 5, 2.7, 2.3, materials.steel);
    decorateContainer(17, -14.4, 4, 2.7, 1.2, materials.steel); decorateContainer(23, -14.4, 4, 2.7, 1.2, rust);

    // Crane/pier and distant warehouse silhouettes add scale outside the combat volume.
    for (const z of [-24, -8, 8, 24]) {
      addDetailBox(yellow, -30.2, 4.1, z, 0.34, 8.2, 0.34); addDetailBox(yellow, -26.8, 8.1, z, 7.1, 0.25, 0.32); addDetailBox(trim, -23.6, 6.5, z, 0.18, 3.2, 0.18);
      addCylinder(rubber, -29.4, 0.55, z + 2.1, 0.46, 0.36, Math.PI / 2, 18);
    }
    addDetailBox(yellow, -29.8, 9.4, -7.5, 0.55, 2.4, 0.55); addDetailBox(yellow, -23.5, 10.5, -7.5, 13.1, 0.32, 0.45); addDetailBox(yellow, -17.3, 8.5, -7.5, 0.2, 4.1, 0.2);
    for (const z of [-26, -8, 12, 28]) {
      addDetailBox(materials.dark, 36.5, 4.4, z, 8.2, 8.8, 14); addDetailBox(trim, 36.5, 8.9, z, 8.8, 0.28, 14.6);
      for (const dz of [-4, 0, 4]) addDetailBox(coolLamp, 32.35, 5.5, z + dz, 0.06, 0.7, 1.5);
    }

    // Pipes, bollards, pallets and drums break up long primitive surfaces.
    for (const side of [-1, 1]) {
      for (const z of [-27, -18, -9, 0, 9, 18, 27]) { addCylinder(trim, side * 28.2, 1.25, z, 0.13, 2.5, 0, 10); addDetailBox(yellow, side * 28.2, 2.5, z, 0.35, 0.1, 0.35); }
      addDetailBox(trim, side * 28.2, 2.4, 0, 0.15, 0.15, 62);
    }
    for (const z of [-19, -8, 4, 16]) for (const x of [-24.5, 24.5]) { addCylinder(rubber, x, 0.35, z, 0.34, 0.7, 0, 14); addDetailBox(yellow, x, 0.7, z, 0.18, 0.12, 0.18); }
    for (const [x, z, rot] of [[-13.8, 6.8, 0.2], [13.5, 7.2, -0.15], [-9.4, -18.8, 0], [9.2, -18.7, 0]] as const) {
      addDetailBox(rust, x, 0.11, z, 2.2, 0.2, 1.25, rot); for (const dx of [-0.72, 0, 0.72]) addDetailBox(materials.concrete, x + dx, 0.28, z, 0.52, 0.34, 0.9, rot);
    }
    for (const [x, z] of [[-15.4, 12.2], [15.5, 12], [-11.3, -11.8], [11.6, -12.1]] as const) {
      for (const dx of [-0.38, 0.38]) addCylinder(rust, x + dx, 0.43, z, 0.31, 0.82, 0, 14); addDetailBox(trim, x, 0.88, z, 1.05, 0.07, 0.72);
    }

    addFloodLight(-26.2, 18, -15, 8); addFloodLight(26.2, 18, 15, 7, true); addFloodLight(-26.2, -19, -18, -9, true);
    addFloodLight(26.2, -19, 18, -9); addFloodLight(-5.2, -27.5, -7, -14); addFloodLight(5.2, 27.5, 7, 14, true);

    addPuddle(-4.8, 16.2, 2.8, 1.2, 0.22); addPuddle(6.4, 12.4, 2.1, 0.9, -0.35); addPuddle(-13.4, -6.1, 1.9, 0.75, 0.5);
    addPuddle(8.8, -18.1, 2.6, 0.8, -0.1); addPuddle(20.4, -3.2, 1.5, 0.65, 0.2);

    // Drainage, lane paint and bombsite visual identity.
    for (const x of [-27.7, 27.7]) for (let z = -32; z <= 32; z += 1.3) addDetailBox(trim, x, 0.02, z, 0.62, 0.018, 0.08);
    for (const x of [-19, 19]) for (let z = 13; z <= 28; z += 2.2) addDetailBox(yellow, x, 0.022, z, 0.12, 0.018, 1.2);
    for (const x of [-24, -22.8, -21.6, -20.4, -19.2, -18, -16.8, -15.6]) addDetailBox(yellow, x, 0.023, -12.1, 0.72, 0.02, 0.18, -0.55);
    for (const x of [15.8, 17, 18.2, 19.4, 20.6, 21.8, 23, 24.2]) addDetailBox(yellow, x, 0.023, -12.1, 0.72, 0.02, 0.18, 0.55);
    addGroundStencil('A', -20, -8, 5.1, '#d3a43e'); addGroundStencil('B', 20, -8, 5.1, '#d3a43e');
    makeTextPlane('A · PIER', -25.76, 2.15, -8, 3.4, '#e0ac42', Math.PI / 2); makeTextPlane('B · HALL', 25.28, 2.15, -8, 3.4, '#e0ac42', -Math.PI / 2); makeTextPlane('MID / 02', 0, 2.35, -10.2, 3.2, '#85cbe0');

    // Animated physical harbor surface.
    const waterNormalC = canvas(256), wnc = waterNormalC.getContext('2d')!;
    wnc.fillStyle = '#8080ff'; wnc.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 7000; i++) { const r = 118 + Math.floor(rand() * 22), g = 118 + Math.floor(rand() * 22); wnc.fillStyle = `rgb(${r},${g},255)`; wnc.fillRect(rand() * 256, rand() * 256, 1 + rand() * 2, 1); }
    const waterNormal = texture(waterNormalC, 8, 26, false);
    const waterMaterial = new THREE.MeshPhysicalMaterial({ color: 0x0a2834, roughness: 0.24, metalness: 0.08, clearcoat: 1, clearcoatRoughness: 0.12, normalMap: waterNormal, normalScale: new THREE.Vector2(0.22, 0.48), envMapIntensity: 1.9 });
    const water = new THREE.Mesh(new THREE.PlaneGeometry(9.4, 82), waterMaterial); water.rotation.x = -Math.PI / 2; water.position.set(-34.5, -0.064, 0); visualRoot.add(water);
    animatedTextures.push({ texture: waterNormal, x: 0.012, y: 0.035 });
  } else if (mapId === 'lockgate') {
    scene.environmentIntensity = 0.9;
    addFloodLight(-20.5, -22, -13, -12, true); addFloodLight(-20.5, 22, -13, 12); addFloodLight(21.5, -18, 16, -8); addFloodLight(21.5, 18, 16, 8, true);
    addPuddle(-7.5, -8, 2.4, 0.8, 0.25); addPuddle(7.2, 8.4, 2.2, 0.7, -0.2); makeTextPlane('LOCK / 07', -21.72, 2.2, 0, 3.1, '#d4ae4c', Math.PI / 2);
  } else if (mapId === 'iron-divide') {
    addFloodLight(-21.5, -20.5, -13, -12, true); addFloodLight(21.5, -20.5, 13, -12); addFloodLight(-21.5, 20.5, -13, 12); addFloodLight(21.5, 20.5, 13, 12, true);
    for (const z of [-21, 0, 21]) for (const x of [-11, 11]) addDetailBox(lamp, x, 7.08, z, 2.6, 0.05, 0.35);
  } else {
    scene.environmentIntensity = 0.78;
    addFloodLight(-20.5, -19, -10, -8); addFloodLight(20.5, -19, 10, -8, true); addFloodLight(-20.5, 19, -10, 8, true); addFloodLight(20.5, 19, 10, 8);
  }

  for (const [material, matrices] of detailBatches) {
    const mesh = new THREE.InstancedMesh(detailBox, material, matrices.length);
    matrices.forEach((matrix, index) => mesh.setMatrixAt(index, matrix));
    mesh.castShadow = false; mesh.receiveShadow = true; mesh.computeBoundingSphere(); visualRoot.add(mesh);
  }

  const hazeMaterial = new THREE.MeshBasicMaterial({ color: mapId === 'drax-docks' ? 0x6f8790 : 0xb5c4c2, transparent: true, opacity: mapId === 'drax-docks' ? 0.035 : 0.02, depthWrite: false, side: THREE.DoubleSide });
  for (const z of [bounds.minZ - 7, bounds.maxZ + 7]) {
    const haze = new THREE.Mesh(new THREE.PlaneGeometry(bounds.maxX - bounds.minX + 28, 13), hazeMaterial);
    haze.position.set(0, 5, z); haze.rotation.y = z > 0 ? Math.PI : 0; visualRoot.add(haze);
  }

  let highQuality = true;
  return {
    setQuality(preset: VisualPreset) {
      highQuality = preset.shadowMapSize >= 2048;
      for (const light of visualLights) light.visible = highQuality || mapId === 'drax-docks';
      for (const material of [lamp, coolLamp]) material.emissiveIntensity = highQuality ? (mapId === 'drax-docks' ? 3.6 : 2.2) : 1.3;
      void preset.rainCount;
    },
    update(dt: number) {
      if (disposed) return;
      elapsed += Math.min(dt, 0.05);
      for (const item of animatedTextures) {
        item.texture.offset.x = (item.texture.offset.x + item.x * dt) % 1;
        item.texture.offset.y = (item.texture.offset.y + item.y * dt) % 1;
      }
      if (mapId === 'drax-docks' && highQuality) lamp.emissiveIntensity = 3.6 * (0.97 + Math.sin(elapsed * 1.7) * 0.03);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      if (scene.environment === envTexture) scene.environment = null;
      for (const map of ownedTextures) map.dispose();
      ownedTextures.clear();
    },
  };
}
