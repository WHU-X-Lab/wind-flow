/**
 * @author: prozac <516060659@qq.com>
 * @createTime: 2018-3-1
 * @copyRight: UNDEFINED
 */

var myRGB = function(hex){
    this.r = parseInt("0x" + hex.slice(1, 3));
    this.g = parseInt("0x" + hex.slice(3, 5));
    this.b = parseInt("0x" + hex.slice(5, 7));
};

myRGB.prototype.toRGB = function() {
    return 'rgb(' + this.r + ',' + this.g + ',' + this.b + ')';
};

var Vector = function(x, y) {
    this.x = x;
    this.y = y;
};

Vector.prototype.length = function() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
};

Vector.prototype.setScale = function(scale) {
    this.x *= scale;
    this.y *= scale;
};

Vector.prototype.addVector = function(v, scale, invert) {
    scale = scale || 1;
    invert = invert || false;
    if(invert){
        this.x = v.x + this.x * scale;
        this.y = v.y + this.y * scale;
    }else{
        this.x += v.x * scale;
        this.y += v.y * scale;
    }
};

Vector.prototype.addFriction = function(frictionScale) {
    frictionScale = frictionScale || 0.5;
    this.addVector(this, -frictionScale);
};


var Particle = function(x, y, age) {
    this.x = x;
    this.y = y;
    this.oldX = -1;
    this.oldY = -1;
    this.age = age || 20;
};

var VectorField = function(data) {
    this.field = [];
    this.data = data;
};

VectorField.prototype.read = function() {
    var data = this.data;
    var field = [];
    this.x0 = data.x0;
    this.x1 = data.x1;
    this.y0 = data.y0;
    this.y1 = data.y1;

    var w = data.gridWidth;
    var h = data.gridHeight;
    var index = 0;

    for(var i = 0; i < w; i++){
        field[i] = [];
        for(var j = 0; j < h; j++){
            var vx = data.field[index++];
            var vy = data.field[index++];
            var v = new Vector(vx,vy);

            field[i][j] = v;
        }
    }
    this.w = w;
    this.h = h;
    this.field = field;
    this.getMaxLen();

    return this;
};

VectorField.prototype.getMaxLen = function() {
    this.maxLength = 0;
    var field = this.field;
    var mx = 0;
    var my = 0;
    for (var i = 0; i < this.w; i++) {
      for (var j = 0; j < this.h; j++) {
            if (field[i][j].length() > this.maxLength) {
                mx = i;
                my = j;
            }
            this.maxLength = Math.max(this.maxLength, field[i][j].length());
        }
    }
};

VectorField.prototype.bilinear = function(coord, a, b) {
    var na = Math.floor(a);
    var nb = Math.floor(b);
    var ma = Math.ceil(a);
    var mb = Math.ceil(b);
    var fa = a - na;
    var fb = b - nb;

    return this.field[na][nb][coord] * (1 - fa) * (1 - fb) +
            this.field[ma][nb][coord] * fa * (1 - fb) +
            this.field[na][mb][coord] * (1 - fa) * fb +
            this.field[ma][mb][coord] * fa * fb;
};

VectorField.prototype.getValue = function(x, y) {
    var a = (this.w - 1 - 1e-6) * (x - this.x0) / (this.x1 - this.x0);
    var b = (this.h - 1 - 1e-6) * (y - this.y0) / (this.y1 - this.y0);
    var vx = this.bilinear('x', a, b);
    var vy = this.bilinear('y', a, b);

    return new Vector(vx, vy);
};

VectorField.prototype.inBounds = function(x, y) {
    return x >= this.x0 && x < this.x1 && y >= this.y0 && y < this.y1;
};

var MotionDisplay = function(canvas, field, projection, assets, stats, first) {
    this.x0 = field.x0;
    this.x1 = field.x1;
    this.y0 = field.y0;
    this.y1 = field.y1;
    this.canvas = canvas;
    this.field = field;
    this.projection = projection;
    this.assets = assets;
    this.stats = stats;
    this.first = typeof(first) == 'undefined' ? true : first;
    this.firstClr = true;
    this.particles = [];

    // opt-assets
    this.numParticles = assets.numParticles;
    this.speed = assets.speed;
    this.lineWidth = assets.lineWidth;
    this.age = assets.age;
    this.opacityDelta = assets.opacityDelta;

    // color-assets
    this.rgb = '40, 40, 40';
	this.background = 'rgb(' + this.rgb + ')';
	this.backgroundAlpha = 'rgba(' + this.rgb + ',' + this.opacityDelta + ')';
    this.threshold = assets.colorThreshHold;
    this.startClr = new myRGB(assets.gradientStartClr);
    this.midClr = new myRGB(assets.gradientMidClr);
    this.endClr = new myRGB(assets.gradientEndClr);

    this.makeNewParticles();
};

