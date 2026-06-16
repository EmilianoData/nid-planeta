#!/usr/bin/env node
/**
 * Quick GLB inspector — reads the JSON chunk of a .glb file and prints the
 * structural info we care about for wiring the avatar:
 *   - all node names (so we can find the head bone)
 *   - all mesh names (so we can find eye meshes)
 *   - all morph target names on each mesh (blink shapes)
 *   - all animation clip names
 *   - top-level material colors
 *
 * Usage: node scripts/inspect-glb.mjs public/avatars/petronius.glb
 */

import { readFileSync } from 'node:fs';

const path = process.argv[2];
if (!path) {
  console.error('usage: node scripts/inspect-glb.mjs <path-to-glb>');
  process.exit(1);
}

const buf = readFileSync(path);
const magic = buf.toString('ascii', 0, 4);
if (magic !== 'glTF') {
  console.error('Not a binary GLB (magic = "' + magic + '")');
  process.exit(1);
}

const version = buf.readUInt32LE(4);
const totalLen = buf.readUInt32LE(8);

const jsonLen = buf.readUInt32LE(12);
const jsonType = buf.toString('ascii', 16, 20);
if (jsonType !== 'JSON') {
  console.error('first chunk is not JSON, got "' + jsonType + '"');
  process.exit(1);
}

const jsonStr = buf.toString('utf8', 20, 20 + jsonLen);
const gltf = JSON.parse(jsonStr);

console.log('\n=== GLB summary ===');
console.log(`file       : ${path}`);
console.log(`version    : ${version}`);
console.log(`size       : ${(totalLen / 1024).toFixed(1)} KB`);
console.log(`json size  : ${(jsonLen / 1024).toFixed(1)} KB`);
console.log(`asset      :`, gltf.asset);

console.log('\n--- nodes (look for head bone) ---');
const nodes = gltf.nodes || [];
nodes.forEach((n, i) => {
  const role = [];
  if (n.skin !== undefined) role.push('skin');
  if (n.mesh !== undefined) role.push('mesh#' + n.mesh);
  if (n.camera !== undefined) role.push('camera');
  if (n.children?.length) role.push(`children:${n.children.length}`);
  console.log(`  [${i}] "${n.name || '<unnamed>'}"${role.length ? ' · ' + role.join(', ') : ''}`);
});

console.log('\n--- meshes ---');
const meshes = gltf.meshes || [];
meshes.forEach((m, i) => {
  console.log(`  [${i}] "${m.name || '<unnamed>'}" · ${m.primitives.length} primitive(s)`);
  if (m.extras?.targetNames) {
    console.log(`        morphs (extras.targetNames):`, m.extras.targetNames);
  }
  m.primitives.forEach((p, j) => {
    if (p.targets) {
      console.log(`        prim[${j}]: ${p.targets.length} morph target(s)`);
    }
  });
});

console.log('\n--- animations ---');
const anims = gltf.animations || [];
if (!anims.length) {
  console.log('  (none)');
} else {
  anims.forEach((a, i) => {
    console.log(`  [${i}] "${a.name || '<unnamed>'}" · ${a.channels.length} channel(s)`);
  });
}

console.log('\n--- materials ---');
const mats = gltf.materials || [];
mats.forEach((m, i) => {
  const c = m.pbrMetallicRoughness?.baseColorFactor;
  const hex = c
    ? '#' + c.slice(0, 3).map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('')
    : '(no baseColor)';
  console.log(`  [${i}] "${m.name || '<unnamed>'}" · ${hex}`);
});

console.log('\n--- skins ---');
const skins = gltf.skins || [];
if (!skins.length) {
  console.log('  (none — character is not skinned; head rotation needs a node not bound to a skin)');
} else {
  skins.forEach((s, i) => {
    console.log(`  [${i}] "${s.name || '<unnamed>'}" · ${s.joints.length} joint(s)`);
  });
}

console.log('\n');
