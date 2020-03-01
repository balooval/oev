
const xy = {
    toStringBase : function(p) {
        return ("(" + p.x + ";" + p.y + ")");
    }, 

    toString : function(p) {
        // Try a custom toString first, and fallback to own implementation if none
        var s = p.toString();
        return (s === '[object Object]' ? toStringBase(p) : s);
    }, 

    compare : function(a, b) {
        if (a.y === b.y) {
            return a.x - b.x;
        } else {
            return a.y - b.y;
        }
    }, 

    equals : function(a, b) {
        return a.x === b.x && a.y === b.y;
    }, 
};


const utils = {
    EPSILON : 1e-12, 
    Orientation : {
        "CW": 1,
        "CCW": -1,
        "COLLINEAR": 0
    }, 

    orient2d : function(pa, pb, pc) {
        var detleft = (pa.x - pc.x) * (pb.y - pc.y);
        var detright = (pa.y - pc.y) * (pb.x - pc.x);
        var val = detleft - detright;
        if (val > -(utils.EPSILON) && val < (utils.EPSILON)) {
            return utils.Orientation.COLLINEAR;
        } else if (val > 0) {
            return utils.Orientation.CCW;
        } else {
            return utils.Orientation.CW;
        }
    }, 

    inScanArea : function(pa, pb, pc, pd) {
        var oadb = (pa.x - pb.x) * (pd.y - pb.y) - (pd.x - pb.x) * (pa.y - pb.y);
        if (oadb >= -utils.EPSILON) {
            return false;
        }
    
        var oadc = (pa.x - pc.x) * (pd.y - pc.y) - (pd.x - pc.x) * (pa.y - pc.y);
        if (oadc <= utils.EPSILON) {
            return false;
        }
        return true;
    }, 

    isAngleObtuse : function(pa, pb, pc) {
        var ax = pb.x - pa.x;
        var ay = pb.y - pa.y;
        var bx = pc.x - pa.x;
        var by = pc.y - pa.y;
        return (ax * bx + ay * by) < 0;
    }
};




var Point = function(x, y, _id) {
    this.id = _id || 0;
    this.x = +x || 0;
    this.y = +y || 0;
    this._p2t_edge_list = null;
};

Point.prototype.toString = function() {
    return xy.toStringBase(this);
};

Point.prototype.toJSON = function() {
    return { x: this.x, y: this.y };
};

Point.prototype.clone = function() {
    return new Point(this.x, this.y);
};

Point.prototype.set_zero = function() {
    this.x = 0.0;
    this.y = 0.0;
    return this; // for chaining
};

Point.prototype.set = function(x, y) {
    this.x = +x || 0;
    this.y = +y || 0;
    return this; // for chaining
};

Point.prototype.negate = function() {
    this.x = -this.x;
    this.y = -this.y;
    return this; // for chaining
};

Point.prototype.add = function(n) {
    this.x += n.x;
    this.y += n.y;
    return this; // for chaining
};

Point.prototype.sub = function(n) {
    this.x -= n.x;
    this.y -= n.y;
    return this; // for chaining
};

Point.prototype.mul = function(s) {
    this.x *= s;
    this.y *= s;
    return this; // for chaining
};

Point.prototype.length = function() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
};

Point.prototype.normalize = function() {
    var len = this.length();
    this.x /= len;
    this.y /= len;
    return len;
};

Point.prototype.equals = function(p) {
    return this.x === p.x && this.y === p.y;
};

Point.negate = function(p) {
    return new Point(-p.x, -p.y);
};

Point.add = function(a, b) {
    return new Point(a.x + b.x, a.y + b.y);
};

Point.sub = function(a, b) {
    return new Point(a.x - b.x, a.y - b.y);
};

Point.mul = function(s, p) {
    return new Point(s * p.x, s * p.y);
};

Point.cross = function(a, b) {
    if (typeof(a) === 'number') {
        if (typeof(b) === 'number') {
            return a * b;
        } else {
            return new Point(-a * b.y, a * b.x);
        }
    } else {
        if (typeof(b) === 'number') {
            return new Point(b * a.y, -b * a.x);
        } else {
            return a.x * b.y - a.y * b.x;
        }
    }
};

Point.toString = xy.toString;
Point.compare = xy.compare;
Point.cmp = xy.compare; // backward compatibility
Point.equals = xy.equals;

Point.dot = function(a, b) {
    return a.x * b.x + a.y * b.y;
};





const PointError = function(message, points) {
    this.name = "PointError";
    this.points = points = points || [];
    this.message = message || "Invalid Points!";
    for (var i = 0; i < points.length; i++) {
        this.message += " " + xy.toString(points[i]);
    }
};
PointError.prototype = new Error();
PointError.prototype.constructor = PointError;
    