MotionDisplay.prototype.makeParticle = function() {
    var a = Math.random();
    var b = Math.random();
    var x = a * this.x0 + (1 - a) * this.x1;
    var y = b * this.y0 + (1 - b) * this.y1;

    return new Particle(x, y, 1 + this.age * Math.random());
};

MotionDisplay.prototype.makeNewParticles = function() {
    for (var i = 0; i < this.numParticles; i++) {
        this.particles.push(this.makeParticle());
    }
};

MotionDisplay.prototype.animate = function() {
    this.moveThings();
    this.draw();
};

MotionDisplay.prototype.render = function() {
    setInterval(function() {
        this.DISPLAY.animate();
        this.DISPLAY.stats.update();
    }, 1000 / this.assets.frequency);
};

MotionDisplay.prototype.moveThings = function() {
    var speed = this.speed;
    for (var i = 0; i < this.particles.length; i++) {
		var p = this.particles[i];
		if (p.age > 0 && this.field.inBounds(p.x, p.y)) {
		    var a = this.field.getValue(p.x, p.y);

            if(this.assets.acceleratable){
                // 加速度模式
                if(typeof(p.v) !== 'undefined'){
                    p.v.addVector(a, this.assets.accelerateV, true);
                }else {
                    p.v = a;
                }
            }else{
                // 普通模式
                p.v = a;
            }

            // 启用摩擦力
            if(this.assets.fricable){
                p.v.addFriction(this.assets.frictionScale);
            }

		    p.x += speed * p.v.x;
			p.y += speed * p.v.y;
			p.age--;
		} else {
			this.particles[i] = this.makeParticle();
		}
	}
};

MotionDisplay.prototype.getClr = function(v) {
    function gradient(value, min, max){
        var len = max - min;
        return Math.round(min + len * value);
    }

    function setClr(whichRGB, value, threshold) {
        if(value < threshold){
            return gradient(value, startClr[whichRGB], midClr[whichRGB]);
        }else {
            return gradient(value, midClr[whichRGB], endClr[whichRGB]);
        }
    }

    var defaultGradColors = {
        0.0: '#3288bd',
        0.1: '#66c2a5',
        0.2: '#abdda4',
        0.3: '#e6f598',
        0.4: '#fee08b',
        0.5: '#fdae61',
        0.6: '#f46d43',
        1.0: '#d53e4f'
    };
    var r, g, b;
    var startClr = this.startClr;
    var midClr = this.midClr;
    var endClr = this.endClr;
    var len = this.field.maxLength;
    var threshold = this.threshold;
    if(len !== 0){
        var value = v / len;
        value = Math.floor(value * 10) / 10;
        value = value > 0.6 ? 1 : value;
        if(this.assets.colorMode == "condition"){
            return defaultGradColors[value];
        }else{
            r = setClr('r', value, threshold);
            g = setClr('g', value, threshold);
            b = setClr('b', value, threshold);
        }

    }else{
        r = startClr.r;
        g = startClr.g;
        b = startClr.b;
    }

    // draw legend
    if(this.firstClr){
        this.firstClr = false;
        $('#legend').css("background","linear-gradient(to right,"+startClr.toRGB()+","+midClr.toRGB()+","+endClr.toRGB()+")");
    }

    return 'rgb(' + r + ',' + g + ',' + b + ')';
};

MotionDisplay.prototype.draw = function() {
    var g = this.canvas.getContext('2d');
    var w = this.canvas.width;
    var h = this.canvas.height;
    if (this.first) {
        g.fillStyle = this.background;
        this.first = false;
      } else {
          g.fillStyle = this.backgroundAlpha;
      }

    g.fillRect(0, 0, w, h);
    for (var i = 0; i <this.particles.length; i++) {
        var p = this.particles[i];
        //var proj = this.projection.project(p.x, p.y, this.field, this.canvas);
        var proj = this.projection.project(p.x, p.y);
        g.lineWidth = this.lineWidth;
        if (p.oldX != -1) {
            if(this.assets.colorMode !== "none"){
                g.strokeStyle = this.getClr(p.v.length());
            }else {
                g.strokeStyle='#ccc';
            }
            g.beginPath();
            g.moveTo(proj.x, proj.y);
            g.lineTo(p.oldX, p.oldY);
            g.stroke();
        }
        p.oldX = proj.x;
        p.oldY = proj.y;
  }
};
