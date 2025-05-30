import { Box3 as Z, Matrix4 as D, BatchedMesh as d, Frustum as nt, Vector3 as T, Sphere as O, Mesh as st, Ray as ot, DataTexture as rt, WebGLUtils as it, ColorManagement as z, NoColorSpace as W, FloatType as at, UnsignedIntType as ct, IntType as ht, RGBAFormat as ut, RGBAIntegerFormat as lt, RGFormat as ft, RGIntegerFormat as mt, RedFormat as dt, RedIntegerFormat as pt, BufferAttribute as gt, BufferGeometry as xt } from "three";
import { BVH as yt, HybridBuilder as _t, WebGLCoordinateSystem as wt, WebGPUCoordinateSystem as It, vec3ToArray as j, box3ToArray as V } from "./bvh.js";
import { radixSort as bt } from "./SortUtils.js";
import { MeshoptSimplifier as q } from "./meshoptimizer.js";
class St {
  /**
   * @param target The target `BatchedMesh`.
   * @param margin The margin applied for bounding box calculations (default is 0).
   * @param accurateCulling Flag to enable accurate frustum culling without considering margin (default is true).
   */
  constructor(t, e, n = 0, s = !0) {
    this.nodesMap = /* @__PURE__ */ new Map(), this.target = t, this.accurateCulling = s, this._margin = n, this.bvh = new yt(new _t(), e === 2e3 ? wt : It), this._origin = new Float32Array(3), this._dir = new Float32Array(3), this._cameraPos = new Float32Array(3);
  }
  /**
   * Builds the BVH from the target mesh's instances using a top-down construction method.
   * This approach is more efficient and accurate compared to incremental methods, which add one instance at a time.
   */
  create() {
    const t = this.target.instanceCount, e = this.target._instanceInfo.length, n = this.target._instanceInfo, s = new Array(t), o = new Uint32Array(t);
    let i = 0;
    this.clear();
    for (let a = 0; a < e; a++)
      n[a].active && (s[i] = this.getBox(a, new Float32Array(6)), o[i] = a, i++);
    this.bvh.createFromArray(o, s, (a) => {
      this.nodesMap.set(a.object, a);
    }, this._margin);
  }
  /**
   * Inserts an instance into the BVH.
   * @param id The id of the instance to insert.
   */
  insert(t) {
    const e = this.bvh.insert(t, this.getBox(t, new Float32Array(6)), this._margin);
    this.nodesMap.set(t, e);
  }
  /**
   * Inserts a range of instances into the BVH.
   * @param ids An array of ids to insert.
   */
  insertRange(t) {
    const e = t.length, n = new Array(e);
    for (let s = 0; s < e; s++)
      n[s] = this.getBox(t[s], new Float32Array(6));
    this.bvh.insertRange(t, n, this._margin, (s) => {
      this.nodesMap.set(s.object, s);
    });
  }
  /**
   * Moves an instance within the BVH.
   * @param id The id of the instance to move.
   */
  move(t) {
    const e = this.nodesMap.get(t);
    e && (this.getBox(t, e.box), this.bvh.move(e, this._margin));
  }
  /**
   * Deletes an instance from the BVH.
   * @param id The id of the instance to delete.
   */
  delete(t) {
    const e = this.nodesMap.get(t);
    e && (this.bvh.delete(e), this.nodesMap.delete(t));
  }
  /**
   * Clears the BVH.
   */
  clear() {
    this.bvh.clear(), this.nodesMap.clear();
  }
  /**
   * Performs frustum culling to determine which instances are visible based on the provided projection matrix.
   * @param projScreenMatrix The projection screen matrix for frustum culling.
   * @param onFrustumIntersection Callback function invoked when an instance intersects the frustum.
   */
  frustumCulling(t, e) {
    this._margin > 0 && this.accurateCulling ? this.bvh.frustumCulling(t.elements, (n, s, o) => {
      s.isIntersectedMargin(n.box, o, this._margin) && e(n);
    }) : this.bvh.frustumCulling(t.elements, e);
  }
  /**
   * Performs raycasting to check if a ray intersects any instances.
   * @param raycaster The raycaster used for raycasting.
   * @param onIntersection Callback function invoked when a ray intersects an instance.
   */
  raycast(t, e) {
    const n = t.ray, s = this._origin, o = this._dir;
    j(n.origin, s), j(n.direction, o), this.bvh.rayIntersections(o, s, e, t.near, t.far);
  }
  /**
   * Checks if a given box intersects with any instance bounding box.
   * @param target The target bounding box.
   * @param onIntersection Callback function invoked when an intersection occurs.
   * @returns `True` if there is an intersection, otherwise `false`.
   */
  intersectBox(t, e) {
    this._boxArray || (this._boxArray = new Float32Array(6));
    const n = this._boxArray;
    return V(t, n), this.bvh.intersectsBox(n, e);
  }
  getBox(t, e) {
    const n = this.target, s = n._instanceInfo[t].geometryIndex;
    return n.getBoundingBoxAt(s, k).applyMatrix4(n.getMatrixAt(t, vt)), V(k, e), e;
  }
}
const k = new Z(), vt = new D();
d.prototype.computeBVH = function(r, t = {}) {
  this.bvh = new St(this, r, t.margin, t.accurateCulling), this.bvh.create();
};
class At {
  constructor() {
    this.array = [], this.pool = [];
  }
  /**
   * Adds a new render item to the list.
   * @param instanceId The unique instance id of the render item.
   * @param depth The depth value used for sorting or determining the rendering order.
   * @param start TODO.
   * @param count TODO.
   */
  push(t, e, n, s) {
    const o = this.pool, i = this.array, a = i.length;
    a >= o.length && o.push({ index: null, start: null, count: null, depth: null, depthSort: null });
    const c = o[a];
    c.index = t, c.start = n, c.count = s, c.depth = e, i.push(c);
  }
  /**
   * Resets the render list by clearing the array.
   */
  reset() {
    this.array.length = 0;
  }
}
function Wt(r) {
  const t = {
    get: (e) => e.depthSort,
    aux: new Array(r.maxInstanceCount),
    reversed: null
  };
  return function(n) {
    t.reversed = r.material.transparent, r.maxInstanceCount > t.aux.length && (t.aux.length = r.maxInstanceCount);
    let s = 1 / 0, o = -1 / 0;
    for (const { depth: c } of n)
      c > o && (o = c), c < s && (s = c);
    const i = o - s, a = (2 ** 32 - 1) / i;
    for (const c of n)
      c.depthSort = (c.depth - s) * a;
    bt(n, t);
  };
}
function Ct(r, t) {
  return r.depth - t.depth;
}
function Ut(r, t) {
  return t.depth - r.depth;
}
const Y = new nt(), S = new At(), R = new D(), F = new D(), B = new T(), E = new T(), G = new T(), Tt = new T(), M = new O();
d.prototype.onBeforeRender = function(r, t, e, n, s, o) {
  this.performFrustumCulling(e);
};
d.prototype.performFrustumCulling = function(r, t = r) {
  !this._visibilityChanged && !this.perObjectFrustumCulled && !this.sortObjects || (this.frustumCulling(r, t), this._indirectTexture.needsUpdate = !0, this._visibilityChanged = !1);
};
d.prototype.frustumCulling = function(r, t) {
  const e = this.sortObjects, n = this.perObjectFrustumCulled;
  if (!n && !e) {
    this.updateIndexArray();
    return;
  }
  if (F.copy(this.matrixWorld).invert(), E.setFromMatrixPosition(r.matrixWorld).applyMatrix4(F), G.setFromMatrixPosition(t.matrixWorld).applyMatrix4(F), B.set(0, 0, -1).transformDirection(r.matrixWorld).transformDirection(F), n ? (R.multiplyMatrices(r.projectionMatrix, r.matrixWorldInverse).multiply(this.matrixWorld), this.bvh ? this.BVHCulling(r, t) : this.linearCulling(r, t)) : this.updateRenderList(), e) {
    const s = this.geometry.getIndex(), o = s === null ? 1 : s.array.BYTES_PER_ELEMENT, i = this._multiDrawStarts, a = this._multiDrawCounts, c = this._indirectTexture.image.data, f = this.customSort;
    f === null ? S.array.sort(this.material.transparent ? Ut : Ct) : f(S.array);
    const h = S.array, l = h.length;
    for (let u = 0; u < l; u++) {
      const m = h[u];
      i[u] = m.start * o, a[u] = m.count, c[u] = m.index;
    }
    S.reset();
  }
};
d.prototype.updateIndexArray = function() {
  if (!this._visibilityChanged) return;
  const r = this.geometry.getIndex(), t = r === null ? 1 : r.array.BYTES_PER_ELEMENT, e = this._instanceInfo, n = this._geometryInfo, s = this._multiDrawStarts, o = this._multiDrawCounts, i = this._indirectTexture.image.data;
  let a = 0;
  for (let c = 0, f = e.length; c < f; c++) {
    const h = e[c];
    if (h.visible && h.active) {
      const l = h.geometryIndex, u = n[l];
      s[a] = u.start * t, o[a] = u.count, i[a] = c, a++;
    }
  }
  this._multiDrawCount = a;
};
d.prototype.updateRenderList = function() {
  const r = this._instanceInfo, t = this._geometryInfo;
  for (let e = 0, n = r.length; e < n; e++) {
    const s = r[e];
    if (s.visible && s.active) {
      const o = s.geometryIndex, i = t[o], a = this.getPositionAt(e).sub(E).dot(B);
      S.push(e, a, i.start, i.count);
    }
  }
  this._multiDrawCount = S.array.length;
};
d.prototype.BVHCulling = function(r, t) {
  const e = this.geometry.getIndex(), n = e === null ? 1 : e.array.BYTES_PER_ELEMENT, s = this._instanceInfo, o = this._geometryInfo, i = this.sortObjects, a = this._multiDrawStarts, c = this._multiDrawCounts, f = this._indirectTexture.image.data, h = this.onFrustumEnter;
  let l = 0;
  this.bvh.frustumCulling(R, (u) => {
    const m = u.object, p = s[m];
    if (!p.visible) return;
    const g = p.geometryIndex, x = o[g], y = x.LOD;
    let _, w;
    if (y) {
      const v = this.getPositionAt(m).distanceToSquared(G), A = this.getLODIndex(y, v);
      if (h && !h(m, r, t, A)) return;
      _ = y[A].start, w = y[A].count;
    } else {
      if (h && !h(m, r)) return;
      _ = x.start, w = x.count;
    }
    if (i) {
      const v = this.getPositionAt(m).sub(E).dot(B);
      S.push(m, v, _, w);
    } else
      a[l] = _ * n, c[l] = w, f[l] = m, l++;
  }), this._multiDrawCount = i ? S.array.length : l;
};
d.prototype.linearCulling = function(r, t) {
  const e = this.geometry.getIndex(), n = e === null ? 1 : e.array.BYTES_PER_ELEMENT, s = this._instanceInfo, o = this._geometryInfo, i = this.sortObjects, a = this._multiDrawStarts, c = this._multiDrawCounts, f = this._indirectTexture.image.data, h = this.onFrustumEnter;
  let l = 0;
  Y.setFromProjectionMatrix(R);
  for (let u = 0, m = s.length; u < m; u++) {
    const p = s[u];
    if (!p.visible || !p.active) continue;
    const g = p.geometryIndex, x = o[g], y = x.LOD;
    let _, w;
    const v = x.boundingSphere, A = v.radius, C = v.center;
    if (C.x === 0 && C.y === 0 && C.z === 0) {
      const b = this.getPositionAndMaxScaleOnAxisAt(u, M.center);
      M.radius = A * b;
    } else
      this.applyMatrixAtToSphere(u, M, C, A);
    if (Y.intersectsSphere(M)) {
      if (y) {
        const b = M.center.distanceToSquared(G), U = this.getLODIndex(y, b);
        if (h && !h(u, r, t, U)) continue;
        _ = y[U].start, w = y[U].count;
      } else {
        if (h && !h(u, r)) continue;
        _ = x.start, w = x.count;
      }
      if (i) {
        const b = Tt.subVectors(M.center, E).dot(B);
        S.push(u, b, _, w);
      } else
        a[l] = _ * n, c[l] = w, f[l] = u, l++;
    }
  }
  this._multiDrawCount = i ? S.array.length : l;
};
const Mt = new T();
d.prototype.getPositionAt = function(r, t = Mt) {
  const e = r * 16, n = this._matricesTexture.image.data;
  return t.x = n[e + 12], t.y = n[e + 13], t.z = n[e + 14], t;
};
d.prototype.getPositionAndMaxScaleOnAxisAt = function(r, t) {
  const e = r * 16, n = this._matricesTexture.image.data, s = n[e + 0], o = n[e + 1], i = n[e + 2], a = s * s + o * o + i * i, c = n[e + 4], f = n[e + 5], h = n[e + 6], l = c * c + f * f + h * h, u = n[e + 8], m = n[e + 9], p = n[e + 10], g = u * u + m * m + p * p;
  return t.x = n[e + 12], t.y = n[e + 13], t.z = n[e + 14], Math.sqrt(Math.max(a, l, g));
};
d.prototype.applyMatrixAtToSphere = function(r, t, e, n) {
  const s = r * 16, o = this._matricesTexture.image.data, i = o[s + 0], a = o[s + 1], c = o[s + 2], f = o[s + 3], h = o[s + 4], l = o[s + 5], u = o[s + 6], m = o[s + 7], p = o[s + 8], g = o[s + 9], x = o[s + 10], y = o[s + 11], _ = o[s + 12], w = o[s + 13], v = o[s + 14], A = o[s + 15], C = t.center, L = e.x, b = e.y, U = e.z, $ = 1 / (f * L + m * b + y * U + A);
  C.x = (i * L + h * b + p * U + _) * $, C.y = (a * L + l * b + g * U + w) * $, C.z = (c * L + u * b + x * U + v) * $;
  const Q = i * i + a * a + c * c, tt = h * h + l * l + u * u, et = p * p + g * g + x * x;
  t.radius = n * Math.sqrt(Math.max(Q, tt, et));
};
d.prototype.addGeometryLOD = function(r, t, e, n = 0) {
  const s = this._geometryInfo[r];
  e = e ** 2, s.LOD ?? (s.LOD = [{ start: s.start, count: s.count, distance: 0, hysteresis: 0 }]);
  const o = s.LOD, i = o[o.length - 1], a = i.start + i.count, c = t.index.count;
  if (a - s.start + c > s.reservedIndexCount)
    throw new Error("BatchedMesh LOD: Reserved space request exceeds the maximum buffer size.");
  o.push({ start: a, count: c, distance: e, hysteresis: n });
  const f = t.getIndex().array, h = this.geometry.getIndex(), l = h.array, u = s.vertexStart;
  for (let m = 0; m < c; m++)
    l[a + m] = f[m] + u;
  h.needsUpdate = !0;
};
d.prototype.getLODIndex = function(r, t) {
  for (let e = r.length - 1; e > 0; e--) {
    const n = r[e], s = n.distance - n.distance * n.hysteresis;
    if (t >= s) return e;
  }
  return 0;
};
const P = [], I = new st(), Lt = new ot(), N = new T(), H = new T(), K = new D(), X = new O();
d.prototype.raycast = function(r, t) {
  var i, a;
  if (!this.material || this.instanceCount === 0) return;
  I.geometry = this.geometry, I.material = this.material, (i = I.geometry).boundingBox ?? (i.boundingBox = new Z()), (a = I.geometry).boundingSphere ?? (a.boundingSphere = new O());
  const e = r.ray, n = r.near, s = r.far;
  K.copy(this.matrixWorld).invert(), H.setFromMatrixScale(this.matrixWorld), N.copy(r.ray.direction).multiply(H);
  const o = N.length();
  r.ray = Lt.copy(r.ray).applyMatrix4(K), r.near /= o, r.far /= o, this.raycastInstances(r, t), r.ray = e, r.near = n, r.far = s;
};
d.prototype.raycastInstances = function(r, t) {
  if (this.bvh)
    this.bvh.raycast(r, (e) => this.checkObjectIntersection(r, e, t));
  else {
    if (this.boundingSphere === null && this.computeBoundingSphere(), X.copy(this.boundingSphere), !r.ray.intersectsSphere(X)) return;
    for (let e = 0, n = this._instanceInfo.length; e < n; e++)
      this.checkObjectIntersection(r, e, t);
  }
};
d.prototype.checkObjectIntersection = function(r, t, e) {
  const n = this._instanceInfo[t];
  if (!n.active || !n.visible) return;
  const s = n.geometryIndex, o = this._geometryInfo[s];
  this.getMatrixAt(t, I.matrixWorld), I.geometry.boundsTree = this.boundsTrees ? this.boundsTrees[s] : void 0, I.geometry.boundsTree || (this.getBoundingBoxAt(s, I.geometry.boundingBox), this.getBoundingSphereAt(s, I.geometry.boundingSphere), I.geometry.setDrawRange(o.start, o.count)), I.raycast(r, P);
  for (const i of P)
    i.batchId = t, i.object = this, e.push(i);
  P.length = 0;
};
function J(r, t) {
  return Math.max(t, Math.ceil(Math.sqrt(r / t)) * t);
}
function Ft(r, t, e, n) {
  t === 3 && (console.warn('"channels" cannot be 3. Set to 4. More info: https://github.com/mrdoob/three.js/pull/23228'), t = 4);
  const s = J(n, e), o = new r(s * s * t), i = r.name.includes("Float"), a = r.name.includes("Uint"), c = i ? at : a ? ct : ht;
  let f;
  switch (t) {
    case 1:
      f = i ? dt : pt;
      break;
    case 2:
      f = i ? ft : mt;
      break;
    case 4:
      f = i ? ut : lt;
      break;
  }
  return { array: o, size: s, type: c, format: f };
}
class Dt extends rt {
  /**
   * @param arrayType The constructor for the TypedArray.
   * @param channels The number of channels in the texture.
   * @param pixelsPerInstance The number of pixels required for each instance.
   * @param capacity The total number of instances.
   * @param uniformMap Optional map for handling uniform values.
   * @param fetchInFragmentShader Optional flag that determines if uniform values should be fetched in the fragment shader instead of the vertex shader.
   */
  constructor(t, e, n, s, o, i) {
    e === 3 && (e = 4);
    const { array: a, format: c, size: f, type: h } = Ft(t, e, n, s);
    super(a, f, f, c, h), this.partialUpdate = !0, this.maxUpdateCalls = 1 / 0, this._utils = null, this._needsUpdate = !1, this._lastWidth = null, this._data = a, this._channels = e, this._pixelsPerInstance = n, this._stride = n * e, this._rowToUpdate = new Array(f), this._uniformMap = o, this._fetchUniformsInFragmentShader = i, this.needsUpdate = !0;
  }
  /**
   * Resizes the texture to accommodate a new number of instances.
   * @param count The new total number of instances.
   */
  resize(t) {
    const e = J(t, this._pixelsPerInstance);
    if (e === this.image.width) return;
    const n = this._data, s = this._channels;
    this._rowToUpdate.length = e;
    const o = n.constructor, i = new o(e * e * s), a = Math.min(n.length, i.length);
    i.set(new o(n.buffer, 0, a)), this.dispose(), this.image = { data: i, height: e, width: e }, this._data = i;
  }
  /**
   * Marks a row of the texture for update during the next render cycle.
   * This helps in optimizing texture updates by only modifying the rows that have changed.
   * @param index The index of the instance to update.
   */
  enqueueUpdate(t) {
    if (this._needsUpdate = !0, !this.partialUpdate) return;
    const e = this.image.width / this._pixelsPerInstance, n = Math.floor(t / e);
    this._rowToUpdate[n] = !0;
  }
  /**
   * Updates the texture data based on the rows that need updating.
   * This method is optimized to only update the rows that have changed, improving performance.
   * @param renderer The WebGLRenderer used for rendering.
   */
  update(t) {
    const e = t.properties.get(this), n = this.version > 0 && e.__version !== this.version, s = this._lastWidth !== null && this._lastWidth !== this.image.width;
    if (!this._needsUpdate || !e.__webglTexture || n || s) {
      this._lastWidth = this.image.width, this._needsUpdate = !1;
      return;
    }
    if (this._needsUpdate = !1, !this.partialUpdate) {
      this.needsUpdate = !0;
      return;
    }
    const o = this.getUpdateRowsInfo();
    o.length !== 0 && (o.length > this.maxUpdateCalls ? this.needsUpdate = !0 : this.updateRows(e, t, o), this._rowToUpdate.fill(!1));
  }
  // TODO reuse same objects to prevent memory leak
  getUpdateRowsInfo() {
    const t = this._rowToUpdate, e = [];
    for (let n = 0, s = t.length; n < s; n++)
      if (t[n]) {
        const o = n;
        for (; n < s && t[n]; n++)
          ;
        e.push({ row: o, count: n - o });
      }
    return e;
  }
  updateRows(t, e, n) {
    const s = e.state, o = e.getContext();
    this._utils ?? (this._utils = new it(o, e.extensions, e.capabilities));
    const i = this._utils.convert(this.format), a = this._utils.convert(this.type), { data: c, width: f } = this.image, h = this._channels;
    s.bindTexture(o.TEXTURE_2D, t.__webglTexture);
    const l = z.getPrimaries(z.workingColorSpace), u = this.colorSpace === W ? null : z.getPrimaries(this.colorSpace), m = this.colorSpace === W || l === u ? o.NONE : o.BROWSER_DEFAULT_WEBGL;
    o.pixelStorei(o.UNPACK_FLIP_Y_WEBGL, this.flipY), o.pixelStorei(o.UNPACK_PREMULTIPLY_ALPHA_WEBGL, this.premultiplyAlpha), o.pixelStorei(o.UNPACK_ALIGNMENT, this.unpackAlignment), o.pixelStorei(o.UNPACK_COLORSPACE_CONVERSION_WEBGL, m);
    for (const { count: p, row: g } of n)
      o.texSubImage2D(o.TEXTURE_2D, 0, 0, g, f, p, i, a, c, g * f * h);
    this.onUpdate && this.onUpdate(this);
  }
  /**
   * Sets a uniform value at the specified instance ID in the texture.
   * @param id The instance ID to set the uniform for.
   * @param name The name of the uniform.
   * @param value The value to set for the uniform.
   */
  setUniformAt(t, e, n) {
    const { offset: s, size: o } = this._uniformMap.get(e), i = this._stride;
    o === 1 ? this._data[t * i + s] = n : n.toArray(this._data, t * i + s);
  }
  /**
   * Retrieves a uniform value at the specified instance ID from the texture.
   * @param id The instance ID to retrieve the uniform from.
   * @param name The name of the uniform.
   * @param target Optional target object to store the uniform value.
   * @returns The uniform value for the specified instance.
   */
  getUniformAt(t, e, n) {
    const { offset: s, size: o } = this._uniformMap.get(e), i = this._stride;
    return o === 1 ? this._data[t * i + s] : n.fromArray(this._data, t * i + s);
  }
  /**
   * Generates the GLSL code for accessing the uniform data stored in the texture.
   * @param textureName The name of the texture in the GLSL shader.
   * @param indexName The name of the index in the GLSL shader.
   * @param indexType The type of the index in the GLSL shader.
   * @returns An object containing the GLSL code for the vertex and fragment shaders.
   */
  getUniformsGLSL(t, e, n) {
    const s = this.getUniformsVertexGLSL(t, e, n), o = this.getUniformsFragmentGLSL(t, e, n);
    return { vertex: s, fragment: o };
  }
  getUniformsVertexGLSL(t, e, n) {
    if (this._fetchUniformsInFragmentShader)
      return `
        flat varying ${n} ez_v${e}; 
        void main() {
          ez_v${e} = ${e};`;
    const s = this.texelsFetchGLSL(t, e), o = this.getFromTexelsGLSL(), { assignVarying: i, declareVarying: a } = this.getVarying();
    return `
      uniform highp sampler2D ${t};  
      ${a}
      void main() {
        ${s}
        ${o}
        ${i}`;
  }
  getUniformsFragmentGLSL(t, e, n) {
    if (!this._fetchUniformsInFragmentShader) {
      const { declareVarying: i, getVarying: a } = this.getVarying();
      return `
      ${i}
      void main() {
        ${a}`;
    }
    const s = this.texelsFetchGLSL(t, `ez_v${e}`), o = this.getFromTexelsGLSL();
    return `
      uniform highp sampler2D ${t};  
      flat varying ${n} ez_v${e};
      void main() {
        ${s}
        ${o}`;
  }
  texelsFetchGLSL(t, e) {
    const n = this._pixelsPerInstance;
    let s = `
      int size = textureSize(${t}, 0).x;
      int j = int(${e}) * ${n};
      int x = j % size;
      int y = j / size;
    `;
    for (let o = 0; o < n; o++)
      s += `vec4 ez_texel${o} = texelFetch(${t}, ivec2(x + ${o}, y), 0);
`;
    return s;
  }
  getFromTexelsGLSL() {
    const t = this._uniformMap;
    let e = "";
    for (const [n, { type: s, offset: o, size: i }] of t) {
      const a = Math.floor(o / this._channels);
      if (s === "mat3")
        e += `mat3 ${n} = mat3(ez_texel${a}.rgb, vec3(ez_texel${a}.a, ez_texel${a + 1}.rg), vec3(ez_texel${a + 1}.ba, ez_texel${a + 2}.r));
`;
      else if (s === "mat4")
        e += `mat4 ${n} = mat4(ez_texel${a}, ez_texel${a + 1}, ez_texel${a + 2}, ez_texel${a + 3});
`;
      else {
        const c = this.getUniformComponents(o, i);
        e += `${s} ${n} = ez_texel${a}.${c};
`;
      }
    }
    return e;
  }
  getVarying() {
    const t = this._uniformMap;
    let e = "", n = "", s = "";
    for (const [o, { type: i }] of t)
      e += `flat varying ${i} ez_v${o};
`, n += `ez_v${o} = ${o};
`, s += `${i} ${o} = ez_v${o};
`;
    return { declareVarying: e, assignVarying: n, getVarying: s };
  }
  getUniformComponents(t, e) {
    const n = t % this._channels;
    let s = "";
    for (let o = 0; o < e; o++)
      s += Bt[n + o];
    return s;
  }
  copy(t) {
    return super.copy(t), this.partialUpdate = t.partialUpdate, this.maxUpdateCalls = t.maxUpdateCalls, this._channels = t._channels, this._pixelsPerInstance = t._pixelsPerInstance, this._stride = t._stride, this._rowToUpdate = t._rowToUpdate, this._uniformMap = t._uniformMap, this._fetchUniformsInFragmentShader = t._fetchUniformsInFragmentShader, this;
  }
}
const Bt = ["r", "g", "b", "a"];
d.prototype.getUniformAt = function(r, t, e) {
  if (!this.uniformsTexture)
    throw new Error(`Before get/set uniform, it's necessary to use "initUniformsPerInstance".`);
  return this.uniformsTexture.getUniformAt(r, t, e);
};
d.prototype.setUniformAt = function(r, t, e) {
  if (!this.uniformsTexture)
    throw new Error(`Before get/set uniform, it's necessary to use "initUniformsPerInstance".`);
  this.uniformsTexture.setUniformAt(r, t, e), this.uniformsTexture.enqueueUpdate(r);
};
d.prototype.initUniformsPerInstance = function(r) {
  const { channels: t, pixelsPerInstance: e, uniformMap: n, fetchInFragmentShader: s } = this.getUniformSchemaResult(r);
  this.uniformsTexture = new Dt(Float32Array, t, e, this.maxInstanceCount, n, s);
};
d.prototype.getUniformSchemaResult = function(r) {
  let t = 0;
  const e = /* @__PURE__ */ new Map(), n = [], s = r.vertex ?? {}, o = r.fragment ?? {};
  let i = !0;
  for (const h in s) {
    const l = s[h], u = this.getUniformSize(l);
    t += u, n.push({ name: h, type: l, size: u }), i = !1;
  }
  for (const h in o)
    if (!s[h]) {
      const l = o[h], u = this.getUniformSize(l);
      t += u, n.push({ name: h, type: l, size: u });
    }
  n.sort((h, l) => l.size - h.size);
  const a = [];
  for (const { name: h, size: l, type: u } of n) {
    const m = this.getUniformOffset(l, a);
    e.set(h, { offset: m, size: l, type: u });
  }
  const c = Math.ceil(t / 4);
  return { channels: Math.min(t, 4), pixelsPerInstance: c, uniformMap: e, fetchInFragmentShader: i };
};
d.prototype.getUniformOffset = function(r, t) {
  if (r < 4) {
    for (let n = 0; n < t.length; n++)
      if (t[n] + r <= 4) {
        const s = n * 4 + t[n];
        return t[n] += r, s;
      }
  }
  const e = t.length * 4;
  for (; r > 0; r -= 4)
    t.push(r);
  return e;
};
d.prototype.getUniformSize = function(r) {
  switch (r) {
    case "float":
      return 1;
    case "vec2":
      return 2;
    case "vec3":
      return 3;
    case "vec4":
      return 4;
    case "mat3":
      return 9;
    case "mat4":
      return 16;
    default:
      throw new Error(`Invalid uniform type: ${r}`);
  }
};
function jt(r) {
  const t = r.material, e = t.onBeforeCompile.bind(t);
  t.onBeforeCompile = (n, s) => {
    if (r.uniformsTexture) {
      n.uniforms.uniformsTexture = { value: r.uniformsTexture };
      const { vertex: o, fragment: i } = r.uniformsTexture.getUniformsGLSL("uniformsTexture", "batchIndex", "float");
      n.vertexShader = n.vertexShader.replace("void main() {", o), n.fragmentShader = n.fragmentShader.replace("void main() {", i), n.vertexShader = n.vertexShader.replace("void main() {", "void main() { float batchIndex = getIndirectIndex( gl_DrawID );");
    }
    e(n, s);
  };
}
async function Et(r, t, e) {
  await q.ready;
  const n = [];
  e.lockBorder && n.push("LockBorder"), e.sparse && n.push("Sparse"), e.errorAbsolute && n.push("ErrorAbsolute"), e.prune && n.push("Prune");
  const s = 3 * Math.floor(e.ratio * (r.length / 3)), o = q.simplify(r, t, 3, s, e.error, n);
  return e.logAppearanceError && console.log(`Meshoptimizer simplification error factor: ${o[1]}`), e.optimizeMemory && t.length / 3 <= 65535 && console.error("optimizeMemory not implemented yet. TODO"), o;
}
async function Vt(r, t) {
  const e = [];
  for (let n = 0; n < r.length; n++) {
    const s = r[n], o = [s], i = Array.isArray(t[n]) ? t[n] : t;
    for (const a of i)
      o.push(await $t(s, a));
    e.push(o);
  }
  return e;
}
async function $t(r, t) {
  if (!r.index) throw new Error("Non-indexed geometries are not currently supported.");
  if (r.groups.length > 0) throw new Error("Geometry groups are not currently supported.");
  const e = zt(r), n = r.index.array, s = r.attributes.position.array, [o] = await Et(n, s, t);
  return e.setIndex(new gt(o, 1)), e;
}
function zt(r) {
  const t = new xt();
  return t.attributes = r.attributes, t.morphAttributes = r.morphAttributes, t.morphTargetsRelative = r.morphTargetsRelative, t.name = r.name, t.boundingBox = r.boundingBox, t.boundingSphere = r.boundingSphere, t.userData = r.userData, t;
}
function qt(r) {
  let t = 0, e = 0;
  for (const n of r)
    t += n.attributes.position.count, e += n.index.count;
  return { vertexCount: t, indexCount: e };
}
function kt(r) {
  const t = [];
  let e = 0, n = 0;
  for (const s of r) {
    let o = 0;
    for (const i of s) {
      const a = i.index.count;
      n += a, o += a, e += i.attributes.position.count;
    }
    t.push(o);
  }
  return { vertexCount: e, indexCount: n, LODIndexCount: t };
}
export {
  St as BatchedMeshBVH,
  At as MultiDrawRenderList,
  Dt as SquareDataTexture,
  Wt as createRadixSort,
  qt as getBatchedMeshCount,
  kt as getBatchedMeshLODCount,
  Ft as getSquareTextureInfo,
  J as getSquareTextureSize,
  jt as patchBatchedMesh,
  Et as simplify,
  Vt as simplifyGeometries,
  $t as simplifyGeometry,
  Ct as sortOpaque,
  Ut as sortTransparent
};
//# sourceMappingURL=webgl.js.map