const SweepContext = (function() {
    // var Node = AdvancingFront.Node;
    var kAlpha = 0.3;
    
    var Edge = function(p1, p2) {
        this.p = p1;
        this.q = p2;
    
        if (p1.y > p2.y) {
            this.q = p1;
            this.p = p2;
        } else if (p1.y === p2.y) {
            if (p1.x > p2.x) {
                this.q = p1;
                this.p = p2;
            } else if (p1.x === p2.x) {
                throw new PointError('poly2tri Invalid Edge constructor: repeated points!', [p1]);
            }
        }
    
        if (!this.q._p2t_edge_list) {
            this.q._p2t_edge_list = [];
        }
        this.q._p2t_edge_list.push(this);
    };
    
    var Basin = function() {
        this.left_node = null;
        this.bottom_node = null;
        this.right_node = null;
        this.width = 0.0;
        this.left_highest = false;
    };
    
    Basin.prototype.clear = function() {
        this.left_node = null;
        this.bottom_node = null;
        this.right_node = null;
        this.width = 0.0;
        this.left_highest = false;
    };
    
    var EdgeEvent = function() {
        this.constrained_edge = null;
        this.right = false;
    };
    
    // ----------------------------------------------------SweepContext (public API)
    
    var SweepContext = function(contour, options) {
        options = options || {};
        this.triangles_ = [];
        this.map_ = [];
        this.points_ = (options.cloneArrays ? contour.slice(0) : contour);
        this.edge_list = [];
    
        // Bounding box of all points. Computed at the start of the triangulation, 
        // it is stored in case it is needed by the caller.
        this.pmin_ = this.pmax_ = null;
        this.front_ = null;
        this.head_ = null;
        this.tail_ = null;
        this.af_head_ = null;
        this.af_middle_ = null;
        this.af_tail_ = null;
        this.basin = new Basin();
        this.edge_event = new EdgeEvent();
        this.initEdges(this.points_);
    };
    
    SweepContext.prototype.addHole = function(polyline) {
        this.initEdges(polyline);
        var i, len = polyline.length;
        for (i = 0; i < len; i++) {
            this.points_.push(polyline[i]);
        }
        return this; // for chaining
    };
    
    SweepContext.prototype.AddHole = SweepContext.prototype.addHole;
    
    SweepContext.prototype.addHoles = function(holes) {
        var i, len = holes.length;
        for (i = 0; i < len; i++) {
            this.initEdges(holes[i]);
        }
        this.points_ = this.points_.concat.apply(this.points_, holes);
        return this; // for chaining
    };
    
    SweepContext.prototype.addPoint = function(point) {
        this.points_.push(point);
        return this; // for chaining
    };
    
    SweepContext.prototype.AddPoint = SweepContext.prototype.addPoint;
    
    SweepContext.prototype.addPoints = function(points) {
        this.points_ = this.points_.concat(points);
        return this; // for chaining
    };
    
    SweepContext.prototype.triangulate = function() {
        triangulate(this);
        return this; // for chaining
    };
    
    SweepContext.prototype.getBoundingBox = function() {
        return {min: this.pmin_, max: this.pmax_};
    };
    
    SweepContext.prototype.getTriangles = function() {
        return this.triangles_;
    };
    
    SweepContext.prototype.GetTriangles = SweepContext.prototype.getTriangles;
    
    
    // ---------------------------------------------------SweepContext (private API)
    
    SweepContext.prototype.front = function() {
        return this.front_;
    };
    
    SweepContext.prototype.pointCount = function() {
        return this.points_.length;
    };
    
    SweepContext.prototype.head = function() {
        return this.head_;
    };
    
    SweepContext.prototype.setHead = function(p1) {
        this.head_ = p1;
    };
    
    SweepContext.prototype.tail = function() {
        return this.tail_;
    };
    
    SweepContext.prototype.setTail = function(p1) {
        this.tail_ = p1;
    };
    
    SweepContext.prototype.getMap = function() {
        return this.map_;
    };
    
    SweepContext.prototype.initTriangulation = function() {
        var xmax = this.points_[0].x;
        var xmin = this.points_[0].x;
        var ymax = this.points_[0].y;
        var ymin = this.points_[0].y;
    
        // Calculate bounds
        var i, len = this.points_.length;
        for (i = 1; i < len; i++) {
            var p = this.points_[i];
            /* jshint expr:true */
            (p.x > xmax) && (xmax = p.x);
            (p.x < xmin) && (xmin = p.x);
            (p.y > ymax) && (ymax = p.y);
            (p.y < ymin) && (ymin = p.y);
        }
        this.pmin_ = new Point(xmin, ymin);
        this.pmax_ = new Point(xmax, ymax);
    
        var dx = kAlpha * (xmax - xmin);
        var dy = kAlpha * (ymax - ymin);
        this.head_ = new Point(xmax + dx, ymin - dy);
        this.tail_ = new Point(xmin - dx, ymin - dy);
    
        // Sort points along y-axis
        this.points_.sort(Point.compare);
    };
    
    SweepContext.prototype.initEdges = function(polyline) {
        var i, len = polyline.length;
        for (i = 0; i < len; ++i) {
            this.edge_list.push(new Edge(polyline[i], polyline[(i + 1) % len]));
        }
    };
    
    SweepContext.prototype.getPoint = function(index) {
        return this.points_[index];
    };
    
    SweepContext.prototype.addToMap = function(triangle) {
        this.map_.push(triangle);
    };
    
    SweepContext.prototype.locateNode = function(point) {
        return this.front_.locateNode(point.x);
    };
    
    SweepContext.prototype.createAdvancingFront = function() {
        var head;
        var middle;
        var tail;
        // Initial triangle
        var triangle = new Triangle(this.points_[0], this.tail_, this.head_);
        this.map_.push(triangle);
        head = new Node(triangle.getPoint(1), triangle);
        middle = new Node(triangle.getPoint(0), triangle);
        tail = new Node(triangle.getPoint(2));
        this.front_ = new AdvancingFront(head, tail);
        head.next = middle;
        middle.next = tail;
        middle.prev = head;
        tail.prev = middle;
    };
    
    SweepContext.prototype.removeNode = function(node) {
        // do nothing
        /* jshint unused:false */
    };
    
    SweepContext.prototype.mapTriangleToNodes = function(t) {
        for (var i = 0; i < 3; ++i) {
            if (!t.getNeighbor(i)) {
                var n = this.front_.locatePoint(t.pointCW(t.getPoint(i)));
                if (n) {
                    n.triangle = t;
                }
            }
        }
    };
    
    SweepContext.prototype.removeFromMap = function(triangle) {
        var i, map = this.map_, len = map.length;
        for (i = 0; i < len; i++) {
            if (map[i] === triangle) {
                map.splice(i, 1);
                break;
            }
        }
    };
    
    SweepContext.prototype.meshClean = function(triangle) {
        var triangles = [triangle], t, i;
        while (t = triangles.pop()) {
            if (!t.isInterior()) {
                t.setInterior(true);
                this.triangles_.push(t);
                for (i = 0; i < 3; i++) {
                    if (!t.constrained_edge[i]) {
                        triangles.push(t.getNeighbor(i));
                    }
                }
            }
        }
    };
    
    return SweepContext;
})();




