import type * as ThreeType from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import {
  DRAX_DOCKS_LAYOUT,
  DOCKS_BOUNDS,
  LOCKGATE_LAYOUT,
  WORLD_BOUNDS,
  type MapId,
  type Team,
} from './maps';

export type { Team } from './maps';

export type ArenaCollider = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  maxY?: number;
};

type MaterialKey = 'steel' | 'dark' | 'concrete' | 'viper' | 'raven' | 'accent';

export function createArena(
  THREE: typeof ThreeType,
  scene: ThreeType.Scene,
  mapId: MapId = 'iron-divide',
) {
  const colliders: ArenaCollider[] = [];
  const bounds = { ...(mapId === 'drax-docks' ? DOCKS_BOUNDS : WORLD_BOUNDS) };

  // Neutral overcast daylight: lift midtones without washing out surfaces.
  scene.background = new THREE.Color(0xa1bcc8);
  scene.fog = new THREE.FogExp2(0xa1bcc8, 0.0038);

  const sky = new THREE.Mesh(new THREE.SphereGeometry(120, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    vertexShader: 'varying vec3 vDirection; void main(){vDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `varying vec3 vDirection;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.)),f.x),f.y);}
      void main(){vec3 d=normalize(vDirection);float h=max(d.y,0.);vec3 color=mix(vec3(.63,.75,.8),vec3(.23,.43,.61),smoothstep(0.,.9,h));vec2 uv=d.xz/max(.18,h+.2);float n=noise(uv*2.)*.6+noise(uv*4.3)*.28+noise(uv*9.)*.12;float cloud=smoothstep(.48,.72,n)*smoothstep(.02,.2,h);color=mix(color,vec3(.88,.89,.86),cloud*.75);gl_FragColor=vec4(color,1.);}`,
  }));
  sky.renderOrder = -100;
  scene.add(sky);

  const hemi = new THREE.HemisphereLight(0xe5f1ff, 0x858575, 1.65);
  scene.add(hemi);

  const moon = new THREE.DirectionalLight(0xffead2, 2.1);
  moon.position.set(-15, 24, 10);
  moon.castShadow = true;
  moon.shadow.mapSize.set(2048, 2048);
  moon.shadow.camera.left = -34;
  moon.shadow.camera.right = 34;
  moon.shadow.camera.top = 42;
  moon.shadow.camera.bottom = -42;
  moon.shadow.camera.near = 1;
  moon.shadow.camera.far = 80;
  moon.shadow.bias = -0.0001;
  moon.shadow.normalBias = 0.035;
  scene.add(moon);

  // Broad fill keeps characters readable in shade without flattening the whole arena.
  const fillLight = new THREE.DirectionalLight(0xb8d5ed, 0.85);
  fillLight.position.set(18, 13, -14);
  scene.add(fillLight);
  const frontFill = new THREE.DirectionalLight(0xe0e9df, 0.45);
  frontFill.position.set(0, 8, 28);
  scene.add(frontFill);
  scene.add(new THREE.AmbientLight(0xbac6c2, 0.28));

  const materials: Record<MaterialKey, ThreeType.MeshStandardMaterial> = {
    steel: new THREE.MeshStandardMaterial({
      color: 0x899ca1,
      roughness: 0.58,
      metalness: 0.22,
    }),
    dark: new THREE.MeshStandardMaterial({
      color: 0x647b84,
      roughness: 0.72,
      metalness: 0.28,
    }),
    concrete: new THREE.MeshStandardMaterial({
      color: 0xa6aaa0,
      roughness: 0.96,
      metalness: 0.01,
    }),
    viper: new THREE.MeshStandardMaterial({
      color: 0x385d66,
      emissive: 0x17333b,
      emissiveIntensity: 0.45,
      roughness: 0.58,
      metalness: 0.45,
    }),
    raven: new THREE.MeshStandardMaterial({
      color: 0x76503c,
      emissive: 0x331e15,
      emissiveIntensity: 0.45,
      roughness: 0.58,
      metalness: 0.45,
    }),
    accent: new THREE.MeshStandardMaterial({
      color: 0xb8a25d,
      emissive: 0x5e4a18,
      emissiveIntensity: 0.55,
      roughness: 0.48,
      metalness: 0.35,
    }),
  };

  // Tiny bevels catch highlights and remove the toy-like razor-sharp cube look
  // while collider math stays identical and authoritative.
  const unitBox = new RoundedBoxGeometry(1, 1, 1, 2, 0.018);
  type BoxBatch = {
    shadow: ThreeType.Matrix4[];
    noShadow: ThreeType.Matrix4[];
  };
  const batches = new Map<ThreeType.Material, BoxBatch>();
  const object = new THREE.Object3D();

  function addBox(
    material: ThreeType.Material,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    rotationY = 0,
    solid = true,
  ) {
    object.position.set(x, y, z);
    object.rotation.set(0, rotationY, 0);
    object.scale.set(w, h, d);
    object.updateMatrix();
    const batch = batches.get(material) ?? { shadow: [], noShadow: [] };
    (solid ? batch.shadow : batch.noShadow).push(object.matrix.clone());
    batches.set(material, batch);

    if (solid) {
      const c = Math.abs(Math.cos(rotationY));
      const s = Math.abs(Math.sin(rotationY));
      const cw = c * w + s * d;
      const cd = c * d + s * w;
      colliders.push({
        minX: x - cw / 2,
        maxX: x + cw / 2,
        minZ: z - cd / 2,
        maxZ: z + cd / 2,
        maxY: y + h / 2,
      });
    }
  }

  function addCylinder(
    material: ThreeType.Material,
    x: number,
    y: number,
    z: number,
    radius: number,
    height: number,
    segments = 18,
    rotationZ = 0,
  ) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, segments), material);
    mesh.position.set(x, y, z);
    mesh.rotation.z = rotationZ;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    return mesh;
  }

  const groundCanvas = document.createElement('canvas');
  groundCanvas.width = groundCanvas.height = 512;
  const gx = groundCanvas.getContext('2d')!;
  gx.fillStyle = '#7c8583';
  gx.fillRect(0, 0, 512, 512);
  let seed = 77131;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < 18000; i++) {
    const v = Math.floor(82 + rand() * 54);
    gx.fillStyle = `rgba(${v},${v + 4},${v + 5},${0.1 + rand() * 0.14})`;
    gx.fillRect(rand() * 512, rand() * 512, 0.5 + rand() * 2.2, 0.5 + rand() * 2.2);
  }
  for (let i = 0; i < 35; i++) {
    gx.strokeStyle = `rgba(15,22,24,${0.08 + rand() * 0.12})`;
    gx.lineWidth = 0.5 + rand() * 1.8;
    gx.beginPath();
    const x = rand() * 512;
    const y = rand() * 512;
    gx.moveTo(x, y);
    gx.lineTo(x + rand() * 110 - 55, y + rand() * 100 - 50);
    gx.stroke();
  }
  const wearCanvas = document.createElement('canvas');
  wearCanvas.width = wearCanvas.height = 256;
  const wx = wearCanvas.getContext('2d')!;
  wx.fillStyle = '#e4e7e3'; wx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1600; i++) {
    wx.fillStyle = `rgba(70,80,74,${0.02 + rand() * 0.07})`;
    wx.fillRect(rand() * 256, rand() * 256, 1 + rand() * 3, 1 + rand() * 20);
  }
  const wearTexture = new THREE.CanvasTexture(wearCanvas);
  wearTexture.colorSpace = THREE.SRGBColorSpace;
  wearTexture.wrapS = wearTexture.wrapT = THREE.RepeatWrapping;
  wearTexture.repeat.set(3, 3);
  wearTexture.anisotropy = 8;
  const wearBumpTexture = new THREE.CanvasTexture(wearCanvas);
  wearBumpTexture.wrapS = wearBumpTexture.wrapT = THREE.RepeatWrapping;
  wearBumpTexture.repeat.set(3, 3);
  wearBumpTexture.anisotropy = 8;
  materials.concrete.map = wearTexture;
  materials.concrete.bumpMap = wearBumpTexture;
  materials.concrete.bumpScale = 0.034;
  materials.steel.map = wearTexture;
  materials.steel.bumpMap = wearBumpTexture;
  materials.steel.bumpScale = 0.016;
  materials.dark.map = wearTexture;
  materials.dark.bumpMap = wearBumpTexture;
  materials.dark.bumpScale = 0.011;

  const groundTexture = new THREE.CanvasTexture(groundCanvas);
  groundTexture.colorSpace = THREE.SRGBColorSpace;
  groundTexture.wrapS = groundTexture.wrapT = THREE.RepeatWrapping;
  groundTexture.repeat.set(14, 20);
  groundTexture.anisotropy = 8;
  const groundMaterial = new THREE.MeshStandardMaterial({
    color: 0xd2d5c9,
    map: groundTexture,
    roughness: 0.94,
    metalness: 0.01,
  });
  const arenaWidth = bounds.maxX - bounds.minX;
  const arenaDepth = bounds.maxZ - bounds.minZ;
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(arenaWidth + 4, arenaDepth + 4),
    groundMaterial,
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Visible perimeter follows the authoritative map bounds.
  addBox(materials.dark, bounds.minX - 0.8, 1.8, 0, 0.5, 3.6, arenaDepth);
  addBox(materials.dark, bounds.maxX + 0.8, 1.8, 0, 0.5, 3.6, arenaDepth);
  addBox(materials.dark, 0, 1.8, bounds.minZ - 0.25, arenaWidth + 1, 3.6, 0.5);
  addBox(materials.dark, 0, 1.8, bounds.maxZ + 0.25, arenaWidth + 1, 3.6, 0.5);

  // Each arena gets its own spawn threshold geometry.
  for (const z of [-23, 23]) {
    if (mapId === 'drax-docks') continue;
    if (mapId === 'iron-divide') {
      for (const x of [-21, -7, 7, 21])
        addBox(materials.steel, x, 1.6, z, 6, 3.2, 1);
    } else if (mapId === 'sun-relay') {
      for (const x of [-16, 0, 16])
        addBox(materials.concrete, x, 1.35, z, 7.2, 2.7, 1.35);
    } else {
      for (const x of [-17, 0, 17])
        addBox(materials.concrete, x, 1.45, z, 7.8, 2.9, 1.1);
      for (const x of [-8, 8])
        addBox(materials.steel, x, 1.25, z + Math.sign(z) * 2.6, 1.1, 2.5, 4.8);
      addBox(materials.steel, Math.sign(z) * 12, 1.3, z + Math.sign(z) * 2.4, 4.4, 2.6, 1.05);
    }
  }

  if (mapId === 'drax-docks') {
    // Docks spawn shields: three exits (A Main / Mid / B Main) without spawn-to-spawn LOS.
    for (const z of [-25, 25]) {
      addBox(materials.concrete, -17, 1.5, z, 12, 3, 1.2);
      addBox(materials.concrete, 17, 1.5, z, 12, 3, 1.2);
      addBox(materials.steel, 0, 1.3, z + Math.sign(z) * 2.5, 7.2, 2.6, 1.2);
    }
  }

  if (mapId === 'iron-divide') {
  // Three-lane skeleton. Mirrored dividers block long sight lines but preserve connectors.
  for (const x of [-8, 8]) {
    for (const z of [-15, -6, 6, 15]) {
      addBox(materials.steel, x, 1.45, z, 2.4, 2.9, 7.2);
    }
  }

  // Mid lane: identical staggered cover from both spawn directions.
  for (const z of [-15, -9, 9, 15]) {
    addBox(materials.concrete, 0, 0.65, z, 4.5, 1.3, 1.2);
  }
  addBox(materials.dark, 0, 1.5, 0, 3.2, 3, 3.2);
  addBox(materials.accent, 0, 3.1, 0, 3.6, 0.16, 3.6, 0, false);

  // Left and right lanes are mirrored. Every strong cover has an equivalent opposite-side piece.
  const laneCover = [
    { x: 15, z: 14, w: 4.8, h: 2.6, d: 2.2, r: 0 },
    { x: 15, z: 6, w: 2.2, h: 1.35, d: 4.6, r: 0 },
    { x: 15, z: -5, w: 4.2, h: 2.2, d: 2, r: 0 },
    { x: 15, z: -14, w: 2.2, h: 1.3, d: 4.8, r: 0 },
  ];
  for (const item of laneCover) {
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        addBox(
          materials.concrete,
          item.x * sx,
          item.h / 2,
          item.z * sz,
          item.w,
          item.h,
          item.d,
          item.r,
        );
      }
    }
  }

  // Low central flanking blocks: crouch-height cover, symmetrical on all quadrants.
  for (const x of [-12, -4, 4, 12]) {
    for (const z of [-18, 18]) {
      addBox(materials.concrete, x, 0.55, z, 2.6, 1.1, 1.3);
    }
  }
  for (const x of [-19, 19]) {
    for (const z of [-2.5, 2.5]) {
      addBox(materials.steel, x, 1.25, z, 2.6, 2.5, 4.3);
    }
  }

  } else if (mapId === 'sun-relay') {
    // Sun Relay: sheltered side routes around a broad central energy courtyard.
    // Rotate every cover piece 180 degrees to give both teams the same approach.
    materials.concrete.color.setHex(0xe1c8a3);
    materials.steel.color.setHex(0xbbd1ce);
    materials.dark.color.setHex(0x557f87);
    groundMaterial.color.setHex(0xe0d7be);
    scene.fog!.color.setHex(0xc4d4d4);
    for (const side of [-1, 1]) {
      for (const x of [-9, 9]) {
        addBox(materials.concrete, x, 1.8, side * 11, 2.4, 3.6, 12);
        addBox(materials.viper, x, 3.68, side * 11, 2.7, 0.14, 12.3, 0, false);
      }
      addBox(materials.concrete, side * 3, 0.65, side * 17, 4.4, 1.3, 1.3);
      addBox(materials.steel, side * 17, 1.2, side * 9, 4.5, 2.4, 2.4);
      addBox(materials.steel, side * -17, 0.6, side * 3, 4.5, 1.2, 2.2);
      addBox(materials.concrete, side * 4.5, 0.65, side * 5, 2.8, 1.3, 1.5);
      // Broad gate frames sit over the existing spawn shields.
      for (const x of [-7, 7]) addBox(materials.accent, x, 3.5, side * 23, 6.3, 0.28, 1.2, 0, false);
    }
    addBox(materials.dark, 0, 1.5, 0, 3.8, 3, 3.8);
    addBox(materials.accent, 0, 3.1, 0, 4.2, 0.2, 4.2, 0, false);
    // Solar fins identify the perimeter without adding moving lights or particles.
    for (const side of [-1, 1]) for (const z of [-20, 0, 20]) {
      addBox(materials.dark, side * 26, 5.2, z, 3.2, 0.15, 9, 0, false);
      for (let dz = -4; dz <= 4; dz += 0.8)
        addBox(materials.viper, side * 26, 5.3, z + dz, 2.9, 0.06, 0.65, 0, false);
    }
  }

  // Spawn-side faction colors are TDM-only. Plant/Defuse swaps competitive sides at halftime.
  for (const [team, z] of [
    ['viper', 29],
    ['raven', -29],
  ] as const) {
    if (mapId === 'drax-docks') continue;
    const material = team === 'viper' ? materials.viper : materials.raven;
    addBox(material, 0, 0.04, z, 31, 0.06, 5.5, 0, false);
    for (const x of [-16, 16]) addBox(material, x, 1.2, z, 0.2, 2.4, 7, 0, false);

  }

  // Each arena gets its own floor language: freight lanes for Iron Divide,
  // relay calibration rings for Sun Relay, and wet dock markings for Lockgate.
  const stripeMaterial = new THREE.MeshBasicMaterial({
    color: 0xb7aa73,
    transparent: true,
    opacity: 0.65,
    depthWrite: false,
  });
  if (mapId === 'iron-divide') {
    for (const x of [-16, 0, 16]) {
      const stripe = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 56), stripeMaterial);
      stripe.rotation.x = -Math.PI / 2;
      stripe.position.set(x, 0.012, 0);
      scene.add(stripe);
    }
    const midLine = new THREE.Mesh(new THREE.PlaneGeometry(46, 0.09), stripeMaterial);
    midLine.rotation.x = -Math.PI / 2;
    midLine.position.set(0, 0.013, 0);
    scene.add(midLine);
  } else if (mapId === 'sun-relay') {
    for (const radius of [5.5, 10.5, 16.5, 22]) {
      const ring = new THREE.Mesh(new THREE.RingGeometry(radius, radius + .08, 64), stripeMaterial);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = .014;
      scene.add(ring);
    }
    for (const angle of [0, Math.PI / 4, Math.PI / 2, Math.PI * .75]) {
      const spoke = new THREE.Mesh(new THREE.PlaneGeometry(.055, 45), stripeMaterial);
      spoke.rotation.x = -Math.PI / 2;
      spoke.rotation.z = angle;
      spoke.position.y = .015;
      scene.add(spoke);
    }
  } else if (mapId === 'lockgate') {
    for (const x of [-16, 0, 16]) {
      const stripe = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 58), stripeMaterial);
      stripe.rotation.x = -Math.PI / 2;
      stripe.position.set(x, 0.014, 0);
      scene.add(stripe);
    }
    for (const z of [-12, 12]) {
      const cross = new THREE.Mesh(new THREE.PlaneGeometry(36, 0.08), stripeMaterial);
      cross.rotation.x = -Math.PI / 2;
      cross.position.set(-1, 0.015, z);
      scene.add(cross);
    }
    for (const x of [-6.4, 6.4]) {
      const pumpMark = new THREE.Mesh(new THREE.RingGeometry(1.55, 1.68, 32), stripeMaterial);
      pumpMark.rotation.x = -Math.PI / 2;
      pumpMark.scale.set(1.2, .72, 1);
      pumpMark.position.set(x, .017, 0);
      scene.add(pumpMark);
    }
  }

  if (mapId === 'iron-divide') {
    // Gantries and crane rails define the enclosed freight-yard silhouette.
    for (const z of [-21, 0, 21]) {
      addBox(materials.dark, 0, 7.6, z, 48.3, 0.26, 0.26, 0, false);
      for (const x of [-24.15, 24.15]) addBox(materials.dark, x, 3.8, z, 0.22, 7.6, 0.22, 0, false);
    }
  } else if (mapId === 'sun-relay') {
    // Freestanding arches and tilted photovoltaic canopies make Sun Relay read
    // as an open research campus rather than a reskinned cargo yard.
    for (const z of [-17, 0, 17]) {
      const arch = new THREE.Mesh(
        new THREE.TorusGeometry(7.4, .13, 8, 32, Math.PI),
        materials.accent,
      );
      arch.position.set(0, .05, z);
      scene.add(arch);
    }
    for (const side of [-1, 1]) for (const z of [-22, -8, 8, 22]) {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(6.5, .12, 3.2), materials.viper);
      panel.position.set(side * 19.5, 5.6, z);
      panel.rotation.z = side * -.18;
      panel.rotation.x = -.16;
      scene.add(panel);
      addBox(materials.dark, side * 19.5, 2.7, z, .16, 5.4, .16, 0, false);
    }
    const relay = new THREE.Mesh(new THREE.CylinderGeometry(2.35, 2.7, 3.25, 16), materials.dark);
    relay.position.set(0, 1.62, 0);
    scene.add(relay);
    const crown = new THREE.Mesh(new THREE.TorusGeometry(2.6, .13, 8, 32), materials.accent);
    crown.rotation.x = Math.PI / 2;
    crown.position.set(0, 3.25, 0);
    scene.add(crown);
  } else if (mapId === 'lockgate') {
    // Lockgate: damp port pump station, with close workshop fights on west,
    // split medium duels at the pumps, and a longer quay lane to the east.
    materials.concrete.color.setHex(0xb9bdb5);
    materials.steel.color.setHex(0x607d85);
    materials.dark.color.setHex(0x415b62);
    materials.accent.color.setHex(0xc9a34d);
    groundMaterial.color.setHex(0xc6cac1);
    scene.background = new THREE.Color(0xb7c9cc);
    scene.fog!.color.setHex(0xb7c9cc);

    const rust = new THREE.MeshStandardMaterial({ color: 0x9a654c, roughness: 0.82, metalness: 0.25 });
    const water = new THREE.MeshStandardMaterial({ color: 0x18343c, roughness: 0.5, metalness: 0.02 });
    const rail = new THREE.MeshStandardMaterial({ color: 0x33474d, roughness: 0.54, metalness: 0.44 });

    for (const side of [-1, 1]) {
      addBox(materials.concrete, -22.35, 1.7, side * 9.5, 1.1, 3.4, 22);
      addBox(materials.concrete, -9.55, 1.7, side * 18.2, 1, 3.4, 10.8);
      addBox(materials.concrete, -9.55, 1.7, side * 2.6, 1, 3.4, 5.2);
      addBox(materials.steel, -16.2, 0.68, side * 17.2, 4.8, 1.36, 1.7);
      addBox(materials.steel, -13.1, 1.18, side * 8.2, 2.1, 2.36, 3.6);
      addBox(rust, -18.6, 0.55, side * 3.6, 2.7, 1.1, 2.3);
      addBox(materials.concrete, -16.4, 0.64, side * 0.7, 3.2, 1.28, 1.4);
      addBox(materials.dark, -16, 3.7, side * 9.5, 14, .18, 20.5, 0, false);
      for (let tooth = 0; tooth < 4; tooth++)
        addBox(materials.steel, -20.4 + tooth * 2.7, 4.28, side * 9.5, .18, 1.2, 20.5, .24, false);
    }
    addBox(materials.concrete, -16, 1.55, 0, 2.8, 3.1, 2.2);

    addBox(materials.dark, -3.15, 1.55, 0, 2.5, 3.1, 8.2);
    addBox(materials.dark, 3.15, 1.55, 0, 2.5, 3.1, 8.2);
    addBox(materials.steel, 0, 0.72, -7.1, 3.8, 1.44, 1.45);
    addBox(materials.steel, 0, 0.72, 7.1, 3.8, 1.44, 1.45);
    addBox(rust, -5.2, 0.62, -13.8, 2.6, 1.24, 2.2);
    addBox(rust, 5.2, 0.62, 13.8, 2.6, 1.24, 2.2);
    addBox(materials.concrete, -5.6, 1.35, 13.1, 1.35, 2.7, 5.2);
    addBox(materials.concrete, 5.6, 1.35, -13.1, 1.35, 2.7, 5.2);
    for (const x of [-3.15, 3.15]) {
      addCylinder(materials.steel, x, 1.7, 0, .92, 3.7, 20, Math.PI / 2);
      addCylinder(rust, x, 3.68, 0, 1.06, .26, 20, Math.PI / 2);
    }
    for (const side of [-1, 1]) {
      addBox(materials.accent, 0, 6.15, side * 1.9, 14, .28, .32, 0, false);
      addBox(materials.accent, -6.8, 3.2, side * 1.9, .3, 6.1, .3, 0, false);
      addBox(materials.accent, 6.8, 3.2, side * 1.9, .3, 6.1, .3, 0, false);
    }
    addBox(materials.accent, 0, 6.6, 0, 3.4, .22, 2.7, 0, false);
    addCylinder(rust, 0, 2.9, 0, .24, 13.2, 14, Math.PI / 2);

    addBox(water, 29, -0.04, 0, 9, .05, 72, 0, false);
    for (const z of [-24, -12, 0, 12, 24]) {
      addBox(rail, 23.2, 1, z, .2, 2, 3.5);
      addBox(rail, 21.2, .54, z + 1.9, 2.4, 1.08, 1.2);
    }
    for (const z of [-17.5, 17.5]) {
      addBox(materials.concrete, 15.8, 1.25, z, 4.5, 2.5, 2.1);
      addBox(materials.steel, 18.9, .68, z * .48, 2.2, 1.36, 4.8);
      addCylinder(rail, 22.55, .62, z, .45, .55, 16);
      addCylinder(rail, 22.55, .62, z + Math.sign(z) * 4.2, .45, .55, 16);
    }
    addBox(materials.concrete, 14.2, 1.25, 0, 1.55, 2.5, 6.2);
    addBox(rust, 19.4, .56, 0, 3.4, 1.12, 1.35);
    addBox(materials.steel, 8.4, 1.25, 0, 1.35, 2.5, 4.6);
    addBox(materials.steel, -8.4, 1.25, 0, 1.35, 2.5, 3.8);

    for (const side of [-1, 1]) {
      addBox(materials.concrete, -4.8, 1.4, side * 12.2, 5, 2.8, 1.1);
      addBox(materials.steel, 8.2, 1.2, side * 11.4, 1.3, 2.4, 5.2);
      addBox(materials.concrete, 11.9, .58, side * 15.2, 4.1, 1.16, 1.25);
      addBox(materials.steel, -11.6, .58, side * 13.7, 3.6, 1.16, 1.2);
    }
  }

  if (mapId === 'drax-docks') {
    // DRAX DOCKS greybox/art pass. Tactical geometry is deliberately single-level.
    materials.concrete.color.setHex(0xabb1aa);
    materials.steel.color.setHex(0x536e78);
    materials.dark.color.setHex(0x314b55);
    materials.accent.color.setHex(0xd3aa3c);
    groundMaterial.color.setHex(0xc0c5bd);
    scene.background = new THREE.Color(0xa7bdc2);
    scene.fog!.color.setHex(0xa7bdc2);
    scene.fog!.density = 0.0022;

    const dockWater = new THREE.MeshStandardMaterial({ color: 0x142f39, roughness: 0.42, metalness: 0.03 });
    const containerBlue = new THREE.MeshStandardMaterial({ color: 0x496b78, roughness: 0.78, metalness: 0.16 });
    const containerRust = new THREE.MeshStandardMaterial({ color: 0x8a5c46, roughness: 0.82, metalness: 0.12 });
    const rail = new THREE.MeshStandardMaterial({ color: 0x2e454d, roughness: 0.52, metalness: 0.42 });

    // Water and distant silhouettes stay outside playable bounds and never become colliders.
    addBox(dockWater, -34.5, -0.12, 0, 8, 0.08, 82, 0, false);
    addBox(materials.dark, -39, 2.6, -18, 8, 5.2, 30, 0, false);
    addBox(materials.concrete, 39, 4.5, -15, 14, 9, 28, 0, false);

    // Three-way attacker staging: A Main, exposed Mid, B Main.
    addBox(materials.concrete, -11.5, 1.45, 17.5, 5.2, 2.9, 7.2);
    addBox(materials.concrete, 11.5, 1.45, 17.5, 5.2, 2.9, 7.2);
    addBox(materials.steel, -20.5, 0.62, 10.5, 4.4, 1.24, 1.8);
    addBox(materials.steel, 20.5, 0.62, 10.5, 4.4, 1.24, 1.8);

    // Central Mid remains fast but gets two alternating pieces of usable cover.
    addBox(materials.concrete, -2.7, 0.66, 10, 4.3, 1.32, 1.7);
    addBox(materials.steel, 2.7, 1.25, 1.5, 4.3, 2.5, 1.7);
    addBox(materials.dark, -7.6, 1.5, -4, 1.4, 3, 8.8);
    addBox(materials.dark, 7.6, 1.5, -4, 1.4, 3, 8.8);
    // Central maintenance booth blocks every raw spawn-to-spawn ray while preserving flanks around both sides.
    addBox(materials.concrete, 0, 1.55, -9.5, 10.8, 3.1, 1.35);

    // A Main / A Mid approach pieces. Bombsite volume itself stays clear for planting.
    addBox(containerRust, -21.5, 1.35, 3.8, 5, 2.7, 2.3);
    addBox(materials.concrete, -12.5, 0.68, -1.5, 3.8, 1.36, 2.1);
    addBox(materials.dark, -26.4, 1.5, -8, 1.2, 3, 11.5);
    addBox(materials.concrete, -23, 1.2, -14.4, 4, 2.4, 1.2);
    addBox(materials.concrete, -17, 1.2, -14.4, 4, 2.4, 1.2);

    // B Main / B Mid feed a readable L-shaped container hall, not a maze.
    addBox(containerBlue, 21.5, 1.35, 3.8, 5, 2.7, 2.3);
    addBox(materials.concrete, 12.5, 0.68, -1.5, 3.8, 1.36, 2.1);
    addBox(materials.dark, 14.1, 1.55, -8, 1.2, 3.1, 11.5);
    addBox(materials.dark, 25.9, 1.55, -8, 1.2, 3.1, 11.5);
    addBox(containerBlue, 17, 1.35, -14.4, 4, 2.7, 1.2);
    addBox(containerRust, 23, 1.35, -14.4, 4, 2.7, 1.2);
    addBox(rail, 20, 5.4, -8, 13.2, 0.22, 13.5, 0, false);
    for (const x of [14.2, 20, 25.8]) addBox(rail, x, 2.8, -8, 0.16, 5.4, 13.2, 0, false);

    // Defender backline and connectors stay separated enough to make rotations meaningful.
    addBox(materials.steel, -10, 1.35, -22.2, 8, 2.7, 1.4);
    addBox(materials.steel, 10, 1.35, -22.2, 8, 2.7, 1.4);
    addBox(materials.concrete, 0, 0.62, -15.5, 4.4, 1.24, 1.5);

    // Yellow crane is a visual landmark only, not a climbable sightline.
    addBox(materials.accent, -28.2, 4.8, -7.5, 0.35, 9.6, 0.35, 0, false);
    addBox(materials.accent, -24.5, 8.8, -7.5, 7.8, 0.3, 0.35, 0, false);
    addBox(materials.accent, -21.2, 7.1, -7.5, 0.18, 3.4, 0.18, 0, false);
  }

  // Surface dressing follows existing cover, preserving all routes and spawn balance.
  const ivory = new THREE.MeshStandardMaterial({ color: 0xd8d9c8, roughness: 0.8 });
  const trim = new THREE.MeshStandardMaterial({ color: 0x465c65, roughness: 0.55, metalness: 0.28 });
  const lampMaterial = new THREE.MeshBasicMaterial({ color: 0xffe4aa });
  const coverSurfaces = colliders.filter(c => c.maxX - c.minX > 1 && c.maxZ - c.minZ > 0.8);
  for (const c of mapId === 'iron-divide' ? coverSurfaces : []) {
    const w = c.maxX - c.minX, d = c.maxZ - c.minZ, h = c.maxY ?? 2;
    const x = (c.minX + c.maxX) / 2, z = (c.minZ + c.maxZ) / 2;
    const paint = z > 0 ? materials.viper : materials.raven;
    // Corner protectors, upper seams, and inset panels give flat blocks a freight-yard identity.
    for (const side of [-1, 1]) {
      addBox(trim, x, h - 0.09, z + side * (d / 2 + 0.014), w, 0.12, 0.025, 0, false);
      addBox(paint, x, h * 0.7, z + side * (d / 2 + 0.029), w * 0.84, 0.18, 0.025, 0, false);
      for (const edge of [-1, 1])
        addBox(ivory, x + edge * (w / 2 - 0.07), h / 2, z + side * (d / 2 + 0.028), 0.09, h - 0.12, 0.03, 0, false);
    }
    if (h > 2) {
      for (let rib = -d / 2 + 0.22; rib < d / 2 - 0.12; rib += 0.38)
        for (const side of [-1, 1])
          addBox(trim, x + side * (w / 2 + 0.014), h / 2, z + rib, 0.032, h - 0.32, 0.045, 0, false);
    }
  }

  for (const side of [-1, 1]) {
    // Perimeter maintenance rails, light housings, and drainage grilles.
    if (side > 0) for (const x of [-23.7, 23.7]) {
      for (const zz of [-27, -12, 0, 12, 27]) {
        addBox(trim, x, 2.8, zz, 0.24, 0.42, 1.4, 0, false);
        addBox(lampMaterial, x - Math.sign(x) * 0.13, 2.8, zz, 0.03, 0.12, 1.1, 0, false);
      }
      addBox(ivory, x, 0.38, 0, 0.05, 0.09, 65, 0, false);
      // One set per edge.
      if (side > 0) for (let zz = -30; zz <= 30; zz += 1.2)
        addBox(trim, x - Math.sign(x) * 0.7, 0.018, zz, 0.55, 0.024, 0.075, 0, false);
    }
    for (const x of [-16, 0, 16]) {
      for (let zz = 25; zz < 33; zz += 1.3)
        addBox(ivory, x, 0.015, side * zz, 0.85, 0.025, 0.2, 0, false);
    }
  }
  for (const z of mapId === 'iron-divide' ? [-21, 0, 21] : []) {
    for (const x of [-18, -6, 6, 18]) {
      addBox(trim, x, 7.35, z, 1.4, 0.2, 0.65, 0, false);
      addBox(lampMaterial, x, 7.23, z, 1.15, 0.03, 0.42, 0, false);
    }
  }
  // Distant storage halls belong to Iron Divide only.
  for (const side of [-1, 1]) for (const z of mapId === 'iron-divide' ? [-25, -8, 10, 27] : []) {
    const x = side * 32;
    addBox(materials.concrete, x, 3.5, z, 12, 7, 13, 0, false);
    addBox(trim, x, 7.1, z, 12.5, 0.22, 13.5, 0, false);
    for (const dz of [-4, 0, 4]) {
      addBox(materials.viper, x - side * 6.02, 4.8, z + dz, 0.04, 1.3, 2.4, 0, false);
      addBox(trim, x, 7.5, z + dz, 1.2, 0.8, 1.4, 0, false);
    }
  }

  if (mapId === 'lockgate') {
    const warning = new THREE.MeshBasicMaterial({ color: 0xc9a34d, transparent: true, opacity: .5, depthWrite: false });
    for (const x of [-16, 0, 16]) for (const z of [-29, 29]) {
      const pad = new THREE.Mesh(new THREE.PlaneGeometry(5.2, .08), warning);
      pad.rotation.x = -Math.PI / 2;
      pad.position.set(x, .022, z);
      scene.add(pad);
    }
    for (const z of [-20, -8, 8, 20]) {
      addCylinder(materials.dark, 25.6, 1.1, z, .18, 2.4, 12, Math.PI / 2);
      addBox(materials.accent, 24.7, .22, z, .65, .44, .28, 0, false);
    }
    addBox(materials.dark, 31.8, .72, -9, 4.8, 1.44, 15, 0, false);
    addBox(materials.concrete, 31.8, 1.65, -9, 5.2, .24, 10.5, 0, false);
    for (const side of [-1, 1]) for (const x of [-20, -12, 12, 20])
      addBox(materials.dark, x, .025, side * 22.2, 1.4, .035, .14, 0, false);
  }

  for (const [material, batch] of batches) {
    for (const [castShadow, matrices] of [
      [true, batch.shadow],
      [false, batch.noShadow],
    ] as const) {
      if (!matrices.length) continue;
      const mesh = new THREE.InstancedMesh(unitBox, material, matrices.length);
      matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
      // Decorative trim, lamps, drains and distant landmarks do not need to be
      // rendered again into the dynamic shadow map. Gameplay-solid cover keeps
      // shadows, preserving depth cues while cutting shadow-pass vertex work.
      mesh.castShadow = castShadow;
      mesh.receiveShadow = true;
      mesh.computeBoundingSphere();
      scene.add(mesh);
    }
  }

  const visuals = {
    setQuality(_preset: { rainCount: number; shadowMapSize: number }) {},
    update(_dt: number) {},
    dispose() {},
  };

  // Dry-weather floor accents add depth without reflective puddles or rain clutter.
  const floorAccent = new THREE.MeshBasicMaterial({
    color: 0xd6c77e,
    transparent: true,
    opacity: 0.1,
    depthWrite: false,
  });
  for (const x of [-17, -6, 6, 17]) {
    for (const z of [-12, 12]) {
      const marker = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.32, 24), floorAccent);
      marker.scale.set(1.65, 0.72, 1);
      marker.rotation.x = -Math.PI / 2;
      marker.position.set(x, 0.018, z);
      scene.add(marker);
    }
  }

  const teamSpawns: Record<Team, { x: number; z: number; yaw: number }[]> =
    mapId === 'drax-docks'
      ? {
          viper: DRAX_DOCKS_LAYOUT.attackerSpawns.map((spawn) => ({ ...spawn })),
          raven: DRAX_DOCKS_LAYOUT.defenderSpawns.map((spawn) => ({ ...spawn })),
        }
      : mapId === 'lockgate'
      ? {
          viper: LOCKGATE_LAYOUT.spawns.viper.map((spawn) => ({ ...spawn })),
          raven: LOCKGATE_LAYOUT.spawns.raven.map((spawn) => ({ ...spawn })),
        }
      : {
      viper: [
        { x: -15, z: 29, yaw: 0 },
        { x: -5, z: 29, yaw: 0 },
        { x: 5, z: 29, yaw: 0 },
        { x: 15, z: 29, yaw: 0 },
      ],
      raven: [
        { x: 15, z: -29, yaw: Math.PI },
        { x: 5, z: -29, yaw: Math.PI },
        { x: -5, z: -29, yaw: Math.PI },
        { x: -15, z: -29, yaw: Math.PI },
      ],
    };

  const coverNodes = [
    { x: -16, z: -17 },
    { x: 0, z: -17 },
    { x: 16, z: -17 },
    { x: -16, z: -10 },
    { x: -4, z: -10 },
    { x: 4, z: -10 },
    { x: 16, z: -10 },
    { x: -19, z: -6 },
    { x: -10, z: -3 },
    { x: 10, z: -3 },
    { x: 19, z: -6 },
    { x: -19, z: 6 },
    { x: -10, z: 3 },
    { x: 10, z: 3 },
    { x: 19, z: 6 },
    { x: -16, z: 10 },
    { x: -4, z: 10 },
    { x: 4, z: 10 },
    { x: 16, z: 10 },
    { x: -16, z: 17 },
    { x: 0, z: 17 },
    { x: 16, z: 17 },
  ];

  return {
    colliders,
    groundMaterial,
    teamSpawns,
    coverNodes: (mapId === 'iron-divide'
      ? coverNodes
      : mapId === 'lockgate'
        ? LOCKGATE_LAYOUT.coverNodes.map((node) => ({ ...node }))
        : mapId === 'drax-docks'
          ? DRAX_DOCKS_LAYOUT.navigationNodes.map((node) => ({ x: node.x, z: node.z }))
          : [-20, -14, -4, 4, 14, 20].flatMap((x) =>
              [-19, -7, 0, 7, 19].map((z) => ({ x, z })),
            )
    ).filter((p) =>
      !colliders.some(
        (c) =>
          p.x + 0.5 > c.minX &&
          p.x - 0.5 < c.maxX &&
          p.z + 0.5 > c.minZ &&
          p.z - 0.5 < c.maxZ,
      ),
    ),
    sideSpawns:
      mapId === 'drax-docks'
        ? {
            attackers: DRAX_DOCKS_LAYOUT.attackerSpawns.map((spawn) => ({ ...spawn })),
            defenders: DRAX_DOCKS_LAYOUT.defenderSpawns.map((spawn) => ({ ...spawn })),
          }
        : null,
    bombsites: mapId === 'drax-docks' ? DRAX_DOCKS_LAYOUT.bombsites : [],
    objectiveNodes:
      mapId === 'drax-docks' ? DRAX_DOCKS_LAYOUT.navigationNodes : [],
    callouts: mapId === 'drax-docks' ? DRAX_DOCKS_LAYOUT.calloutZones : [],
    bounds,
    setQuality(preset: { rainCount: number; shadowMapSize: number }) {
      // rainCount remains in the preset contract for backwards compatibility; weather is now clear.
      void preset.rainCount;
      if (moon.shadow.mapSize.x !== preset.shadowMapSize) {
        moon.shadow.mapSize.set(preset.shadowMapSize, preset.shadowMapSize);
        moon.shadow.map?.dispose();
        moon.shadow.map = null;
      }
      visuals.setQuality(preset);
    },
    update(dt: number) {
      visuals.update(dt);
    },
    dispose() {
      visuals.dispose();
    },
  };
}

