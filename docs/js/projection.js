var Vector = function(x, y) {
    this.x = x;
    this.y = y;
};

var IDProjection = {
	project: function(x, y, opt_v) {
		var v = opt_v || new Vector();
		v.x = x;
		v.y = y;
	  return v;
  },
	invert: function(x, y, opt_v) {
		var v = opt_v || new Vector();
		v.x = x;
		v.y = y;
	  return v;
  }
};

var simpleProj = function() {
    return {
        project : function(x, y, field, canvas) {
            var x0 = field.x0;
            var x1 = field.x1;
            var y0 = field.y0;
            var y1 = field.y1;
            var h = canvas.height;
            var w = canvas.width;

            var proj = new Vector(
                (x - x0) / (x1 - x0) * w,
                (h - (y - y0) / (y1 - y0) * h)
            );
            return proj;
        }
    };
};

/**
 * Albers equal-area projection.
 * Constant param values after d3 (Bostock, Carden).
 */
var Albers = function() {
  function radians(degrees) {
		return Math.PI * degrees / 180;
  }

  var phi1 = radians(29.5);
  var phi2 = radians(45.5);
  var n = 0.5 * (phi1 + phi2);
	var C = Math.cos(phi1) * Math.cos(phi1) + 2 * n * Math.sin(phi1);
	var phi0 = radians(38);
	var lambda0 = radians(-98);
	var rho0 = Math.sqrt(C - 2 * n * Math.sin(phi0)) / n;

  return {
		project: function(lon, lat, opt_result) {
		  lon = radians(lon);
		  lat = radians(lat);
		  var theta = n * (lon - lambda0);
		  var rho = Math.sqrt(C - 2 * n * Math.sin(lat)) / n;
		  var x = rho * Math.sin(theta);
		  var y = rho0 - rho * Math.cos(theta);
			if (opt_result) {
		    opt_result.x = x;
		    opt_result.y = y;
		    return opt_result;
	    }
		  return new Vector(x, y);
		},
		invert: function(x, y) {
			var rho2 = x * x + (rho0 - y) * (rho0 - y);
			var theta = Math.atan(x / (rho0 - y));
			var lon = lambda0 + theta / n;
			var lat = Math.asin((C / n - rho2 * n) / 2);
			return new Vector(lon * 180 / Math.PI, lat * 180 / Math.PI);
		}
	};
}();


var ScaledAlbers = function(scale, offsetX, offsetY, longMin, latMin) {
	this.scale = scale;
	this.offsetX = offsetX;
	this.offsetY = offsetY;
	this.longMin = longMin;
	this.latMin = latMin;
  this.swCorner = Albers.project(longMin, latMin);
};

ScaledAlbers.temp = new Vector(0, 0);

ScaledAlbers.prototype.project = function(lon, lat, opt_result) {
  var proj = Albers.project(lon, lat, ScaledAlbers.temp);
  var a = proj.x;
	var b = proj.y;
	var x = this.scale * (a - this.swCorner.x) + this.offsetX;
	var y = -this.scale * (b - this.swCorner.y) + this.offsetY;
	if (opt_result) {
		opt_result.x = x;
		opt_result.y = y;
		return opt_result;
	}
	return new Vector(x, y);
};

ScaledAlbers.prototype.invert = function(x, y) {
	var a = (x - this.offsetX) / this.scale + this.swCorner.x;
	var b = (y - this.offsetY) / -this.scale + this.swCorner.y;
	return Albers.invert(a, b);
};