var Node = function(p, t) {
    this.point = p;
    this.triangle = t || null;
    this.next = null;
    this.prev = null;
    this.value = p.x;
};

var AdvancingFront = function(head, tail) {
    this.head_ = head;
    this.tail_ = tail;
    this.search_node_ = head;
};

AdvancingFront.prototype.head = function() {
    return this.head_;
};

AdvancingFront.prototype.setHead = function(node) {
    this.head_ = node;
};

AdvancingFront.prototype.tail = function() {
    return this.tail_;
};

AdvancingFront.prototype.setTail = function(node) {
    this.tail_ = node;
};

AdvancingFront.prototype.search = function() {
    return this.search_node_;
};

AdvancingFront.prototype.setSearch = function(node) {
    this.search_node_ = node;
};

AdvancingFront.prototype.findSearchNode = function(/*x*/) {
    return this.search_node_;
};

AdvancingFront.prototype.locateNode = function(x) {
    var node = this.search_node_;
    if (x < node.value) {
        while (node = node.prev) {
            if (x >= node.value) {
                this.search_node_ = node;
                return node;
            }
        }
    } else {
        while (node = node.next) {
            if (x < node.value) {
                this.search_node_ = node.prev;
                return node.prev;
            }
        }
    }
    return null;
};

AdvancingFront.prototype.locatePoint = function(point) {
    var px = point.x;
    var node = this.findSearchNode(px);
    var nx = node.point.x;
    if (px === nx) {
        if (point !== node.point) {
            if (point === node.prev.point) {
                node = node.prev;
            } else if (point === node.next.point) {
                node = node.next;
            } else {
                throw new Error('poly2tri Invalid AdvancingFront.locatePoint() call');
            }
        }
    } else if (px < nx) {
        while (node = node.prev) {
            if (point === node.point) {
                break;
            }
        }
    } else {
        while (node = node.next) {
            if (point === node.point) {
                break;
            }
        }
    }

    if (node) {
        this.search_node_ = node;
    }
    return node;
};


function assert(condition, message) {
    if (!condition) {
        throw new Error(message || "Assert Failed");
    }
}


