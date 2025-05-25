function E(e, t, i) {
  i[0] = e[0] > t[0] ? t[0] : e[0], i[1] = e[1] < t[1] ? t[1] : e[1], i[2] = e[2] > t[2] ? t[2] : e[2], i[3] = e[3] < t[3] ? t[3] : e[3], i[4] = e[4] > t[4] ? t[4] : e[4], i[5] = e[5] < t[5] ? t[5] : e[5];
}
function Z(e, t, i) {
  let n = !1;
  const r = e[0] > t[0] ? t[0] : e[0], f = e[1] < t[1] ? t[1] : e[1], s = e[2] > t[2] ? t[2] : e[2], o = e[3] < t[3] ? t[3] : e[3], l = e[4] > t[4] ? t[4] : e[4], c = e[5] < t[5] ? t[5] : e[5];
  return i[0] > r && (i[0] = r, n = !0), i[1] < f && (i[1] = f, n = !0), i[2] > s && (i[2] = s, n = !0), i[3] < o && (i[3] = o, n = !0), i[4] > l && (i[4] = l, n = !0), i[5] < c && (i[5] = c, n = !0), n;
}
function g(e, t) {
  return !(t[0] > e[0] || t[1] < e[1] || t[2] > e[2] || t[3] < e[3] || t[4] > e[4] || t[5] < e[5]);
}
function v(e, t) {
  let i = !1;
  return t[0] > e[0] && (t[0] = e[0], i = !0), t[1] < e[1] && (t[1] = e[1], i = !0), t[2] > e[2] && (t[2] = e[2], i = !0), t[3] < e[3] && (t[3] = e[3], i = !0), t[4] > e[4] && (t[4] = e[4], i = !0), t[5] < e[5] && (t[5] = e[5], i = !0), i;
}
function J(e, t) {
  t[0] > e[0] && (t[0] = e[0]), t[1] < e[1] && (t[1] = e[1]), t[2] > e[2] && (t[2] = e[2]), t[3] < e[3] && (t[3] = e[3]), t[4] > e[4] && (t[4] = e[4]), t[5] < e[5] && (t[5] = e[5]);
}
function w(e, t) {
  e[0] -= t, e[1] += t, e[2] -= t, e[3] += t, e[4] -= t, e[5] += t;
}
function S(e) {
  const t = e[1] - e[0], i = e[3] - e[2], n = e[5] - e[4];
  return 2 * (t * i + i * n + n * t);
}
function _(e, t) {
  const i = e[0] > t[0] ? t[0] : e[0], n = e[1] < t[1] ? t[1] : e[1], r = e[2] > t[2] ? t[2] : e[2], f = e[3] < t[3] ? t[3] : e[3], s = e[4] > t[4] ? t[4] : e[4], o = e[5] < t[5] ? t[5] : e[5], l = n - i, c = f - r, u = o - s;
  return 2 * (l * c + c * u + u * l);
}
function H(e) {
  const t = e[1] - e[0], i = e[3] - e[2], n = e[5] - e[4];
  return t > i ? t > n ? 0 : 2 : i > n ? 1 : 2;
}
function D(e, t) {
  const i = e[0] - t[0], n = t[0] - e[1];
  let r = i > n ? i : n;
  r < 0 && (r = 0);
  const f = e[2] - t[1], s = t[1] - e[3];
  let o = f > s ? f : s;
  o < 0 && (o = 0);
  const l = e[4] - t[2], c = t[2] - e[5];
  let u = l > c ? l : c;
  return u < 0 && (u = 0), r * r + o * o + u * u;
}
function K(e, t) {
  return Math.sqrt(D(e, t));
}
function Y(e, t) {
  let i, n, r, f, s, o;
  const l = e[0] - t[0], c = t[0] - e[1];
  l > c ? (i = l, n = c) : (i = c, n = l), i < 0 && (i = 0);
  const u = e[2] - t[1], a = t[1] - e[3];
  u > a ? (r = u, f = a) : (r = a, f = u), r < 0 && (r = 0);
  const y = e[4] - t[2], x = t[2] - e[5];
  return y > x ? (s = y, o = x) : (s = x, o = y), s < 0 && (s = 0), {
    min: i * i + r * r + s * s,
    max: n * n + f * f + o * o
  };
}
function Q(e, t) {
  const i = Y(e, t);
  return i.min = Math.sqrt(i.min), i.max = Math.sqrt(i.max), i;
}
class G {
  constructor() {
    this.array = [];
  }
  clear() {
    this.array = [];
  }
  push(t) {
    const i = this.array, n = t.inheritedCost, r = i.length > 6 ? i.length - 6 : 0;
    let f;
    for (f = i.length - 1; f >= r && !(n <= i[f].inheritedCost); f--)
      ;
    f > i.length - 7 && i.splice(f + 1, 0, t);
  }
  pop() {
    return this.array.pop();
  }
}
class $ {
  constructor(t = !1) {
    this.root = null, this._sortedList = new G(), this.count = 0, this.highPrecision = t, this._typeArray = t ? Float64Array : Float32Array;
  }
  createFromArray(t, i, n, r = 0) {
    const f = i.length, s = this._typeArray;
    s !== (i[0].BYTES_PER_ELEMENT === 4 ? Float32Array : Float64Array) && console.warn("Different precision.");
    const o = new s(6);
    let l, c;
    this.root = u(0, f, null);
    function u(d, M, h) {
      if (M === 1) {
        const C = i[d];
        r > 0 && w(C, r);
        const L = { box: C, object: t[d], parent: h };
        return n && n(L), L;
      }
      const p = a(d, M);
      y();
      let I = x(d, M);
      (I === d || I === d + M) && (I = d + (M >> 1));
      const b = { box: p, parent: h };
      return b.left = u(d, I - d, b), b.right = u(I, M - I + d, b), b;
    }
    function a(d, M) {
      const h = new s(6), p = d + M;
      h[0] = 1 / 0, h[1] = -1 / 0, h[2] = 1 / 0, h[3] = -1 / 0, h[4] = 1 / 0, h[5] = -1 / 0, o[0] = 1 / 0, o[1] = -1 / 0, o[2] = 1 / 0, o[3] = -1 / 0, o[4] = 1 / 0, o[5] = -1 / 0;
      for (let I = d; I < p; I++) {
        const b = i[I], C = b[0], L = b[1], P = b[2], j = b[3], F = b[4], T = b[5];
        h[0] > C && (h[0] = C), h[1] < L && (h[1] = L), h[2] > P && (h[2] = P), h[3] < j && (h[3] = j), h[4] > F && (h[4] = F), h[5] < T && (h[5] = T);
        const N = (L + C) * 0.5, R = (j + P) * 0.5, z = (T + F) * 0.5;
        o[0] > N && (o[0] = N), o[1] < N && (o[1] = N), o[2] > R && (o[2] = R), o[3] < R && (o[3] = R), o[4] > z && (o[4] = z), o[5] < z && (o[5] = z);
      }
      return h[0] -= r, h[1] += r, h[2] -= r, h[3] += r, h[4] -= r, h[5] += r, h;
    }
    function y() {
      l = H(o) * 2, c = (o[l] + o[l + 1]) * 0.5;
    }
    function x(d, M) {
      let h = d, p = d + M - 1;
      for (; h <= p; ) {
        const I = i[h];
        if ((I[l + 1] + I[l]) * 0.5 >= c)
          for (; ; ) {
            const b = i[p];
            if ((b[l + 1] + b[l]) * 0.5 < c) {
              const C = t[h];
              t[h] = t[p], t[p] = C;
              const L = i[h];
              i[h] = i[p], i[p] = L, p--;
              break;
            }
            if (p--, p <= h) return h;
          }
        h++;
      }
      return h;
    }
  }
  insert(t, i, n) {
    n > 0 && w(i, n);
    const r = this.createLeafNode(t, i);
    return this.root === null ? this.root = r : this.insertLeaf(r), this.count++, r;
  }
  insertRange(t, i, n, r) {
    console.warn("Method not optimized yet. It just calls 'insert' N times.");
    const f = t.length, s = n > 0 ? n : n ? null : 0;
    for (let o = 0; o < f; o++) {
      const l = this.insert(t[o], i[o], s ?? n[o]);
      r && r(l);
    }
  }
  // update node.box before calling this function
  move(t, i) {
    if (!t.parent || g(t.box, t.parent.box)) {
      i > 0 && w(t.box, i);
      return;
    }
    i > 0 && w(t.box, i);
    const n = this.delete(t);
    this.insertLeaf(t, n), this.count++;
  }
  delete(t) {
    const i = t.parent;
    if (i === null)
      return this.root = null, null;
    const n = i.parent, r = i.left === t ? i.right : i.left;
    return r.parent = n, t.parent = null, n === null ? (this.root = r, i) : (n.left === i ? n.left = r : n.right = r, this.refit(n), this.count--, i);
  }
  clear() {
    this.root = null;
  }
  insertLeaf(t, i) {
    const n = this.findBestSibling(t.box), r = n.parent;
    i === void 0 ? i = this.createInternalNode(r, n, t) : (i.parent = r, i.left = n, i.right = t), n.parent = i, t.parent = i, r === null ? this.root = i : r.left === n ? r.left = i : r.right = i, this.refitAndRotate(t, n);
  }
  createLeafNode(t, i) {
    return { box: i, object: t, parent: null };
  }
  createInternalNode(t, i, n) {
    return { parent: t, left: i, right: n, box: new this._typeArray(6) };
  }
  findBestSibling(t) {
    const i = this.root;
    let n = i, r = _(t, i.box);
    const f = S(t);
    if (i.object !== void 0) return i;
    const s = this._sortedList;
    s.clear();
    let o = { node: i, inheritedCost: r - S(i.box) };
    do {
      const { node: l, inheritedCost: c } = o;
      if (f + c >= r) break;
      const u = l.left, a = l.right, x = _(t, u.box) + c, d = x - S(u.box), h = _(t, a.box) + c, p = h - S(a.box);
      if (x > h ? r > h && (n = a, r = h) : r > x && (n = u, r = x), p > d) {
        if (f + d >= r || (u.object === void 0 && s.push({ node: u, inheritedCost: d }), f + p >= r)) continue;
        a.object === void 0 && s.push({ node: a, inheritedCost: p });
      } else {
        if (f + p >= r || (a.object === void 0 && s.push({ node: a, inheritedCost: p }), f + d >= r)) continue;
        u.object === void 0 && s.push({ node: u, inheritedCost: d });
      }
    } while (o = s.pop());
    return n;
  }
  refit(t) {
    for (E(t.left.box, t.right.box, t.box); t = t.parent; )
      if (!Z(t.left.box, t.right.box, t.box)) return;
  }
  refitAndRotate(t, i) {
    const n = t.box;
    t = t.parent;
    const r = t.box;
    for (E(n, i.box, r); t = t.parent; ) {
      const f = t.box;
      if (!v(n, f)) return;
      const s = t.left, o = t.right, l = s.box, c = o.box;
      let u = null, a = null, y = 0;
      if (o.object === void 0) {
        const x = o.left, d = o.right, M = S(o.box), h = M - _(l, x.box), p = M - _(l, d.box);
        h > p ? h > 0 && (u = s, a = d, y = h) : p > 0 && (u = s, a = x, y = p);
      }
      if (s.object === void 0) {
        const x = s.left, d = s.right, M = S(s.box), h = M - _(c, x.box), p = M - _(c, d.box);
        h > p ? h > y && (u = o, a = d) : p > y && (u = o, a = x);
      }
      u !== null && this.swap(u, a);
    }
  }
  // this works only for rotation
  swap(t, i) {
    const n = t.parent, r = i.parent, f = r.box;
    n.left === t ? n.left = i : n.right = i, r.left === i ? r.left = t : r.right = t, t.parent = r, i.parent = n, E(r.left.box, r.right.box, f);
  }
}
const X = 0, U = 1;
class V {
  constructor(t, i) {
    this.coordinateSystem = i, this.array = t ? new Float64Array(24) : new Float32Array(24);
  }
  setFromProjectionMatrix(t) {
    if (this.updatePlane(0, t[3] + t[0], t[7] + t[4], t[11] + t[8], t[15] + t[12]), this.updatePlane(1, t[3] - t[0], t[7] - t[4], t[11] - t[8], t[15] - t[12]), this.updatePlane(2, t[3] - t[1], t[7] - t[5], t[11] - t[9], t[15] - t[13]), this.updatePlane(3, t[3] + t[1], t[7] + t[5], t[11] + t[9], t[15] + t[13]), this.updatePlane(4, t[3] - t[2], t[7] - t[6], t[11] - t[10], t[15] - t[14]), this.coordinateSystem === X)
      this.updatePlane(5, t[3] + t[2], t[7] + t[6], t[11] + t[10], t[15] + t[14]);
    else if (this.coordinateSystem === U)
      this.updatePlane(5, t[2], t[6], t[10], t[14]);
    else throw new Error("Invalid coordinate system: " + this.coordinateSystem);
    return this;
  }
  updatePlane(t, i, n, r, f) {
    const s = this.array, o = t * 4, l = Math.sqrt(i * i + n * n + r * r);
    s[o + 0] = i / l, s[o + 1] = n / l, s[o + 2] = r / l, s[o + 3] = f / l;
  }
  /** @internal returns -1 = OUT, 0 = IN, > 0 = INTERSECT. */
  intersectsBoxMask(t, i) {
    const n = this.array;
    let r, f, s, o, l, c;
    for (let u = 0; u < 6; u++) {
      if (!(i & 32 >> u)) continue;
      const a = u * 4, y = n[a + 0], x = n[a + 1], d = n[a + 2], M = n[a + 3];
      if (y > 0 ? (r = t[1], o = t[0]) : (r = t[0], o = t[1]), x > 0 ? (f = t[3], l = t[2]) : (f = t[2], l = t[3]), d > 0 ? (s = t[5], c = t[4]) : (s = t[4], c = t[5]), y * r + x * f + d * s < -M)
        return -1;
      y * o + x * l + d * c > -M && (i ^= 32 >> u);
    }
    return i;
  }
  /** @internal */
  isIntersected(t, i) {
    const n = this.array;
    for (let r = 0; r < 6; r++) {
      if (!(i & 32 >> r)) continue;
      const f = r * 4, s = n[f + 0], o = n[f + 1], l = n[f + 2], c = n[f + 3], u = s > 0 ? t[1] : t[0], a = o > 0 ? t[3] : t[2], y = l > 0 ? t[5] : t[4];
      if (s * u + o * a + l * y < -c) return !1;
    }
    return !0;
  }
  // use it only in 'onFrustumIntersectionCallback' if you have margin > 0.
  isIntersectedMargin(t, i, n) {
    if (i === 0) return !0;
    const r = this.array;
    for (let f = 0; f < 6; f++) {
      if (!(i & 32 >> f)) continue;
      const s = f * 4, o = r[s + 0], l = r[s + 1], c = r[s + 2], u = r[s + 3], a = o > 0 ? t[1] - n : t[0] + n, y = l > 0 ? t[3] - n : t[2] + n, x = c > 0 ? t[5] - n : t[4] + n;
      if (o * a + l * y + c * x < -u) return !1;
    }
    return !0;
  }
}
function q(e, t, i, n, r, f) {
  let s = n[0], o = t[0], l = i[0], c = (e[s] - o) * l, u = (e[s ^ 1] - o) * l, a = c > 0 ? c : 0, y = u < 1 / 0 ? u : 1 / 0;
  return s = n[1], o = t[1], l = i[1], c = (e[s + 2] - o) * l, c > y || (u = (e[s ^ 3] - o) * l, a > u) || (a = c > a ? c : a, y = u < y ? u : y, s = n[2], o = t[2], l = i[2], c = (e[s + 4] - o) * l, c > y) || (u = (e[s ^ 5] - o) * l, a > u) ? !1 : (a = c > a ? c : a, y = u < y ? u : y, a <= f && y >= r);
}
function O(e, t) {
  return e[1] >= t[0] && t[1] >= e[0] && e[3] >= t[2] && t[3] >= e[2] && e[5] >= t[4] && t[5] >= e[4];
}
function W(e, t, i) {
  return D(i, e) <= t * t;
}
class k {
  constructor(t, i = X) {
    this._sign = new Uint8Array(3), this.builder = t;
    const n = t.highPrecision;
    this.frustum = new V(n, i), this._dirInv = n ? new Float64Array(3) : new Float32Array(3);
  }
  get root() {
    return this.builder.root;
  }
  createFromArray(t, i, n, r) {
    (t == null ? void 0 : t.length) > 0 && this.builder.createFromArray(t, i, n, r);
  }
  insert(t, i, n) {
    return this.builder.insert(t, i, n);
  }
  insertRange(t, i, n, r) {
    (t == null ? void 0 : t.length) > 0 && this.builder.insertRange(t, i, n, r);
  }
  move(t, i) {
    this.builder.move(t, i);
  }
  delete(t) {
    return this.builder.delete(t);
  }
  clear() {
    this.builder.clear();
  }
  traverse(t) {
    if (this.root === null) return;
    i(this.root, 0);
    function i(n, r) {
      if (n.object !== void 0) {
        t(n, r);
        return;
      }
      t(n, r) || (i(n.left, r + 1), i(n.right, r + 1));
    }
  }
  intersectsRay(t, i, n, r = 0, f = 1 / 0) {
    if (this.root === null) return !1;
    const s = this._dirInv, o = this._sign;
    return s[0] = 1 / t[0], s[1] = 1 / t[1], s[2] = 1 / t[2], o[0] = s[0] < 0 ? 1 : 0, o[1] = s[1] < 0 ? 1 : 0, o[2] = s[2] < 0 ? 1 : 0, l(this.root);
    function l(c) {
      return q(c.box, i, s, o, r, f) ? c.object !== void 0 ? n(c.object) : l(c.left) || l(c.right) : !1;
    }
  }
  intersectsBox(t, i) {
    if (this.root === null) return !1;
    return n(this.root);
    function n(r) {
      return O(t, r.box) ? r.object !== void 0 ? i(r.object) : n(r.left) || n(r.right) : !1;
    }
  }
  intersectsSphere(t, i, n) {
    if (this.root === null) return !1;
    return r(this.root);
    function r(f) {
      return W(t, i, f.box) ? f.object !== void 0 ? n(f.object) : r(f.left) || r(f.right) : !1;
    }
  }
  isNodeIntersected(t, i) {
    const n = t.box;
    let r;
    for (; r = t.parent; ) {
      const s = r.left === t ? r.right : r.left;
      if (f(s)) return !0;
      t = r;
    }
    return !1;
    function f(s) {
      return O(n, s.box) ? s.object !== void 0 ? i(s.object) : f(s.left) || f(s.right) : !1;
    }
  }
  rayIntersections(t, i, n, r = 0, f = 1 / 0) {
    if (this.root === null) return;
    const s = this._dirInv, o = this._sign;
    s[0] = 1 / t[0], s[1] = 1 / t[1], s[2] = 1 / t[2], o[0] = s[0] < 0 ? 1 : 0, o[1] = s[1] < 0 ? 1 : 0, o[2] = s[2] < 0 ? 1 : 0, l(this.root);
    function l(c) {
      if (q(c.box, i, s, o, r, f)) {
        if (c.object !== void 0) {
          n(c.object);
          return;
        }
        l(c.left), l(c.right);
      }
    }
  }
  frustumCulling(t, i) {
    if (this.root === null) return;
    const n = this.frustum.setFromProjectionMatrix(t);
    r(this.root, 63);
    function r(s, o) {
      if (s.object !== void 0) {
        n.isIntersected(s.box, o) && i(s, n, o);
        return;
      }
      if (o = n.intersectsBoxMask(s.box, o), !(o < 0)) {
        if (o === 0) {
          f(s.left), f(s.right);
          return;
        }
        r(s.left, o), r(s.right, o);
      }
    }
    function f(s) {
      if (s.object !== void 0) {
        i(s, n, 0);
        return;
      }
      f(s.left), f(s.right);
    }
  }
  frustumCullingLOD(t, i, n, r) {
    if (this.root === null) return;
    const f = this.frustum.setFromProjectionMatrix(t);
    s(this.root, 63, null);
    function s(c, u, a) {
      const y = c.box;
      if (a === null && (a = l(y)), c.object !== void 0) {
        f.isIntersected(y, u) && r(c, a, f, u);
        return;
      }
      if (u = f.intersectsBoxMask(y, u), !(u < 0)) {
        if (u === 0) {
          o(c.left, a), o(c.right, a);
          return;
        }
        s(c.left, u, a), s(c.right, u, a);
      }
    }
    function o(c, u) {
      if (u === null && (u = l(c.box)), c.object !== void 0) {
        r(c, u, f, 0);
        return;
      }
      o(c.left, u), o(c.right, u);
    }
    function l(c) {
      const { min: u, max: a } = Y(c, i);
      for (let y = n.length - 1; y > 0; y--)
        if (a >= n[y])
          return u >= n[y] ? y : null;
      return 0;
    }
  }
  // onClosestDistance callback should return SQUARED distance
  closestPointToPoint(t, i) {
    if (this.root === null) return;
    let n = 1 / 0;
    return r(this.root), Math.sqrt(n);
    function r(f) {
      if (f.object !== void 0) {
        if (i) {
          const l = i(f.object) ?? D(f.box, t);
          l < n && (n = l);
        } else
          n = D(f.box, t);
        return;
      }
      const s = D(f.left.box, t), o = D(f.right.box, t);
      s < o ? s < n && (r(f.left), o < n && r(f.right)) : o < n && (r(f.right), s < n && r(f.left));
    }
  }
}
function m(e, t) {
  return t[0] = e.x, t[1] = e.y, t[2] = e.z, t;
}
function B(e, t) {
  const i = e.min, n = e.max;
  return t[0] = i.x, t[1] = n.x, t[2] = i.y, t[3] = n.y, t[4] = i.z, t[5] = n.z, t;
}
class A {
  constructor(t) {
    this.totalNodes = 0, this.totalLeafNodes = 0, this.surfaceScore = 0, this.areaProportion = 0, this.minDepth = 1 / 0, this.maxDepth = 0, this.memory = 0, this._bvh = t, this.update();
  }
  update() {
    this.reset(), this.getNodeData(this._bvh.root, 0), this.areaProportion = this.surfaceScore / S(this._bvh.root.box);
  }
  reset() {
    this.totalNodes = 0, this.totalLeafNodes = 0, this.surfaceScore = 0, this.areaProportion = 0, this.minDepth = 1 / 0, this.maxDepth = 0, this.memory = 0;
  }
  getNodeData(t, i) {
    this.totalNodes++;
    const n = S(t.box);
    if (this.surfaceScore += n, t.object !== void 0) {
      this.totalLeafNodes++, i < this.minDepth && (this.minDepth = i), i > this.maxDepth && (this.maxDepth = i);
      return;
    }
    i++, this.getNodeData(t.left, i), this.getNodeData(t.right, i);
  }
}
class tt {
  constructor() {
    this.array = [];
  }
  clear() {
    this.array = [];
  }
  push(t) {
    const i = this.binarySearch(t.inheritedCost);
    this.array.splice(i, 0, t);
  }
  pop() {
    return this.array.pop();
  }
  binarySearch(t) {
    const i = this.array;
    let n = 0, r = i.length;
    for (; n < r; ) {
      const f = n + r >>> 1;
      i[f].inheritedCost > t ? n = f + 1 : r = f;
    }
    return n;
  }
}
export {
  k as BVH,
  A as BVHInspector,
  V as Frustum,
  $ as HybridBuilder,
  tt as SortedListDesc,
  G as SortedListPriority,
  X as WebGLCoordinateSystem,
  U as WebGPUCoordinateSystem,
  S as areaBox,
  _ as areaFromTwoBoxes,
  B as box3ToArray,
  J as expandBox,
  w as expandBoxByMargin,
  H as getLongestAxis,
  O as intersectBoxBox,
  q as intersectRayBox,
  W as intersectSphereBox,
  g as isBoxInsideBox,
  v as isExpanded,
  K as minDistancePointToBox,
  D as minDistanceSqPointToBox,
  Q as minMaxDistancePointToBox,
  Y as minMaxDistanceSqPointToBox,
  E as unionBox,
  Z as unionBoxChanged,
  m as vec3ToArray
};
//# sourceMappingURL=index.js.map
