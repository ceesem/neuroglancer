/**
 * @license
 * Copyright 2017 Google Inc.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @file Facilities for drawing circles in WebGL as quads (triangle fan).
 */

import {RefCounted} from 'neuroglancer/util/disposable';
import {Buffer} from 'neuroglancer/webgl/buffer';
import {GL} from 'neuroglancer/webgl/context';
import {QuadRenderHelper} from 'neuroglancer/webgl/quad';
import {ShaderBuilder, ShaderProgram} from 'neuroglancer/webgl/shader';
import {getSquareCornersBuffer} from 'neuroglancer/webgl/square_corners_buffer';

export const VERTICES_PER_CIRCLE = 4;

export class CircleShader extends RefCounted {
  private squareCornersBuffer: Buffer;
  private quadHelper: QuadRenderHelper;

  constructor(gl: GL, public circlesPerInstance: number = 1) {
    super();
    this.squareCornersBuffer = getSquareCornersBuffer(
        gl, -1, -1, 1, 1, /*minorTiles=*/circlesPerInstance, /*majorTiles=*/1);
    this.quadHelper = this.registerDisposer(new QuadRenderHelper(gl, circlesPerInstance));
  }

  defineShader(builder: ShaderBuilder, crossSectionFade: boolean) {
    // XY corners of square ranging from [-1, -1] to [1, 1].
    builder.addAttribute('highp vec2', 'aCircleCornerOffset');

    // x and y components: The x and y radii of the point in normalized device coordinates.
    // z component: Starting point of border from [0, 1]..
    // w component: Fraction of total radius that is feathered.
    builder.addUniform('highp vec3', 'uCircleParams');

    // 2-D position within circle quad, ranging from [-1, -1] to [1, 1].
    builder.addVarying('highp vec4', 'vCircleCoord');
    builder.addVertexCode(`
void emitCircle(vec4 position, float diameter, float borderWidth) {
  gl_Position = position;
  float totalDiameter = diameter + 2.0 * (borderWidth + uCircleParams.z);
  gl_Position.xy += aCircleCornerOffset * uCircleParams.xy * gl_Position.w * totalDiameter;
  vCircleCoord.xy = aCircleCornerOffset;
  vCircleCoord.z = diameter / totalDiameter;
  vCircleCoord.w = uCircleParams.z / totalDiameter;
}
`);
    if (crossSectionFade) {
      builder.addFragmentCode(`
float getCircleAlphaMultiplier() {
  return 1.0 - 2.0 * abs(0.5 - gl_FragCoord.z);
}
`);
    } else {
      builder.addFragmentCode(`
float getCircleAlphaMultiplier() {
  return 1.0;
}
`);
    }
    builder.addFragmentCode(`
vec4 getCircleColor(vec4 interiorColor, vec4 borderColor) {
  float radius = length(vCircleCoord.xy);
  if (radius > 1.0) {
    discard;
  }

  float borderColorFraction = clamp((radius - vCircleCoord.z) / vCircleCoord.w, 0.0, 1.0);
  float feather = clamp((1.0 - radius) / vCircleCoord.w, 0.0, 1.0);
  vec4 color = mix(interiorColor, borderColor, borderColorFraction);

  return vec4(color.rgb, color.a * feather * getCircleAlphaMultiplier());
}
`);
  }

  draw(
      shader: ShaderProgram, projectionParameters: {width: number, height: number},
      options: {featherWidthInPixels: number}, count: number) {
    const {gl} = shader;
    const aCircleCornerOffset = shader.attribute('aCircleCornerOffset');
    this.squareCornersBuffer.bindToVertexAttrib(aCircleCornerOffset, /*components=*/ 2);
    gl.uniform3f(
        shader.uniform('uCircleParams'), 1 / projectionParameters.width,
        1 / projectionParameters.height, Math.max(1e-6, options.featherWidthInPixels));
    this.quadHelper.draw(gl, count);
    shader.gl.disableVertexAttribArray(aCircleCornerOffset);
  }
}