const triangulate = (function() {

    var EPSILON = utils.EPSILON;
    var Orientation = utils.Orientation;
    var orient2d = utils.orient2d;
    var inScanArea = utils.inScanArea;
    var isAngleObtuse = utils.isAngleObtuse;

    function triangulate(tcx) {
        tcx.initTriangulation();
        tcx.createAdvancingFront();
        sweepPoints(tcx);
        finalizationPolygon(tcx);
    }

    function sweepPoints(tcx) {
        var i, len = tcx.pointCount();
        for (i = 1; i < len; ++i) {
            var point = tcx.getPoint(i);
            var node = pointEvent(tcx, point);
            var edges = point._p2t_edge_list;
            for (var j = 0; edges && j < edges.length; ++j) {
                edgeEventByEdge(tcx, edges[j], node);
            }
        }
    }

    function finalizationPolygon(tcx) {
        var t = tcx.front().head().next.triangle;
        var p = tcx.front().head().next.point;
        while (!t.getConstrainedEdgeCW(p)) {
            t = t.neighborCCW(p);
        }
        tcx.meshClean(t);
    }

    function pointEvent(tcx, point) {
        var node = tcx.locateNode(point);
        var new_node = newFrontTriangle(tcx, point, node);
        if (point.x <= node.point.x + (EPSILON)) {
            fill(tcx, node);
        }
        fillAdvancingFront(tcx, new_node);
        return new_node;
    }

    function edgeEventByEdge(tcx, edge, node) {
        tcx.edge_event.constrained_edge = edge;
        tcx.edge_event.right = (edge.p.x > edge.q.x);

        if (isEdgeSideOfTriangle(node.triangle, edge.p, edge.q)) {
            return;
        }
        fillEdgeEvent(tcx, edge, node);
        edgeEventByPoints(tcx, edge.p, edge.q, node.triangle, edge.q);
    }

    function edgeEventByPoints(tcx, ep, eq, triangle, point) {
        if (isEdgeSideOfTriangle(triangle, ep, eq)) {
            return;
        }
        var p1 = triangle.pointCCW(point);
        var o1 = orient2d(eq, p1, ep);
        if (o1 === Orientation.COLLINEAR) {
            throw new PointError('poly2tri EdgeEvent: Collinear not supported!', [eq, p1, ep]);
        }
        var p2 = triangle.pointCW(point);
        var o2 = orient2d(eq, p2, ep);
        if (o2 === Orientation.COLLINEAR) {
            throw new PointError('poly2tri EdgeEvent: Collinear not supported!', [eq, p2, ep]);
        }
        if (o1 === o2) {
            if (o1 === Orientation.CW) {
                triangle = triangle.neighborCCW(point);
            } else {
                triangle = triangle.neighborCW(point);
            }
            edgeEventByPoints(tcx, ep, eq, triangle, point);
        } else {
            flipEdgeEvent(tcx, ep, eq, triangle, point);
        }
    }

    function isEdgeSideOfTriangle(triangle, ep, eq) {
        var index = triangle.edgeIndex(ep, eq);
        if (index !== -1) {
            triangle.markConstrainedEdgeByIndex(index);
            var t = triangle.getNeighbor(index);
            if (t) {
                t.markConstrainedEdgeByPoints(ep, eq);
            }
            return true;
        }
        return false;
    }

    function newFrontTriangle(tcx, point, node) {
        var triangle = new Triangle(point, node.point, node.next.point);
        triangle.markNeighbor(node.triangle);
        tcx.addToMap(triangle);
        var new_node = new Node(point);
        new_node.next = node.next;
        new_node.prev = node;
        node.next.prev = new_node;
        node.next = new_node;
        if (!legalize(tcx, triangle)) {
            tcx.mapTriangleToNodes(triangle);
        }
        return new_node;
    }

    function fill(tcx, node) {
        var triangle = new Triangle(node.prev.point, node.point, node.next.point);
        triangle.markNeighbor(node.prev.triangle);
        triangle.markNeighbor(node.triangle);
        tcx.addToMap(triangle);
        node.prev.next = node.next;
        node.next.prev = node.prev;
        if (!legalize(tcx, triangle)) {
            tcx.mapTriangleToNodes(triangle);
        }
    }

    function fillAdvancingFront(tcx, n) {
        var node = n.next;
        while (node.next) {
            if (isAngleObtuse(node.point, node.next.point, node.prev.point)) {
                break;
            }
            fill(tcx, node);
            node = node.next;
        }

        node = n.prev;
        while (node.prev) {
            if (isAngleObtuse(node.point, node.next.point, node.prev.point)) {
                break;
            }
            fill(tcx, node);
            node = node.prev;
        }
        if (n.next && n.next.next) {
            if (isBasinAngleRight(n)) {
                fillBasin(tcx, n);
            }
        }
    }

    function isBasinAngleRight(node) {
        var ax = node.point.x - node.next.next.point.x;
        var ay = node.point.y - node.next.next.point.y;
        assert(ay >= 0, "unordered y");
        return (ax >= 0 || Math.abs(ax) < ay);
    }

    function legalize(tcx, t) {
        for (var i = 0; i < 3; ++i) {
            if (t.delaunay_edge[i]) {
                continue;
            }
            var ot = t.getNeighbor(i);
            if (ot) {
                var p = t.getPoint(i);
                var op = ot.oppositePoint(t, p);
                var oi = ot.index(op);
                if (ot.constrained_edge[oi] || ot.delaunay_edge[oi]) {
                    t.constrained_edge[i] = ot.constrained_edge[oi];
                    continue;
                }

                var inside = inCircle(p, t.pointCCW(p), t.pointCW(p), op);
                if (inside) {
                    t.delaunay_edge[i] = true;
                    ot.delaunay_edge[oi] = true;
                    rotateTrianglePair(t, p, ot, op);
                    var not_legalized = !legalize(tcx, t);
                    if (not_legalized) {
                        tcx.mapTriangleToNodes(t);
                    }
                    not_legalized = !legalize(tcx, ot);
                    if (not_legalized) {
                        tcx.mapTriangleToNodes(ot);
                    }
                    t.delaunay_edge[i] = false;
                    ot.delaunay_edge[oi] = false;
                    return true;
                }
            }
        }
        return false;
    }

    function inCircle(pa, pb, pc, pd) {
        var adx = pa.x - pd.x;
        var ady = pa.y - pd.y;
        var bdx = pb.x - pd.x;
        var bdy = pb.y - pd.y;

        var adxbdy = adx * bdy;
        var bdxady = bdx * ady;
        var oabd = adxbdy - bdxady;
        if (oabd <= 0) {
            return false;
        }

        var cdx = pc.x - pd.x;
        var cdy = pc.y - pd.y;

        var cdxady = cdx * ady;
        var adxcdy = adx * cdy;
        var ocad = cdxady - adxcdy;
        if (ocad <= 0) {
            return false;
        }

        var bdxcdy = bdx * cdy;
        var cdxbdy = cdx * bdy;

        var alift = adx * adx + ady * ady;
        var blift = bdx * bdx + bdy * bdy;
        var clift = cdx * cdx + cdy * cdy;

        var det = alift * (bdxcdy - cdxbdy) + blift * ocad + clift * oabd;
        return det > 0;
    }

    function rotateTrianglePair(t, p, ot, op) {
        var n1, n2, n3, n4;
        n1 = t.neighborCCW(p);
        n2 = t.neighborCW(p);
        n3 = ot.neighborCCW(op);
        n4 = ot.neighborCW(op);

        var ce1, ce2, ce3, ce4;
        ce1 = t.getConstrainedEdgeCCW(p);
        ce2 = t.getConstrainedEdgeCW(p);
        ce3 = ot.getConstrainedEdgeCCW(op);
        ce4 = ot.getConstrainedEdgeCW(op);

        var de1, de2, de3, de4;
        de1 = t.getDelaunayEdgeCCW(p);
        de2 = t.getDelaunayEdgeCW(p);
        de3 = ot.getDelaunayEdgeCCW(op);
        de4 = ot.getDelaunayEdgeCW(op);

        t.legalize(p, op);
        ot.legalize(op, p);

        // Remap delaunay_edge
        ot.setDelaunayEdgeCCW(p, de1);
        t.setDelaunayEdgeCW(p, de2);
        t.setDelaunayEdgeCCW(op, de3);
        ot.setDelaunayEdgeCW(op, de4);

        // Remap constrained_edge
        ot.setConstrainedEdgeCCW(p, ce1);
        t.setConstrainedEdgeCW(p, ce2);
        t.setConstrainedEdgeCCW(op, ce3);
        ot.setConstrainedEdgeCW(op, ce4);

        t.clearNeighbors();
        ot.clearNeighbors();
        if (n1) {
            ot.markNeighbor(n1);
        }
        if (n2) {
            t.markNeighbor(n2);
        }
        if (n3) {
            t.markNeighbor(n3);
        }
        if (n4) {
            ot.markNeighbor(n4);
        }
        t.markNeighbor(ot);
    }

    function fillBasin(tcx, node) {
        if (orient2d(node.point, node.next.point, node.next.next.point) === Orientation.CCW) {
            tcx.basin.left_node = node.next.next;
        } else {
            tcx.basin.left_node = node.next;
        }
        tcx.basin.bottom_node = tcx.basin.left_node;
        while (tcx.basin.bottom_node.next && tcx.basin.bottom_node.point.y >= tcx.basin.bottom_node.next.point.y) {
            tcx.basin.bottom_node = tcx.basin.bottom_node.next;
        }
        if (tcx.basin.bottom_node === tcx.basin.left_node) {
            return;
        }

        tcx.basin.right_node = tcx.basin.bottom_node;
        while (tcx.basin.right_node.next && tcx.basin.right_node.point.y < tcx.basin.right_node.next.point.y) {
            tcx.basin.right_node = tcx.basin.right_node.next;
        }
        if (tcx.basin.right_node === tcx.basin.bottom_node) {
            return;
        }
        tcx.basin.width = tcx.basin.right_node.point.x - tcx.basin.left_node.point.x;
        tcx.basin.left_highest = tcx.basin.left_node.point.y > tcx.basin.right_node.point.y;
        fillBasinReq(tcx, tcx.basin.bottom_node);
    }

    function fillBasinReq(tcx, node) {
        if (isShallow(tcx, node)) {
            return;
        }
        fill(tcx, node);
        var o;
        if (node.prev === tcx.basin.left_node && node.next === tcx.basin.right_node) {
            return;
        } else if (node.prev === tcx.basin.left_node) {
            o = orient2d(node.point, node.next.point, node.next.next.point);
            if (o === Orientation.CW) {
                return;
            }
            node = node.next;
        } else if (node.next === tcx.basin.right_node) {
            o = orient2d(node.point, node.prev.point, node.prev.prev.point);
            if (o === Orientation.CCW) {
                return;
            }
            node = node.prev;
        } else {
            if (node.prev.point.y < node.next.point.y) {
                node = node.prev;
            } else {
                node = node.next;
            }
        }

        fillBasinReq(tcx, node);
    }

    function isShallow(tcx, node) {
        var height;
        if (tcx.basin.left_highest) {
            height = tcx.basin.left_node.point.y - node.point.y;
        } else {
            height = tcx.basin.right_node.point.y - node.point.y;
        }
        if (tcx.basin.width > height) {
            return true;
        }
        return false;
    }

    function fillEdgeEvent(tcx, edge, node) {
        if (tcx.edge_event.right) {
            fillRightAboveEdgeEvent(tcx, edge, node);
        } else {
            fillLeftAboveEdgeEvent(tcx, edge, node);
        }
    }

    function fillRightAboveEdgeEvent(tcx, edge, node) {
        while (node.next.point.x < edge.p.x) {
            if (orient2d(edge.q, node.next.point, edge.p) === Orientation.CCW) {
                fillRightBelowEdgeEvent(tcx, edge, node);
            } else {
                node = node.next;
            }
        }
    }

    function fillRightBelowEdgeEvent(tcx, edge, node) {
        if (node.point.x < edge.p.x) {
            if (orient2d(node.point, node.next.point, node.next.next.point) === Orientation.CCW) {
                // Concave
                fillRightConcaveEdgeEvent(tcx, edge, node);
            } else {
                // Convex
                fillRightConvexEdgeEvent(tcx, edge, node);
                // Retry this one
                fillRightBelowEdgeEvent(tcx, edge, node);
            }
        }
    }

    function fillRightConcaveEdgeEvent(tcx, edge, node) {
        fill(tcx, node.next);
        if (node.next.point !== edge.p) {
            // Next above or below edge?
            if (orient2d(edge.q, node.next.point, edge.p) === Orientation.CCW) {
                // Below
                if (orient2d(node.point, node.next.point, node.next.next.point) === Orientation.CCW) {
                    // Next is concave
                    fillRightConcaveEdgeEvent(tcx, edge, node);
                } else {
                    // Next is convex
                    /* jshint noempty:false */
                }
            }
        }
    }

    function fillRightConvexEdgeEvent(tcx, edge, node) {
        // Next concave or convex?
        if (orient2d(node.next.point, node.next.next.point, node.next.next.next.point) === Orientation.CCW) {
            // Concave
            fillRightConcaveEdgeEvent(tcx, edge, node.next);
        } else {
            // Convex
            // Next above or below edge?
            if (orient2d(edge.q, node.next.next.point, edge.p) === Orientation.CCW) {
                // Below
                fillRightConvexEdgeEvent(tcx, edge, node.next);
            } else {
                // Above
                /* jshint noempty:false */
            }
        }
    }

    function fillLeftAboveEdgeEvent(tcx, edge, node) {
        while (node.prev.point.x > edge.p.x) {
            // Check if next node is below the edge
            if (orient2d(edge.q, node.prev.point, edge.p) === Orientation.CW) {
                fillLeftBelowEdgeEvent(tcx, edge, node);
            } else {
                node = node.prev;
            }
        }
    }

    function fillLeftBelowEdgeEvent(tcx, edge, node) {
        if (node.point.x > edge.p.x) {
            if (orient2d(node.point, node.prev.point, node.prev.prev.point) === Orientation.CW) {
                // Concave
                fillLeftConcaveEdgeEvent(tcx, edge, node);
            } else {
                // Convex
                fillLeftConvexEdgeEvent(tcx, edge, node);
                // Retry this one
                fillLeftBelowEdgeEvent(tcx, edge, node);
            }
        }
    }

    function fillLeftConvexEdgeEvent(tcx, edge, node) {
        // Next concave or convex?
        if (orient2d(node.prev.point, node.prev.prev.point, node.prev.prev.prev.point) === Orientation.CW) {
            // Concave
            fillLeftConcaveEdgeEvent(tcx, edge, node.prev);
        } else {
            // Convex
            // Next above or below edge?
            if (orient2d(edge.q, node.prev.prev.point, edge.p) === Orientation.CW) {
                // Below
                fillLeftConvexEdgeEvent(tcx, edge, node.prev);
            } else {
                // Above
                /* jshint noempty:false */
            }
        }
    }

    function fillLeftConcaveEdgeEvent(tcx, edge, node) {
        fill(tcx, node.prev);
        if (node.prev.point !== edge.p) {
            // Next above or below edge?
            if (orient2d(edge.q, node.prev.point, edge.p) === Orientation.CW) {
                // Below
                if (orient2d(node.point, node.prev.point, node.prev.prev.point) === Orientation.CW) {
                    // Next is concave
                    fillLeftConcaveEdgeEvent(tcx, edge, node);
                } else {
                    // Next is convex
                    /* jshint noempty:false */
                }
            }
        }
    }

    function flipEdgeEvent(tcx, ep, eq, t, p) {
        var ot = t.neighborAcross(p);
        assert(ot, "FLIP failed due to missing triangle!");

        var op = ot.oppositePoint(t, p);

        // Additional check from Java version (see issue #88)
        if (t.getConstrainedEdgeAcross(p)) {
            var index = t.index(p);
            throw new PointError("poly2tri Intersecting Constraints",
                    [p, op, t.getPoint((index + 1) % 3), t.getPoint((index + 2) % 3)]);
        }

        if (inScanArea(p, t.pointCCW(p), t.pointCW(p), op)) {
            // Lets rotate shared edge one vertex CW
            rotateTrianglePair(t, p, ot, op);
            tcx.mapTriangleToNodes(t);
            tcx.mapTriangleToNodes(ot);
            if (p === eq && op === ep) {
                if (eq === tcx.edge_event.constrained_edge.q && ep === tcx.edge_event.constrained_edge.p) {
                    t.markConstrainedEdgeByPoints(ep, eq);
                    ot.markConstrainedEdgeByPoints(ep, eq);
                    legalize(tcx, t);
                    legalize(tcx, ot);
                } else {
                    // XXX: I think one of the triangles should be legalized here?
                    /* jshint noempty:false */
                }
            } else {
                var o = orient2d(eq, op, ep);
                t = nextFlipTriangle(tcx, o, t, ot, p, op);
                flipEdgeEvent(tcx, ep, eq, t, p);
            }
        } else {
            var newP = nextFlipPoint(ep, eq, ot, op);
            flipScanEdgeEvent(tcx, ep, eq, t, ot, newP);
            edgeEventByPoints(tcx, ep, eq, t, p);
        }
    }

    function nextFlipTriangle(tcx, o, t, ot, p, op) {
        var edge_index;
        if (o === Orientation.CCW) {
            // ot is not crossing edge after flip
            edge_index = ot.edgeIndex(p, op);
            ot.delaunay_edge[edge_index] = true;
            legalize(tcx, ot);
            ot.clearDelaunayEdges();
            return t;
        }

        // t is not crossing edge after flip
        edge_index = t.edgeIndex(p, op);

        t.delaunay_edge[edge_index] = true;
        legalize(tcx, t);
        t.clearDelaunayEdges();
        return ot;
    }

    function nextFlipPoint(ep, eq, ot, op) {
        var o2d = orient2d(eq, op, ep);
        if (o2d === Orientation.CW) {
            // Right
            return ot.pointCCW(op);
        } else if (o2d === Orientation.CCW) {
            // Left
            return ot.pointCW(op);
        } else {
            throw new PointError("poly2tri [Unsupported] nextFlipPoint: opposing point on constrained edge!", [eq, op, ep]);
        }
    }

    function flipScanEdgeEvent(tcx, ep, eq, flip_triangle, t, p) {
        var ot = t.neighborAcross(p);
        assert(ot, "FLIP failed due to missing triangle");

        var op = ot.oppositePoint(t, p);

        if (inScanArea(eq, flip_triangle.pointCCW(eq), flip_triangle.pointCW(eq), op)) {
            // flip with new edge op.eq
            flipEdgeEvent(tcx, eq, op, ot, op);
        } else {
            var newP = nextFlipPoint(ep, eq, ot, op);
            flipScanEdgeEvent(tcx, ep, eq, flip_triangle, ot, newP);
        }
    }

    return triangulate;
})();





