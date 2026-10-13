import { ShaderMaterial } from "@babylonjs/core/Materials/shaderMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector4 } from "@babylonjs/core/Maths/math.vector";
import type { Matrix, Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { Texture } from "@babylonjs/core/Materials/Textures/texture";
import type { Scene } from "@babylonjs/core/scene";
import type { LayerAsset, Point } from "./types";

const projectionVertex = `
precision highp float;
attribute vec3 position;
attribute vec3 normal;
uniform mat4 world;
uniform mat4 worldViewProjection;
uniform mat4 sourceViewProjection;
varying vec4 sourcePosition;
varying vec3 surfaceNormal;
void main() {
  vec4 worldPosition = world * vec4(position, 1.0);
  sourcePosition = sourceViewProjection * worldPosition;
  surfaceNormal = normalize(mat3(world) * normal);
  gl_Position = worldViewProjection * vec4(position, 1.0);
}`;
const projectionFragment = `
precision highp float;
uniform sampler2D sourceTexture;
uniform vec4 crop;
uniform vec3 fallbackColor;
uniform vec3 towardProjector;
uniform float masked;
varying vec4 sourcePosition;
varying vec3 surfaceNormal;
void main() {
  vec2 ndc = sourcePosition.xy / sourcePosition.w;
  vec2 sourceUV = vec2(ndc.x * 0.5 + 0.5, 0.5 - ndc.y * 0.5);
  vec2 uv = (sourceUV - crop.xy) / crop.zw;
  float within = step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0);
  vec4 image = texture2D(sourceTexture, clamp(uv, 0.0, 1.0));
  if (masked > 0.5 && (within < 0.5 || image.a < 0.035)) discard;
  float facing = dot(normalize(surfaceNormal), towardProjector);
  float projectionWeight = smoothstep(0.04, 0.24, facing) * within;
  float light = 0.83 + 0.17 * max(0.0, dot(normalize(surfaceNormal), normalize(vec3(-0.6, 1.0, -0.3))));
  gl_FragColor = vec4(mix(fallbackColor * light, image.rgb, projectionWeight), 1.0);
}`;

export function createProjectionMaterial(name: string, scene: Scene, texture: Texture, matrix: Matrix, towardProjector: Vector3, size: Point, color: string, asset?: LayerAsset) {
  const material = new ShaderMaterial(name, scene, { vertexSource: projectionVertex, fragmentSource: projectionFragment }, {
    attributes: ["position", "normal"],
    uniforms: ["world", "worldViewProjection", "sourceViewProjection", "crop", "fallbackColor", "towardProjector", "masked"],
    samplers: ["sourceTexture"], needAlphaTesting: Boolean(asset),
  });
  const bounds = asset?.bounds ?? [0, 0, ...size];
  material.setMatrix("sourceViewProjection", matrix);
  material.setVector3("towardProjector", towardProjector);
  material.setColor3("fallbackColor", Color3.FromHexString(color));
  material.setVector4("crop", new Vector4(bounds[0]! / size[0], bounds[1]! / size[1],
    (bounds[2]! - bounds[0]!) / size[0], (bounds[3]! - bounds[1]!) / size[1]));
  material.setTexture("sourceTexture", texture);
  material.setFloat("masked", asset ? 1 : 0);
  material.backFaceCulling = false;
  return material;
}

export function createCardMaterial(name: string, scene: Scene, texture: Texture) {
  const material = new ShaderMaterial(name, scene, {
    vertexSource: `precision highp float;
      attribute vec3 position; attribute vec2 uv; uniform mat4 worldViewProjection; varying vec2 imageUV;
      void main() { imageUV = uv; gl_Position = worldViewProjection * vec4(position, 1.0); }`,
    fragmentSource: `precision highp float;
      uniform sampler2D imageTexture; varying vec2 imageUV;
      void main() { vec4 c = texture2D(imageTexture, imageUV); if(c.a < 0.01) discard; gl_FragColor = c; }`,
  }, { attributes: ["position", "uv"], uniforms: ["worldViewProjection"], samplers: ["imageTexture"], needAlphaBlending: true });
  material.setTexture("imageTexture", texture);
  material.backFaceCulling = false;
  return material;
}
