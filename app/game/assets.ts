import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { MapId } from './maps';

type Placement = [x: number, y: number, z: number, yaw: number, targetHeight: number];

// Optional visual art is always loaded beneath a single root after synchronous
// gameplay geometry has been created. These meshes never become colliders or
// authoritative bullet-occlusion geometry.
export function loadArenaDetails(scene: THREE.Scene, mapId: MapId) {
  let disposed = false;
  const loader = new GLTFLoader();
  const pending: Promise<void>[] = [];
  const artRoot = new THREE.Group();
  artRoot.name = 'arena-real-assets';
  scene.add(artRoot);

  const kenneyPlacements: Record<string, Placement[]> = {
    'template-wall': [], gate: [], 'template-detail': [],
  };
  for (const side of [-1, 1]) {
    for (let z = -30; z <= 30; z += 4)
      kenneyPlacements['template-wall'].push([side * 24.3, 0, z, -side * Math.PI / 2, 1]);
    kenneyPlacements.gate.push([0, 0, side * 35.3, side > 0 ? Math.PI : 0, 1.7]);
    if (mapId === 'sun-relay')
      for (const z of [-11, 11]) for (const x of [-9, 9])
        kenneyPlacements['template-detail'].push([x, 3.6, z, 0, 0.7]);
  }

  const realisticPlacements: Record<string, Placement[]> = mapId === 'drax-docks'
    ? {
        barrel_03: [
          [-27.4, 0, 18, 0.2, 0.95], [-27.1, 0, 15.8, -0.1, 0.95],
          [27.3, 0, 17.2, 0.35, 0.95], [27.2, 0, -18.4, -0.25, 0.95],
          [-25.5, 0, -20.2, 0.1, 0.95], [25.7, 0, -20.4, -0.1, 0.95],
        ],
        old_military_crate: [
          [-25.6, 0, 20.4, 0.08, 0.82], [25.6, 0, 20.2, -0.08, 0.82],
          [-27, 0, -25.5, 0.18, 0.82], [27, 0, -25.4, -0.18, 0.82],
          [-24.8, 0, 7.2, Math.PI / 2, 0.82], [24.8, 0, 7.1, Math.PI / 2, 0.82],
        ],
        plastic_container: [
          [-28, 0, 4, 0.1, 0.72], [28, 0, 4.4, -0.08, 0.72],
          [-27.8, 0, -3.8, -0.1, 0.72], [27.8, 0, -4.2, 0.08, 0.72],
        ],
        utility_box_01: [
          [-28.7, 0, 27, Math.PI / 2, 1.08], [28.7, 0, -26, -Math.PI / 2, 1.08],
        ],
        hand_truck: [[-28.3, 0, 9.5, Math.PI / 2, 1.28]],
      }
    : mapId === 'lockgate'
      ? {
          barrel_03: [[-21, 0, -18, 0, 0.95], [-21, 0, 18, 0, 0.95], [21.6, 0, -19, 0, 0.95], [21.6, 0, 19, 0, 0.95]],
          old_military_crate: [[-20, 0, -14, 0.1, 0.82], [-20, 0, 14, -0.1, 0.82], [20, 0, -15, -0.1, 0.82], [20, 0, 15, 0.1, 0.82]],
          plastic_container: [[-22, 0, -5, 0, 0.72], [22, 0, 5, 0, 0.72]],
          utility_box_01: [[-22.8, 0, -24.5, Math.PI / 2, 1.08], [22.8, 0, 24.5, -Math.PI / 2, 1.08]],
          hand_truck: [[-22.6, 0, 8.5, Math.PI / 2, 1.28]],
        }
      : {
          barrel_03: [[-22, 0, -18, 0, 0.95], [-22, 0, 18, 0, 0.95], [22, 0, -18, 0, 0.95], [22, 0, 18, 0, 0.95]],
          old_military_crate: [[-21, 0, -14, 0.15, 0.82], [-21, 0, 14, -0.15, 0.82], [21, 0, -14, -0.15, 0.82], [21, 0, 14, 0.15, 0.82]],
          plastic_container: [[-22.3, 0, -4, 0, 0.72], [22.3, 0, 4, 0, 0.72]],
          utility_box_01: [[-22.8, 0, -25.5, Math.PI / 2, 1.08], [22.8, 0, 25.5, -Math.PI / 2, 1.08]],
          hand_truck: [[-22.6, 0, 3.5, Math.PI / 2, 1.28], [22.6, 0, -3.5, -Math.PI / 2, 1.28]],
        };

  const release = (root: THREE.Object3D) => {
    root.traverse(o => {
      if (!(o instanceof THREE.Mesh)) return;
      o.geometry.dispose();
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
        for (const v of Object.values(m)) if (v instanceof THREE.Texture) v.dispose();
        m.dispose();
      }
    });
  };

  for (const [name, points] of Object.entries(kenneyPlacements)) {
    if (!points.length) continue;
    pending.push(loader.loadAsync(`/models/kenney-space/${name}.glb`).then(gltf => {
      if (disposed) { release(gltf.scene); return; }
      gltf.scene.updateMatrixWorld(true);
      gltf.scene.traverse(o => {
        if (!(o instanceof THREE.Mesh) || Array.isArray(o.material)) return;
        const material = (o.material as THREE.MeshStandardMaterial).clone();
        material.roughness = 0.85;
        material.metalness = 0.05;
        const mesh = new THREE.InstancedMesh(o.geometry, material, points.length);
        const transform = new THREE.Object3D();
        points.forEach(([x, y, z, rotation, scale], i) => {
          transform.position.set(x, y, z);
          transform.rotation.y = rotation;
          transform.scale.setScalar(scale);
          transform.updateMatrix();
          mesh.setMatrixAt(i, transform.matrix.clone().multiply(o.matrixWorld));
        });
        mesh.name = `kenney-${name}`;
        mesh.castShadow = false;
        mesh.receiveShadow = true;
        mesh.computeBoundingSphere();
        artRoot.add(mesh);
      });
    }));
  }

  for (const [name, points] of Object.entries(realisticPlacements)) {
    const url = `/models/polyhaven/${name}/${name}_1k.glb`;
    pending.push(loader.loadAsync(url).then(gltf => {
      if (disposed) { release(gltf.scene); return; }
      gltf.scene.updateMatrixWorld(true);
      const sourceBounds = new THREE.Box3().setFromObject(gltf.scene);
      const sourceSize = sourceBounds.getSize(new THREE.Vector3());
      const sourceMinY = sourceBounds.min.y;
      const height = Math.max(sourceSize.y, 0.001);
      points.forEach(([x, y, z, yaw, targetHeight], index) => {
        const clone = gltf.scene.clone(true);
        const scale = targetHeight / height;
        clone.scale.setScalar(scale);
        clone.rotation.y = yaw;
        clone.position.set(x, y - sourceMinY * scale, z);
        clone.name = `polyhaven-${name}-${index}`;
        clone.traverse(object => {
          if (!(object instanceof THREE.Mesh)) return;
          object.castShadow = true;
          object.receiveShadow = true;
          if (Array.isArray(object.material)) return;
          const material = (object.material as THREE.MeshStandardMaterial).clone();
          material.roughness = Math.max(0.5, material.roughness ?? 0.7);
          material.envMapIntensity = 0.9;
          object.material = material;
        });
        artRoot.add(clone);
      });
    }));
  }

  scene.userData.assetStatus = 'loading';
  void Promise.allSettled(pending).then(results => {
    if (disposed) return;
    const failures = results.flatMap((result, index) =>
      result.status === 'rejected' ? [`asset-${index}: ${String(result.reason)}`] : [],
    );
    scene.userData.assetFailures = failures;
    scene.userData.assetStatus = failures.length === 0 ? 'ready' : 'partial';
    if (failures.length) console.warn('Arena visual assets loaded partially', failures);
  });

  return () => {
    disposed = true;
    scene.remove(artRoot);
    release(artRoot);
  };
}