const Triangle = function(a, b, c) {
    this.points_ = [a, b, c];
    this.neighbors_ = [null, null, null];
    this.interior_ = false;
    this.constrained_edge = [false, false, false];
    this.delaunay_edge = [false, false, false];
};

var p2s = xy.toString;

Triangle.prototype.toString = function() {
    return ("[" + p2s(this.points_[0]) + p2s(this.points_[1]) + p2s(this.points_[2]) + "]");
};

Triangle.prototype.getPoint = function(index) {
    return this.points_[index];
};

Triangle.prototype.GetPoint = Triangle.prototype.getPoint;

Triangle.prototype.getPoints = function() {
    return this.points_;
};

Triangle.prototype.getNeighbor = function(index) {
    return this.neighbors_[index];
};

Triangle.prototype.containsPoint = function(point) {
    var points = this.points_;
    // Here we are comparing point references, not values
    return (point === points[0] || point === points[1] || point === points[2]);
};

Triangle.prototype.containsEdge = function(edge) {
    return this.containsPoint(edge.p) && this.containsPoint(edge.q);
};

Triangle.prototype.containsPoints = function(p1, p2) {
    return this.containsPoint(p1) && this.containsPoint(p2);
};

Triangle.prototype.isInterior = function() {
    return this.interior_;
};

