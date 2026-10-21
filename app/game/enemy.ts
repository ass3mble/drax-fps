import type * as ThreeType from 'three';
import type { HitZone } from './weapons';
let operatorTemplate: ThreeType.Group | undefined;
let templateEngine: typeof ThreeType | undefined;

export function createEnemy(
  THREE: typeof ThreeType,
  scene: ThreeType.Scene,
  x: number,
  z: number,
  index: number,
  team: 'viper' | 'raven' = 'raven',
) {
  if (!operatorTemplate || templateEngine !== THREE) {
    templateEngine = THREE;
    const root = new THREE.Group();
    root.name = 'operator';
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#d3d6cc';
    ctx.fillRect(0, 0, 128, 128);
    let s = 8193;
    const rng = () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
    for (let i = 0; i < 5000; i++) {
      const shade = 60 + Math.floor(rng() * 100);
      ctx.fillStyle = `rgba(${shade},${shade + 3},${shade + 1},.17)`;
      ctx.fillRect(rng() * 128, rng() * 128, rng() * 3 + 0.2, rng() * 2 + 0.2);
    }
    for (let i = 0; i < 55; i++) {
      ctx.fillStyle = i % 3 === 0 ? 'rgba(23,32,33,.18)' : 'rgba(75,82,75,.13)';
      ctx.beginPath();
      const px = rng() * 128,
        py = rng() * 128;
      ctx.ellipse(px, py, rng() * 12 + 2, rng() * 4 + 1, rng() * 6.28, 0, 6.28);
      ctx.fill();
    }
    const fabricTex = new THREE.CanvasTexture(c);
    fabricTex.colorSpace = THREE.SRGBColorSpace;
    fabricTex.wrapS = fabricTex.wrapT = THREE.RepeatWrapping;
    fabricTex.repeat.set(2, 2);
    fabricTex.anisotropy = 4;
    const cloth = new THREE.MeshStandardMaterial({
      color: 0xbac4ae,
      emissive: 0x101916,
      emissiveIntensity: 0.4,
      map: fabricTex,
      roughness: 0.74,
      metalness: 0.02,
    });
    const armor = new THREE.MeshStandardMaterial({
      color: 0x9fa995,
      emissive: 0x101714,
      emissiveIntensity: 0.3,
      map: fabricTex,
      roughness: 0.64,
      metalness: 0.06,
    });
    const pouch = new THREE.MeshStandardMaterial({
      color: 0x95a188,
      emissive: 0x11170f,
      emissiveIntensity: 0.08,
      map: fabricTex,
      roughness: 0.86,
      metalness: 0.01,
    });
    const seam = new THREE.MeshStandardMaterial({
      color: 0x4b5753,
      roughness: 0.84,
    });
    const boot = new THREE.MeshStandardMaterial({
      color: 0x465154,
      roughness: 0.64,
      metalness: 0.03,
    });
    const gun = new THREE.MeshStandardMaterial({
      color: 0x4b5558,
      roughness: 0.39,
      metalness: 0.74,
    });
    const gunDark = new THREE.MeshStandardMaterial({
      color: 0x293236,
      roughness: 0.5,
      metalness: 0.48,
    });
    const metal = new THREE.MeshStandardMaterial({
      color: 0x87918a,
      roughness: 0.41,
      metalness: 0.76,
    });
    const visor = new THREE.MeshStandardMaterial({
      color: 0x4b5550,
      roughness: 0.18,
      metalness: 0.72,
    });
    const orange = new THREE.MeshStandardMaterial({
      color: 0xd57a43,
      emissive: 0x431b0d,
      emissiveIntensity: 0.22,
      map: fabricTex,
      roughness: 0.8,
    });
    cloth.name = 'uniform';
    armor.name = 'armor';
    orange.name = 'team-patch';
    const skin = new THREE.MeshStandardMaterial({
      color: 0xd0aa89,
      emissive: 0x1b120d,
      emissiveIntensity: 0.06,
      roughness: 0.82,
    });
    const unitBox = new THREE.BoxGeometry(1, 1, 1),
      unitCylinder = new THREE.CylinderGeometry(1, 1, 1, 10),
      sphere = new THREE.SphereGeometry(1, 12, 8);
    type Bins = Map<ThreeType.Material, ThreeType.BufferGeometry[]>;
    const bins = new Map<ThreeType.Group, Bins>();
    const object = new THREE.Object3D();
    const put = (
      parent: ThreeType.Group,
      geo: ThreeType.BufferGeometry,
      material: ThreeType.Material,
      px: number,
      py: number,
      pz: number,
      sx = 1,
      sy = 1,
      sz = 1,
      rx = 0,
      ry = 0,
      rz = 0,
    ) => {
      object.position.set(px, py, pz);
      object.rotation.set(rx, ry, rz);
      object.scale.set(sx, sy, sz);
      object.updateMatrix();
      const g = geo.clone().applyMatrix4(object.matrix);
      let b = bins.get(parent);
      if (!b) {
        b = new Map();
        bins.set(parent, b);
      }
      let geometries = b.get(material);
      if (!geometries) {
        geometries = [];
        b.set(material, geometries);
      }
      geometries.push(g);
    };
    const box = (
      p: ThreeType.Group,
      m: ThreeType.Material,
      xx: number,
      yy: number,
      zz: number,
      w: number,
      h: number,
      d: number,
      rx = 0,
      ry = 0,
      rz = 0,
    ) => put(p, unitBox, m, xx, yy, zz, w, h, d, rx, ry, rz);
    const ellipsoid = (
      p: ThreeType.Group,
      m: ThreeType.Material,
      xx: number,
      yy: number,
      zz: number,
      w: number,
      h: number,
      d: number,
    ) => put(p, sphere, m, xx, yy, zz, w, h, d);
    function roundedBox(w: number, h: number, d: number, round = 0.018) {
      const r = Math.min(round, w * 0.24, h * 0.24, d * 0.24),
        shape = new THREE.Shape();
      shape.moveTo(-w / 2 + r, -h / 2);
      shape.lineTo(w / 2 - r, -h / 2);
      shape.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
      shape.lineTo(w / 2, h / 2 - r);
      shape.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
      shape.lineTo(-w / 2 + r, h / 2);
      shape.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
      shape.lineTo(-w / 2, -h / 2 + r);
      shape.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
      const g = new THREE.ExtrudeGeometry(shape, {
        depth: d - 2 * r,
        bevelEnabled: true,
        bevelSegments: 1,
        steps: 1,
        bevelSize: r * 0.6,
        bevelThickness: r,
        curveSegments: 3,
      });
      g.translate(0, 0, -d / 2 + r);
      return g;
    }
    const rb = (
      p: ThreeType.Group,
      m: ThreeType.Material,
      xx: number,
      yy: number,
      zz: number,
      w: number,
      h: number,
      d: number,
      r = 0.018,
      rx = 0,
      ry = 0,
      rz = 0,
    ) => {
      const g = roundedBox(w, h, d, r);
      put(p, g, m, xx, yy, zz, 1, 1, 1, rx, ry, rz);
      g.dispose();
    };
    const limb = (
      p: ThreeType.Group,
      m: ThreeType.Material,
      a: ThreeType.Vector3,
      b: ThreeType.Vector3,
      upperRadius: number,
      lowerRadius: number,
    ) => {
      const v = b.clone().sub(a);
      const g = new THREE.CylinderGeometry(
        upperRadius,
        lowerRadius,
        v.length(),
        10,
        1,
      );
      const q = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        v.clone().normalize(),
      );
      const matrix = new THREE.Matrix4().compose(
        a.clone().addScaledVector(v, 0.5),
        q,
        new THREE.Vector3(1, 1, 1),
      );
      g.applyMatrix4(matrix);
      let entries = bins.get(p);
      if (!entries) {
        entries = new Map();
        bins.set(p, entries);
      }
      let list = entries.get(m);
      if (!list) {
        list = [];
        entries.set(m, list);
      }
      list.push(g);
    };
    const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

    const torso = new THREE.Group();
    torso.name = 'torso';
    root.add(torso);
    // Rounded fabric shoulders, natural taper and a separate armored chest.
    ellipsoid(torso, cloth, 0, 1.205, 0, 0.218, 0.284, 0.139);
    rb(torso, armor, 0, 1.234, 0.063, 0.385, 0.375, 0.24, 0.033);
    rb(torso, armor, 0, 1.235, -0.109, 0.37, 0.385, 0.12, 0.025);
    rb(torso, cloth, 0, 0.944, 0, 0.343, 0.182, 0.218, 0.025);
    box(torso, seam, 0, 0.996, 0.02, 0.36, 0.059, 0.265);
    rb(torso, metal, 0.035, 0.998, 0.162, 0.052, 0.041, 0.02, 0.006);
    for (const side of [-1, 1]) {
      box(torso, pouch, side * 0.154, 1.435, -0.001, 0.074, 0.03, 0.235);
      box(torso, seam, side * 0.155, 1.359, 0.192, 0.055, 0.13, 0.024);
      rb(torso, pouch, side * 0.115, 1.128, 0.202, 0.099, 0.176, 0.07, 0.01);
      box(torso, armor, side * 0.115, 1.168, 0.246, 0.09, 0.04, 0.017);
      box(torso, seam, side * 0.115, 1.088, 0.247, 0.078, 0.011, 0.015);
      rb(torso, pouch, side * 0.224, 1.08, 0.021, 0.064, 0.152, 0.141, 0.008);
      box(torso, seam, side * 0.202, 1.019, 0, 0.038, 0.058, 0.29);
    }
    rb(torso, pouch, 0, 1.132, 0.205, 0.092, 0.178, 0.07, 0.01);
    for (const yy of [1.294, 1.322, 1.35])
      box(torso, pouch, 0, yy, 0.195, 0.286, 0.012, 0.015);
    // Upper chest patch, pull tabs and radio hardware make the silhouette read as equipment.
    rb(torso, seam, -0.085, 1.371, 0.205, 0.1, 0.052, 0.012, 0.004);
    box(torso, orange, -0.087, 1.372, 0.213, 0.065, 0.012, 0.007);
    rb(torso, gunDark, 0.17, 1.326, -0.148, 0.082, 0.186, 0.057, 0.006);
    put(
      torso,
      unitCylinder,
      seam,
      0.181,
      1.531,
      -0.15,
      0.004,
      0.233,
      0.004,
      0,
      0,
      -0.08,
    );
    for (let i = 0; i < 6; i++)
      box(torso, gun, 0.17, 1.28 + i * 0.015, -0.18, 0.047, 0.003, 0.006);
    rb(torso, armor, 0, 1.25, -0.192, 0.222, 0.305, 0.112, 0.021);
    for (const xx of [-0.082, 0.082])
      box(torso, seam, xx, 1.25, -0.254, 0.023, 0.26, 0.011);
    ellipsoid(torso, cloth, 0, 1.466, -0.016, 0.089, 0.09, 0.078);

    const head = new THREE.Group();
    head.name = 'head';
    root.add(head);
    ellipsoid(head, seam, 0, 1.596, 0.014, 0.103, 0.139, 0.097);
    ellipsoid(head, skin, 0, 1.59, 0.092, 0.076, 0.055, 0.026);
    rb(head, seam, 0, 1.553, 0.092, 0.152, 0.092, 0.04, 0.016);
    ellipsoid(head, seam, 0, 1.51, 0.04, 0.086, 0.031, 0.062);
    // Helmet is a low rounded shell with a brow, mount and rear retention webbing.
    ellipsoid(head, armor, 0, 1.704, -0.01, 0.135, 0.107, 0.139);
    rb(head, armor, 0, 1.658, 0.013, 0.246, 0.047, 0.232, 0.012);
    rb(head, seam, 0, 1.63, 0.107, 0.194, 0.068, 0.04, 0.012);
    for (const side of [-1, 1]) {
      rb(
        head,
        visor,
        side * 0.047,
        1.636,
        0.135,
        0.078,
        0.045,
        0.014,
        0.01,
        0,
        side * 0.1,
        0,
      );
      rb(
        head,
        gunDark,
        side * 0.125,
        1.641,
        -0.037,
        0.025,
        0.061,
        0.135,
        0.006,
      );
      ellipsoid(head, seam, side * 0.103, 1.573, 0.006, 0.029, 0.066, 0.045);
      box(
        head,
        seam,
        side * 0.094,
        1.539,
        0.026,
        0.011,
        0.075,
        0.013,
        0,
        0,
        side * -0.26,
      );
    }
    rb(head, gun, 0, 1.713, 0.127, 0.049, 0.048, 0.023, 0.006);
    box(head, armor, 0, 1.761, -0.022, 0.034, 0.015, 0.18);
    box(head, seam, 0, 1.707, -0.145, 0.156, 0.028, 0.013);

    for (const side of [-1, 1]) {
      const leg = new THREE.Group();
      leg.name = side < 0 ? 'legL' : 'legR';
      leg.position.set(side * 0.103, 0.924, 0);
      root.add(leg);
      limb(
        leg,
        cloth,
        V(0, -0.025, 0),
        V(side * 0.012, -0.387, 0.012),
        0.088,
        0.105,
      );
      ellipsoid(leg, cloth, 0, -0.029, 0, 0.112, 0.118, 0.12);
      rb(leg, pouch, side * 0.079, -0.205, 0.02, 0.056, 0.15, 0.112, 0.012);
      for (const yy of [-0.17, -0.23])
        box(leg, seam, side * 0.109, yy, 0.022, 0.015, 0.01, 0.105);
      const shin = new THREE.Group();
      shin.name = 'shin';
      shin.position.set(side * 0.01, -0.39, 0.02);
      leg.add(shin);
      ellipsoid(shin, cloth, 0, 0, 0, 0.09, 0.104, 0.092);
      rb(shin, boot, 0, 0.002, 0.086, 0.125, 0.128, 0.045, 0.022, 0.1);
      box(shin, seam, 0, 0.017, -0.069, 0.151, 0.033, 0.022);
      limb(
        shin,
        cloth,
        V(0, -0.036, -0.006),
        V(0, -0.342, -0.006),
        0.064,
        0.079,
      );
      for (const yy of [-0.2, -0.275])
        ellipsoid(shin, cloth, 0, yy, -0.003, 0.073, 0.027, 0.078);
      rb(shin, boot, 0, -0.345, 0.013, 0.135, 0.155, 0.16, 0.023);
      rb(shin, boot, 0, -0.44, 0.058, 0.143, 0.115, 0.266, 0.03);
      rb(shin, seam, 0, -0.482, 0.056, 0.151, 0.031, 0.273, 0.007);
      for (let k = 0; k < 5; k++)
        box(
          shin,
          cloth,
          0,
          -0.361 - k * 0.012,
          0.104 + k * 0.006,
          0.068,
          0.009,
          0.014,
        );
      box(shin, seam, 0, -0.353, -0.076, 0.045, 0.083, 0.016);
    }

    function arm(side: number) {
      const g = new THREE.Group();
      g.name = side < 0 ? 'armL' : 'armR';
      g.position.set(side * 0.225, 1.374, 0);
      torso.add(g);
      const shoulder = V(0, 0, 0),
        elbow = V(side * 0.083, -0.264, 0.093),
        wrist = side > 0 ? V(-0.073, -0.086, 0.302) : V(0.342, -0.082, 0.564);
      ellipsoid(g, cloth, 0, -0.025, 0, 0.101, 0.112, 0.11);
      limb(g, cloth, shoulder, elbow, 0.077, 0.091);
      ellipsoid(g, cloth, elbow.x, elbow.y, elbow.z, 0.079, 0.084, 0.078);
      limb(g, cloth, elbow, wrist, 0.065, 0.071);
      rb(
        g,
        boot,
        elbow.x,
        elbow.y - 0.014,
        elbow.z - 0.049,
        0.108,
        0.103,
        0.035,
        0.018,
      );
      rb(g, armor, side * 0.061, -0.041, 0.018, 0.051, 0.111, 0.12, 0.009);
      rb(g, orange, side * 0.09, -0.035, 0.03, 0.016, 0.051, 0.083, 0.003);
      ellipsoid(g, boot, wrist.x, wrist.y, wrist.z, 0.05, 0.058, 0.056);
      for (let k = 0; k < 3; k++)
        rb(
          g,
          boot,
          wrist.x - 0.03 + k * 0.021,
          wrist.y - 0.037,
          wrist.z + 0.023,
          0.019,
          0.034,
          0.036,
          0.005,
        );
      return g;
    }
    arm(-1);
    arm(1);
    // Carbine correctly shouldered on the right, barrel running along local +Z.
    const rifle = new THREE.Group();
    rifle.name = 'rifle';
    rifle.position.set(0.153, 1.31, 0.104);
    torso.add(rifle);
    rb(rifle, gunDark, 0, -0.01, 0.023, 0.067, 0.103, 0.164, 0.009);
    rb(rifle, boot, 0, -0.012, -0.065, 0.083, 0.132, 0.036, 0.005);
    rb(rifle, gun, 0, 0, 0.247, 0.063, 0.102, 0.294, 0.008);
    rb(rifle, gun, 0, 0.007, 0.49, 0.058, 0.075, 0.223, 0.006);
    rb(rifle, gunDark, 0, -0.088, 0.268, 0.052, 0.141, 0.102, 0.006, -0.12);
    rb(rifle, boot, 0, -0.086, 0.169, 0.047, 0.102, 0.053, 0.005, -0.24);
    box(rifle, gunDark, 0, -0.067, 0.217, 0.013, 0.049, 0.058);
    put(
      rifle,
      unitCylinder,
      gunDark,
      0,
      0.014,
      0.696,
      0.014,
      0.202,
      0.014,
      Math.PI / 2,
    );
    put(
      rifle,
      unitCylinder,
      gun,
      0,
      0.014,
      0.798,
      0.022,
      0.052,
      0.022,
      Math.PI / 2,
    );
    box(rifle, gunDark, 0, 0.064, 0.361, 0.034, 0.014, 0.459);
    for (let k = 0; k < 15; k++)
      box(rifle, gun, 0, 0.074, 0.166 + k * 0.024, 0.049, 0.007, 0.008);
    rb(rifle, gunDark, 0, 0.105, 0.242, 0.04, 0.067, 0.06, 0.005);
    rb(rifle, gunDark, 0, 0.058, 0.599, 0.013, 0.086, 0.017, 0.003);
    for (const side of [-1, 1])
      for (let k = 0; k < 5; k++)
        box(
          rifle,
          gunDark,
          side * 0.031,
          0.008,
          0.419 + k * 0.034,
          0.005,
          0.034,
          0.021,
        );
    rb(rifle, metal, 0.033, 0.01, 0.278, 0.005, 0.035, 0.066, 0.002);
    rb(rifle, gunDark, 0.05, -0.016, 0.526, 0.025, 0.03, 0.096, 0.005);
    // Sling stays close to the operator rather than floating across the scene.
    limb(
      torso,
      seam,
      V(0.145, 1.302, 0.095),
      V(-0.174, 1.412, -0.001),
      0.012,
      0.012,
    );
    limb(
      torso,
      seam,
      V(-0.174, 1.412, -0.001),
      V(-0.145, 1.029, 0.139),
      0.012,
      0.012,
    );

    // Merge each articulated part by material; clones share all resulting GPU geometry.
    for (const [parent, materials] of bins)
      for (const [material, source] of materials) {
        const geometries = source.map((g) => (g.index ? g.toNonIndexed() : g));
        const count = geometries.reduce(
          (total, g) => total + g.attributes.position.count,
          0,
        );
        const positions = new Float32Array(count * 3),
          normals = new Float32Array(count * 3),
          uvs = new Float32Array(count * 2);
        let offset = 0;
        for (const g of geometries) {
          positions.set(g.attributes.position.array, offset * 3);
          normals.set(g.attributes.normal.array, offset * 3);
          if (g.attributes.uv) uvs.set(g.attributes.uv.array, offset * 2);
          offset += g.attributes.position.count;
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute(
          'position',
          new THREE.BufferAttribute(positions, 3),
        );
        geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
        geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
        geometry.computeBoundingSphere();
        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        parent.add(mesh);
        source.forEach((g) => g.dispose());
        geometries.forEach((g, i) => {
          if (g !== source[i]) g.dispose();
        });
      }
    const flashGeo = new THREE.ConeGeometry(0.065, 0.21, 6, 1, true);
    flashGeo.rotateX(Math.PI / 2);
    const flash = new THREE.Mesh(
      flashGeo,
      new THREE.MeshBasicMaterial({
        color: 0xffce7c,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    flash.name = 'flash';
    flash.position.set(0, 0.014, 0.94);
    flash.visible = false;
    rifle.add(flash);
    operatorTemplate = root;
  }
  const group = operatorTemplate.clone(true);
  const teamMaterials = new Map<ThreeType.Material, ThreeType.Material>();
  group.traverse((object) => {
    if (!(object instanceof THREE.Mesh) || Array.isArray(object.material)) return;
    const original = object.material as ThreeType.MeshStandardMaterial;
    if (!['uniform', 'armor', 'team-patch'].includes(original.name)) return;
    if (!teamMaterials.has(original)) {
      const material = original.clone();
      if (original.name === 'uniform') material.color.setHex(team === 'viper' ? 0x648b93 : 0x9b7458);
      if (original.name === 'armor') material.color.setHex(team === 'viper' ? 0x8bb6ba : 0xc29267);
      if (original.name === 'team-patch') {
        material.color.setHex(team === 'viper' ? 0x6ee5f3 : 0xffa364);
        material.emissive.setHex(team === 'viper' ? 0x214c56 : 0x613319);
        material.emissiveIntensity = 0.45;
      }
      // A small view-dependent rim keeps the animated silhouette legible in shade.
      // Depth testing remains normal: this does not reveal enemies through walls.
      material.onBeforeCompile = shader => {
        shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>', `
          float readabilityRim = pow(1.0 - max(dot(normalize(normal), normalize(vViewPosition)), 0.0), 3.0);
          outgoingLight += vec3(${team === 'viper' ? '0.13, 0.29, 0.32' : '0.35, 0.21, 0.10'}) * readabilityRim;
          #include <opaque_fragment>`);
      };
      material.customProgramCacheKey = () => `drax-fps-rim-${team}`;
      teamMaterials.set(original, material);
    }
    object.material = teamMaterials.get(original)!;
  });
  group.position.set(x, 0, z);
  group.userData.enemyIndex = index;
  scene.add(group);
  const legs = [
    group.getObjectByName('legL')!,
    group.getObjectByName('legR')!,
  ] as ThreeType.Group[];
  const arms = [
    group.getObjectByName('armL')!,
    group.getObjectByName('armR')!,
  ] as ThreeType.Group[];
  const torso = group.getObjectByName('torso')!,
    head = group.getObjectByName('head')!,
    flash = group.getObjectByName('flash')!;
  const hitMeshes: ThreeType.Mesh[] = [];
  // Hit the rendered animated silhouette, not oversized proxy boxes. Equipment
  // carried in the rifle group cannot trigger damage or a hit marker.
  group.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    let parent: ThreeType.Object3D | null = object.parent;
    let zone: 'head' | 'torso' | 'arm' | 'leg' | undefined;
    while (parent && parent !== group) {
      if (parent.name === 'rifle') return;
      if (parent.name === 'head') zone = 'head';
      if (parent.name === 'torso') zone ??= 'torso';
      if (parent.name.startsWith('arm')) zone = 'arm';
      if (parent.name.startsWith('leg') || parent.name === 'shin') zone = 'leg';
      parent = parent.parent;
    }
    if (!zone) return;
    object.userData.zone = zone;
    object.userData.head = zone === 'head';
    hitMeshes.push(object);
  });
  const offset = index * 1.713;
  let speedBlend = 0;
  let strafeBlend = 0;
  let forwardBlend = 0;
  let previousTime = 0;
  let gaitPhase = offset;
  let aimBlend = 0;
  let shotKick = 0;
  let turnBlend = 0;
  // The custom operator is the authoritative bot model. Body, both hands and
  // rifle live in the same hierarchy, so weapon alignment cannot drift because
  // of an unrelated imported skeleton or animation rig.
  const rifle = group.getObjectByName('rifle')!;
  const rifleBasePosition = rifle.position.clone();
  const rifleBaseRotation = rifle.rotation.clone();
  const rifleBaseScale = rifle.scale.clone();
  return {
    group,
    hitMeshes,
    hitZone(hit: ThreeType.Intersection): HitZone {
      const zone = hit.object.userData.zone;
      if (zone === 'head') return 'head';
      if (zone === 'arm') return 'arm';
      if (zone === 'leg') {
        const local = hit.object.parent!.worldToLocal(hit.point.clone());
        return hit.object.parent!.name === 'shin' && local.y < -0.34 ? 'foot' : 'leg';
      }
      const local = torso.worldToLocal(hit.point.clone());
      return local.y < 1.12 ? 'stomach' : 'chest';
    },
    dispose() {
      for (const material of teamMaterials.values()) material.dispose();
    },
    legs,
    arms,
    flash,
    update(
      time: number,
      moving: boolean,
      dead: number,
      motion: {
        speed?: number;
        strafe?: number;
        forward?: number;
        aiming?: boolean;
        firing?: boolean;
        turn?: number;
      } = {},
    ) {
      const animationDt =
        previousTime > 0
          ? Math.min(0.05, Math.max(1 / 240, time - previousTime))
          : 1 / 60;
      previousTime = time;
      const smooth = (rate: number) => 1 - Math.exp(-animationDt * rate);
      turnBlend = THREE.MathUtils.lerp(
        turnBlend,
        THREE.MathUtils.clamp(motion.turn ?? 0, -1, 1),
        smooth(8),
      );
      aimBlend = THREE.MathUtils.lerp(
        aimBlend,
        motion.aiming ? 1 : 0,
        smooth(10),
      );
      // Custom locomotion keeps the weapon and both hands in one rig. Recoil
      // moves only the rifle a few centimetres and never re-parents it.
      shotKick = motion.firing
        ? THREE.MathUtils.lerp(shotKick, 1, smooth(24))
        : THREE.MathUtils.lerp(shotKick, 0, smooth(14));
      rifle.position.copy(rifleBasePosition);
      rifle.position.z -= shotKick * .055;
      rifle.rotation.copy(rifleBaseRotation);
      rifle.rotation.x -= shotKick * .08;
      rifle.scale.copy(rifleBaseScale);
      const targetSpeed = moving
        ? THREE.MathUtils.clamp(motion.speed ?? 1, 0, 1.2)
        : 0;
      speedBlend = THREE.MathUtils.lerp(
        speedBlend,
        targetSpeed,
        smooth(moving ? 11 : 7),
      );
      strafeBlend = THREE.MathUtils.lerp(
        strafeBlend,
        moving ? THREE.MathUtils.clamp(motion.strafe ?? 0, -1, 1) : 0,
        smooth(9),
      );
      forwardBlend = THREE.MathUtils.lerp(
        forwardBlend,
        moving ? THREE.MathUtils.clamp(motion.forward ?? 1, -1, 1) : 0,
        smooth(9),
      );

      gaitPhase += animationDt * (2.7 + speedBlend * 7.8);
      const phase = gaitPhase;
      const stride = 0.43 * speedBlend;
      const lean = strafeBlend * speedBlend;
      const drive = forwardBlend * speedBlend;
      const gaitWave = Math.sin(phase);
      const idleBreath = Math.sin(time * 1.55 + offset);
      const turnLean = turnBlend * (0.035 + speedBlend * 0.055);

      legs.forEach((leg, i) => {
        const legWave = Math.sin(phase + i * Math.PI);
        leg.rotation.x = THREE.MathUtils.lerp(
          leg.rotation.x,
          legWave * stride,
          smooth(18),
        );
        const shin = leg.getObjectByName('shin')!;
        shin.rotation.x = THREE.MathUtils.lerp(
          shin.rotation.x,
          Math.max(0, legWave) * 0.42 * speedBlend,
          smooth(18),
        );
        leg.rotation.z = THREE.MathUtils.lerp(
          leg.rotation.z,
          -lean * (i === 0 ? 0.05 : 0.04) - turnLean * 0.16,
          smooth(12),
        );
      });

      torso.position.y = THREE.MathUtils.lerp(
        torso.position.y,
        Math.abs(gaitWave) * 0.024 * speedBlend +
          idleBreath * 0.006 * (1 - speedBlend),
        smooth(12),
      );
      torso.rotation.x = THREE.MathUtils.lerp(
        torso.rotation.x,
        -drive * 0.07 - aimBlend * 0.025 + shotKick * 0.018,
        smooth(11),
      );
      torso.rotation.y = THREE.MathUtils.lerp(
        torso.rotation.y,
        turnBlend * 0.07,
        smooth(10),
      );
      torso.rotation.z = THREE.MathUtils.lerp(
        torso.rotation.z,
        -lean * 0.11 - turnLean,
        smooth(11),
      );

      head.position.y = THREE.MathUtils.lerp(
        head.position.y,
        torso.position.y,
        smooth(14),
      );
      head.rotation.y = THREE.MathUtils.lerp(
        head.rotation.y,
        idleBreath * 0.015 - strafeBlend * 0.025 - turnBlend * 0.045,
        smooth(9),
      );
      head.rotation.x = THREE.MathUtils.lerp(
        head.rotation.x,
        speedBlend * 0.02 - aimBlend * 0.025,
        smooth(10),
      );
      head.rotation.z = THREE.MathUtils.lerp(
        head.rotation.z,
        lean * 0.035 + turnLean * 0.35,
        smooth(10),
      );

      arms.forEach((arm, i) => {
        const counter = i === 0 ? 1 : -1;
        // Both procedural hands were authored around this exact rifle pose.
        // Keep locomotion motion subtle so the grip stays visually locked.
        const gripMotion = 1 - aimBlend * 0.9;
        const targetX =
          Math.sin(phase + i * 0.5) * 0.011 * speedBlend * gripMotion +
          idleBreath * 0.003 * (1 - speedBlend) -
          aimBlend * (i === 0 ? 0.028 : 0.021) -
          shotKick * 0.012;
        arm.rotation.x = THREE.MathUtils.lerp(
          arm.rotation.x,
          targetX,
          smooth(16),
        );
        arm.rotation.z = THREE.MathUtils.lerp(
          arm.rotation.z,
          (counter * lean * 0.01 + counter * turnBlend * 0.006) * gripMotion +
            aimBlend * (i === 0 ? -0.008 : 0.008),
          smooth(15),
        );
      });

      if (dead > 0) {
        const t = Math.min(1, dead);
        group.rotation.z = -(index % 2 ? 1 : -1) * t * 1.37;
        group.rotation.x = -t * 0.37;
        torso.position.y -= t * 0.18;
        flash.visible = false;
        legs[0].rotation.x = t * 0.38;
        legs[1].rotation.x = -t * 0.24;
        arms[0].rotation.z = t * 0.55;
        arms[1].rotation.z = -t * 0.43;
      }
    },
  };
}
