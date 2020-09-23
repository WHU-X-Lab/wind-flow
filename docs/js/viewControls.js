/*
    Created by Lizhiyuan on 2018/3/2
 */

var ViewControl = function() {
    this.distance = 1000;
    this.x = 0;
    this.y = 0;
    this.moveSpeed = 10;
};

ViewControl.prototype.addValue = function(value, d) {
    this[value] += d * this.moveSpeed;
};

ViewControl.prototype.addKeyEvent = function(keyCode, fx){
    $(document).keydown(function(event){
        if(event.keyCode == keyCode){
            fx();
        }
    });
};