Triangle.prototype.setInterior = function(interior) {
    this.interior_ = interior;
    return this;
};

Triangle.prototype.markNeighborPointers = function(p1, p2, t) {
    var points = this.points_;
    // Here we are comparing point references, not values
    if ((p1 === points[2] && p2 === points[1]) || (p1 === points[1] && p2 === points[2])) {
        this.neighbors_[0] = t;
    } else if ((p1 === points[0] && p2 === points[2]) || (p1 === points[2] && p2 === points[0])) {
        this.neighbors_[1] = t;
    } else if ((p1 === points[0] && p2 === points[1]) || (p1 === points[1] && p2 === points[0])) {
        this.neighbors_[2] = t;
    } else {
        throw new Error('poly2tri Invalid Triangle.markNeighborPointers() call');
    }
};

Triangle.prototype.markNeighbor = function(t) {
    var points = this.points_;
    if (t.containsPoints(points[1], points[2])) {
        this.neighbors_[0] = t;
        t.markNeighborPointers(points[1], points[2], this);
    } else if (t.containsPoints(points[0], points[2])) {
        this.neighbors_[1] = t;
        t.markNeighborPointers(points[0], points[2], this);
    } else if (t.containsPoints(points[0], points[1])) {
        this.neighbors_[2] = t;
        t.markNeighborPointers(points[0], points[1], this);
    }
};

