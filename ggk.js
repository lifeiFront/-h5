/**
 * [ScratchCard 刮刮卡 ：分上下两层canvas，底层canvas是奖品区，上层canvas为奖品遮罩区。容器元素尽量不要加太多额外样式。每次刷新再次抽奖时，可重置有效区占比。]
 * @param {[type]} config [初始化参数，json对象]
 * lifei 20151229
 */
function ScratchCard(config) {
    this.conId = config.id || 'scratchContainer'; //刮奖区域id
    this.conNode = document.getElementById(this.conId); //容器dom对象
    this.cover = config.cover || '#CCC'; //遮罩层如果是颜色，色值；如果是图片，图片路径
    this.coverType = config.coverType || 'color'; //遮罩层时图片，还是纯色   'color'||'image'
    this.background = config.background || null; //奖品区canvas
    this.backgroundClass = config.backgroundClass || 'backgroundClass' //奖品区canvas样式类;
    this.backCtx = config.backCtx || null; //奖品区上下文
    this.textColor = config.textColor || '#F60'; //奖品区文本颜色（scratchType为text时设置）
    this.fontSize = config.fontSize || 30; //文本大小（scratchType为text时设置）
    this.backColor = config.backColor || '#FFF'; //奖品区画布填充色（scratchType为text时设置）
    this.mask = config.mask || null; //遮罩层canvas
    this.maskClass = config.maskClass || 'maskClass'; //遮罩层canvas样式类
    this.maskCtx = config.maskCtx || null; //奖品遮罩层画布上下文环境
    this.scratch = config.scratch || null; //奖品去，图片或者是文字
    this.scratchType = config.scratchType || null; //'image'||'text'  scratch与scratchType要保持一致
    this.width = config.width || 300; //画布宽高，如果为图像的话，宽高会与图像宽高自动保持一致，不用设置宽高值
    this.height = config.height || 100;
    this.percentCallback = config.percentCallback || function() {}; //回调函数,刮开区域到达一定比例，调用
    this.isMouseDown = false; //鼠标按下时欢动鼠标才有擦除效果（pc与移动）
    this.effectivePerW = config.effectivePerW || 1; //有效区域占比(0-1)，横向。有效区域居中
    this.effectivePerH = config.effectivePerH || 1; //有效区域占比，纵向。
    this.ratio = 1; //获取缩放比，canvas画完后设置样式100%后，canvas活缩放，但实际大小还是原来设定的宽高值，后续的操作仍然是基于原始宽度高度值操作。此处计算宽高比例,后面会对其重新赋值。
    this.radius = config.radius || 10; //刮涂层的圆点半径
 
    this.drawScratch(); //初始化
}
ScratchCard.prototype = {
    createElement: function(tagName, attributes) { //创建元素方法
        var ele = document.createElement(tagName);
        for (var key in attributes) {
            ele.setAttribute(key, attributes[key]);
        };
        return ele;
    },
    getTransparentPercent: function(ctx, width, height) { //获取有效区域刮开比
        var imgData = ctx.getImageData(width * (1 - this.effectivePerW) / 2, height * (1 - this.effectivePerH) / 2, width * this.effectivePerW, height * this.effectivePerH), //获取的是整个刮奖卡的占比，可以更改为有效区域的刮开比，更合适;ctx.getImageData(20, 30, 合适的宽度, 合适的高度)。
            pixles = imgData.data,
            transPixs = [];
        for (var i = 0, j = pixles.length; i < j; i += 4) {
            var a = pixles[i + 3];
            if (a == 0) { //透明区域
                transPixs.push(i);
            }
        }
        return (transPixs.length / (pixles.length / 4) * 100).toFixed(2); //透明区域占比，保留两位小数
    },
    resizeCanvas: function(canvas, width, height) { //重绘canvas
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').clearRect(0, 0, width, height);
    },
    drawPoint: function(x, y) { //描点
        var _this = this;
        this.maskCtx.beginPath();
        this.maskCtx.fillStyle = 'rgba(0, 0, 0, 1)';
        this.maskCtx.arc(x, y, _this.radius, 0, Math.PI * 2, true);
        this.maskCtx.closePath();
        this.maskCtx.fill();
    },
    bindEvent: function() {
        var _this = this;
        var device = (/android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(navigator.userAgent.toLowerCase())); //判断设备类型
        var startEvtName = device ? 'touchstart' : 'mousedown';
        var moveEvtName = device ? 'touchmove' : 'mousemove';
        var endEvName = device ? 'touchend' : 'mouseup';
        document.addEventListener(endEvName, function(e) {
            _this.isMouseDown = false;
            _this.percentCallback.call(null, _this.getTransparentPercent(_this.maskCtx, _this.width, _this.height)); //滑动结束时，计算一次刮开比。执行回调函数
        }, false);
        document.addEventListener(moveEvtName, function(e) {
            e.preventDefault();
        }, false);
        this.mask.addEventListener(startEvtName, function(e) {
            _this.isMouseDown = true;
            var docEle = document.documentElement;            var x = (device ? e.touches[0].clientX : e.clientX) - _this.mask.getBoundingClientRect().left;
            var y = (device ? e.touches[0].clientY : e.clientY) - _this.mask.getBoundingClientRect().top;
            _this.drawPoint(x / _this.ratio, y / _this.ratio); //按照缩放比例换算后的结果
        }, false);

        this.mask.addEventListener(moveEvtName, function(e) {
            if (!device && !_this.isMouseDown) {
                return false;
            }
            var docEle = document.documentElement;
            var x = (device ? e.touches[0].clientX : e.clientX) - _this.mask.getBoundingClientRect().left;
            var y = (device ? e.touches[0].clientY : e.clientY) - _this.mask.getBoundingClientRect().top;
            _this.drawPoint(x / _this.ratio, y / _this.ratio); //按照缩放比例换算后的结果
        }, false);
    },
    
    drawScratch: function() {
        this.background = this.background || this.createElement('canvas', {
            style: 'position:relative;left:0;top:0;width:100%;',
            class: this.backgroundClass //放置样式变量
        });
        this.mask = this.mask || this.createElement('canvas', {
            style: 'position:absolute;left:0;top:0;z-index:5;width:100%;',
            class: this.maskClass //放置样式变量
        });

        if (!this.conNode.innerHTML.replace(/[\w\W]| /g, '')) {
            this.conNode.appendChild(this.background);
            this.conNode.appendChild(this.mask);
            this.bindEvent();
        }

        this.backCtx = this.backCtx || this.background.getContext('2d');
        this.maskCtx = this.maskCtx || this.mask.getContext('2d');

        if (this.scratchType == 'image') { //奖品区为图像
            var image = new Image(),
                _this = this;
            image.onload = function() {
                _this.width = this.width;
                _this.height = this.height;
                _this.resizeCanvas(_this.background, this.width, this.height);
                _this.backCtx.drawImage(this, 0, 0); //画图，可指定图像位置及图像宽高。此处按照实际图像大小画。
                _this.drawMask();
                _this.ratio = _this.background.offsetWidth / _this.background.width;
            }
            image.src = this.scratch;
        } else if (this.scratchType == 'text') {
            this.width = this.width;
            this.height = this.height;
            this.resizeCanvas(this.background, this.width, this.height);
            this.backCtx.save();
            this.backCtx.fillStyle = this.backColor;
            this.backCtx.fillRect(0, 0, this.width, this.height);
            this.backCtx.restore();
            this.backCtx.save();
            this.backCtx.font = 'Bold ' + this.fontSize + 'px Arial';
            this.backCtx.textAlign = 'center';
            this.backCtx.fillStyle = this.textColor;
            this.backCtx.fillText(this.scratch, this.width / 2, this.height / 2 + this.fontSize / 2);
            this.backCtx.restore();
            this.drawMask();
            this.ratio = this.background.offsetWidth / this.background.width;
        }
    },
    drawMask: function() {
        this.resizeCanvas(this.mask, this.width, this.height);//canvas画布已存在.
        if (this.coverType == 'color') {
            this.maskCtx.fillStyle = this.cover;
            this.maskCtx.fillRect(0, 0, this.width, this.height);
            this.maskCtx.globalCompositeOperation = 'destination-out'; //在同一个画布中，重叠的部分消失。无论设置的背景色颜色值是多少，当有透明度是，重叠部分，均呈现白色透明度
        } else if (this.coverType == 'image') {
            var image = new Image(),
                _this = this;
            image.onload = function() {//遮罩层是图片，图片加载后只是将图片绘制到画布上，在此之前canvas已存在。
                _this.maskCtx.drawImage(this, 0, 0, this.width, this.height); //如果遮罩层为图像，保证遮罩层图像大小跟奖品图像一致。指定宽高值
                _this.maskCtx.globalCompositeOperation = 'destination-out';
            }
            image.src = this.cover;
        }
    },
    refresh: function(scratch, scratchType,effectivePerW,effectivePerH) {//refresh方法只是将对象新建后会变动的变量重置，不传参数，只是重绘。
        this.scratch = scratch || this.scratch;
        this.scratchType = scratchType || this.scratchType;
        this.effectivePerW = effectivePerW || this.effectivePerW; //有效区域占比(0-1)，横向。有效区域居中
        this.effectivePerH = effectivePerH || this.effectivePerH; //有效区域占比，纵向。
        this.drawScratch();
    }
}

window.onload = function() {
    var scratch = new ScratchCard({
        percentCallback: function(percent) {
            document.getElementById('drawPercent').innerHTML = percent + '%';
        },
        scratch: 'p_0.jpg',
        scratchType: 'image',
        effectivePerW: 0.4, //设置有效区域占比
        effectivePerH: 0.4
    });

    document.getElementById('freshBtn').onclick = function() {
        document.getElementById('drawPercent').innerHTML = '0%';
        scratch.refresh(getRandomStr(10), 'text'); //重新初始化刮刮卡
    }

};

function getRandomStr(len) { //模拟刮奖获取数据
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (var i = 0; i < len; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    return text;
}