Triangle.prototype.clearNeighbors = function() {
    this.neighbors_[0] = null;
    this.neighbors_[1] = null;
    this.neighbors_[2] = null;
};

Triangle.prototype.clearDelaunayEdges = function() {
    this.delaunay_edge[0] = false;
    this.delaunay_edge[1] = false;
    this.delaunay_edge[2] = false;
};

Triangle.prototype.pointCW = function(p) {
    var points = this.points_;
    if (p === points[0]) {
        return points[2];
    } else if (p === points[1]) {
        return points[0];
    } else if (p === points[2]) {
        return points[1];
    } else {
        return null;
    }
};

Triangle.prototype.pointCCW = function(p) {
    var points = this.points_;
    if (p === points[0]) {
        return points[1];
    } else if (p === points[1]) {
        return points[2];
    } else if (p === points[2]) {
        return points[0];
    } else {
        return null;
    }
};

Triangle.prototype.neighborCW = function(p) {
    if (p === this.points_[0]) {
        return this.neighbors_[1];
    } else if (p === this.points_[1]) {
        return this.neighbors_[2];
    } else {
        return this.neighbors_[0];
    }
};

Triangle.prototype.neighborCCW = function(p) {
    if (p === this.points_[0]) {
        return this.neighbors_[2];
    } else if (p === this.points_[1]) {
        return this.neighbors_[0];
    } else {
        return this.neighbors_[1];
    }
};

Triangle.prototype.getConstrainedEdgeCW = function(p) {
    if (p === this.points_[0]) {
        return this.constrained_edge[1];
    } else if (p === this.points_[1]) {
        return this.constrained_edge[2];
    } else {
        return this.constrained_edge[0];
    }
};

Triangle.prototype.getConstrainedEdgeCCW = function(p) {
    if (p === this.points_[0]) {
        return this.constrained_edge[2];
    } else if (p === this.points_[1]) {
        return this.constrained_edge[0];
    } else {
        return this.constrained_edge[1];
    }
};

Triangle.prototype.getConstrainedEdgeAcross = function(p) {
    if (p === this.points_[0]) {
        return this.constrained_edge[0];
    } else if (p === this.points_[1]) {
        return this.constrained_edge[1];
    } else {
        return this.constrained_edge[2];
    }
};

Triangle.prototype.setConstrainedEdgeCW = function(p, ce) {
    if (p === this.points_[0]) {
        this.constrained_edge[1] = ce;
    } else if (p === this.points_[1]) {
        this.constrained_edge[2] = ce;
    } else {
        this.constrained_edge[0] = ce;
    }
};

Triangle.prototype.setConstrainedEdgeCCW = function(p, ce) {
    if (p === this.points_[0]) {
        this.constrained_edge[2] = ce;
    } else if (p === this.points_[1]) {
        this.constrained_edge[0] = ce;
    } else {
        this.constrained_edge[1] = ce;
    }
};

Triangle.prototype.getDelaunayEdgeCW = function(p) {
    if (p === this.points_[0]) {
        return this.delaunay_edge[1];
    } else if (p === this.points_[1]) {
        return this.delaunay_edge[2];
    } else {
        return this.delaunay_edge[0];
    }
};

Triangle.prototype.getDelaunayEdgeCCW = function(p) {
    if (p === this.points_[0]) {
        return this.delaunay_edge[2];
    } else if (p === this.points_[1]) {
        return this.delaunay_edge[0];
    } else {
        return this.delaunay_edge[1];
    }
};

Triangle.prototype.setDelaunayEdgeCW = function(p, e) {
    if (p === this.points_[0]) {
        this.delaunay_edge[1] = e;
    } else if (p === this.points_[1]) {
        this.delaunay_edge[2] = e;
    } else {
        this.delaunay_edge[0] = e;
    }
};

Triangle.prototype.setDelaunayEdgeCCW = function(p, e) {
    if (p === this.points_[0]) {
        this.delaunay_edge[2] = e;
    } else if (p === this.points_[1]) {
        this.delaunay_edge[0] = e;
    } else {
        this.delaunay_edge[1] = e;
    }
};

Triangle.prototype.neighborAcross = function(p) {
    if (p === this.points_[0]) {
        return this.neighbors_[0];
    } else if (p === this.points_[1]) {
        return this.neighbors_[1];
    } else {
        return this.neighbors_[2];
    }
};

Triangle.prototype.oppositePoint = function(t, p) {
    var cw = t.pointCW(p);
    return this.pointCW(cw);
};

Triangle.prototype.legalize = function(opoint, npoint) {
    var points = this.points_;
    if (opoint === points[0]) {
        points[1] = points[0];
        points[0] = points[2];
        points[2] = npoint;
    } else if (opoint === points[1]) {
        points[2] = points[1];
        points[1] = points[0];
        points[0] = npoint;
    } else if (opoint === points[2]) {
        points[0] = points[2];
        points[2] = points[1];
        points[1] = npoint;
    } else {
        throw new Error('poly2tri Invalid Triangle.legalize() call');
    }
};

Triangle.prototype.index = function(p) {
    var points = this.points_;
    if (p === points[0]) {
        return 0;
    } else if (p === points[1]) {
        return 1;
    } else if (p === points[2]) {
        return 2;
    } else {
        throw new Error('poly2tri Invalid Triangle.index() call');
    }
};

Triangle.prototype.edgeIndex = function(p1, p2) {
    var points = this.points_;
    if (p1 === points[0]) {
        if (p2 === points[1]) {
            return 2;
        } else if (p2 === points[2]) {
            return 1;
        }
    } else if (p1 === points[1]) {
        if (p2 === points[2]) {
            return 0;
        } else if (p2 === points[0]) {
            return 2;
        }
    } else if (p1 === points[2]) {
        if (p2 === points[0]) {
            return 1;
        } else if (p2 === points[1]) {
            return 0;
        }
    }
    return -1;
};

Triangle.prototype.markConstrainedEdgeByIndex = function(index) {
    this.constrained_edge[index] = true;
};

Triangle.prototype.markConstrainedEdgeByEdge = function(edge) {
    this.markConstrainedEdgeByPoints(edge.p, edge.q);
};

Triangle.prototype.markConstrainedEdgeByPoints = function(p, q) {
    var points = this.points_;
    if ((q === points[0] && p === points[1]) || (q === points[1] && p === points[0])) {
        this.constrained_edge[2] = true;
    } else if ((q === points[0] && p === points[2]) || (q === points[2] && p === points[0])) {
        this.constrained_edge[1] = true;
    } else if ((q === points[1] && p === points[2]) || (q === points[2] && p === points[1])) {
        this.constrained_edge[0] = true;
    }
};




export {PointError, Point, Triangle, SweepContext};
    