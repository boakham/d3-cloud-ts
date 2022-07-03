import * as d3 from 'd3-dispatch';

// Word cloud layout by Jason Davies, https://www.jasondavies.com/wordcloud/
var D3CloudTs;
(function (D3CloudTs) {
    class Cloud {
        constructor() {
            this.cw = (1 << 11) >> 5;
            this.ch = 1 << 11;
            this.size = [256, 256];
            this.text = this.cloudText;
            this.font = this.cloudFont;
            this.fontSize = this.cloudFontSize;
            this.fontStyle = this.cloudFontNormal;
            this.fontWeight = this.cloudFontNormal;
            this.rotate = this.cloudRotate;
            this.padding = this.cloudPadding;
            this.spiral = this.archimedeanSpiral;
            this.words = [];
            this.timeInterval = Infinity;
            this.event = d3.dispatch('word', 'end');
            this.random = Math.random;
            this.canvas = this.cloudCanvas;
            this.board = this.zeroArray((this.size[0] >> 5) * this.size[1]);
            this.bounds = null;
            this.dataSizeChanges = false;
            this.biggestSize = 0;
            this.config = {};
            this.getContext = (canvas) => {
                canvas.width = canvas.height = 1;
                let ratio = Math.sqrt(canvas.getContext('2d').getImageData(0, 0, 1, 1).data.length >> 2);
                canvas.width = (this.cw << 5) / ratio;
                canvas.height = this.ch / ratio;
                let context = canvas.getContext('2d');
                context.fillStyle = context.strokeStyle = 'red';
                context.textAlign = 'center';
                return { context: context, ratio: ratio };
            };
            this.place = (board, tag, bounds) => {
                //let perimeter = [{x: 0, y: 0}, {x: this.size[0], y: this.size[1]}];
                let startX = tag.x;
                let startY = tag.y;
                let maxDelta = Math.sqrt(this.size[0] * this.size[0] + this.size[1] * this.size[1]);
                let s = this.spiral(this.size);
                let dt = this.random() < 0.5 ? 1 : -1;
                let t = -dt;
                let dxdy;
                let dx;
                let dy;
                while ((dxdy = s((t += dt)))) {
                    dx = ~~dxdy[0];
                    dy = ~~dxdy[1];
                    if (Math.min(Math.abs(dx), Math.abs(dy)) >= maxDelta)
                        break;
                    tag.x = startX + dx;
                    tag.y = startY + dy;
                    if (tag.x + tag.x0 < 0 ||
                        tag.y + tag.y0 < 0 ||
                        tag.x + tag.x1 > this.size[0] ||
                        tag.y + tag.y1 > this.size[1])
                        continue;
                    // TODO only check for collisions within current bounds.
                    if (!bounds || !this.cloudCollide(tag, board, this.size[0])) {
                        if (!bounds || this.collideRects(tag, bounds)) {
                            let sprite = tag.sprite;
                            let w = tag.width >> 5;
                            let sw = this.size[0] >> 5;
                            let lx = tag.x - (w << 4);
                            let sx = lx & 0x7f;
                            let msx = 32 - sx;
                            let h = tag.y1 - tag.y0;
                            let x = (tag.y + tag.y0) * sw + (lx >> 5);
                            let last;
                            for (let j = 0; j < h; j++) {
                                last = 0;
                                for (let i = 0; i <= w; i++) {
                                    board[x + i] |=
                                        (last << msx) |
                                            (i < w ? (last = sprite[j * w + i]) >>> sx : 0);
                                }
                                x += sw;
                            }
                            delete tag.sprite;
                            return true;
                        }
                    }
                }
                return false;
            };
            this.functor = (returnVal) => {
                return typeof returnVal === 'function'
                    ? returnVal
                    : (_, d, i) => {
                        return returnVal;
                    };
            };
            this.spirals = {
                archimedean: this.archimedeanSpiral,
                rectangular: this.rectangularSpiral,
            };
            this.config.start = () => {
                if (!this.contextAndRatio)
                    this.contextAndRatio = this.getContext(this.canvas());
                const n = this.words.length;
                let i = -1;
                let tags = [];
                this.dataSizeChanges = false;
                this.words.forEach((d, i) => {
                    if (d.size && d.value != 0 && d.size != ~~this.fontSize(this, d, i)) {
                        this.dataSizeChanges = true;
                    }
                });
                let data;
                let newBiggest = 0;
                data = this.words
                    .map((d, i) => {
                    if (!d.size || this.dataSizeChanges) {
                        d.text = this.text(this, d, i);
                        d.font = this.font(this, d, i);
                        d.style = this.fontStyle(this, d, i);
                        d.weight = this.fontWeight(this, d, i);
                        d.rotate = this.rotate(this, d, i);
                        d.size = (d.value != 0) ? ~~this.fontSize(this, d, i) : 0;
                        d.padding = this.padding(this, d, i);
                        d.doneAlready = false;
                        if (d.size > newBiggest) {
                            newBiggest = d.size;
                        }
                    }
                    return d;
                })
                    .sort((a, b) => {
                    return b.size - a.size;
                });
                if (newBiggest != this.biggestSize) {
                    this.biggestSize = newBiggest;
                    this.dataSizeChanges = true;
                }
                if (this.dataSizeChanges) {
                    this.contextAndRatio = this.getContext(this.canvas());
                    this.board = this.zeroArray((this.size[0] >> 5) * this.size[1]);
                    this.bounds = null;
                }
                let step = () => {
                    let start = Date.now();
                    while (Date.now() - start < this.timeInterval &&
                        ++i < n &&
                        this.timer) {
                        let d = data[i];
                        if (this.dataSizeChanges || !d.doneAlready) {
                            d.x = (this.size[0] * (this.random() + 0.5)) >> 1;
                            d.y = (this.size[1] * (this.random() + 0.5)) >> 1;
                            this.cloudSprite(this.contextAndRatio, d, data, i);
                            if (d.hasText && this.place(this.board, d, this.bounds)) {
                                d.doneAlready = true;
                                if (d.value != 0) {
                                    tags.push(d);
                                }
                                this.event.call('word', this.config, d);
                                if (this.bounds)
                                    this.cloudBounds(this.bounds, d);
                                else
                                    this.bounds = [
                                        { x: d.x + d.x0, y: d.y + d.y0 },
                                        { x: d.x + d.x1, y: d.y + d.y1 },
                                    ];
                                // Temporary hack
                                d.x -= this.size[0] >> 1;
                                d.y -= this.size[1] >> 1;
                            }
                        }
                        else {
                            if (d.value != 0) {
                                tags.push(d);
                            }
                        }
                    }
                    if (i >= n) {
                        this.config.stop();
                        this.event.call('end', this.config, tags, this.bounds);
                    }
                };
                if (this.timer)
                    clearInterval(this.timer);
                this.timer = setInterval(() => 0, 0);
                step();
                return this.config;
            };
            this.config.canvas = (_) => {
                return ((_ ? ((this.canvas = this.functor(_)), this.config) : this.canvas));
            };
            this.config.stop = () => {
                if (this.timer) {
                    clearInterval(this.timer);
                    this.timer = null;
                }
                return this.config;
            };
            this.config.timeInterval = (_) => {
                return ((_
                    ? ((this.timeInterval = _ == null ? Infinity : _), this.config)
                    : this.timeInterval));
            };
            this.config.words = (_) => {
                return (_ ? ((this.words = _), this.config) : this.words);
            };
            this.config.size = (_) => {
                return ((_ ? ((this.size = [+_[0], +_[1]]), this.config) : this.size));
            };
            this.config.font = (_) => {
                return ((_ ? ((this.font = this.functor(_)), this.config) : this.font));
            };
            this.config.fontStyle = (_) => {
                return ((_
                    ? ((this.fontStyle = this.functor(_)), this.config)
                    : this.fontStyle));
            };
            this.config.fontWeight = (_) => {
                return ((_
                    ? ((this.fontWeight = this.functor(_)), this.config)
                    : this.fontWeight));
            };
            this.config.rotate = (_) => {
                return ((_ ? ((this.rotate = this.functor(_)), this.config) : this.rotate));
            };
            this.config.text = (_) => {
                return ((_ ? ((this.text = this.functor(_)), this.config) : this.text));
            };
            this.config.spiral = (_) => {
                return ((_
                    ? ((this.spiral =
                        _ == 'archimedean' || _ == 'rectangular'
                            ? this.spirals[_]
                            : _),
                        this.config)
                    : this.spiral));
            };
            this.config.fontSize = (_) => {
                return ((_ ? ((this.fontSize = this.functor(_)), this.config) : this.fontSize));
            };
            this.config.padding = (_) => {
                return ((_ ? ((this.padding = this.functor(_)), this.config) : this.padding));
            };
            this.config.random = (_) => {
                return ((_ ? ((this.random = _), this.config) : this.random));
            };
            this.config.on = (_) => {
                let value = this.event.on.apply(this.event, _);
                return (value === this.event ? this.config : value);
            };
        }
        cloudText(_, d, i) {
            return d.text;
        }
        cloudFont(_, d, i) {
            return 'serif';
        }
        cloudFontNormal(_, d, i) {
            return 'normal';
        }
        cloudFontSize(_, d, i) {
            return Math.sqrt(d.value);
        }
        cloudRotate(_, d, i) {
            return (~~(Math.random() * 6) - 3) * 30;
        }
        cloudPadding(_, d, i) {
            return 1;
        }
        // Fetches a monochrome sprite bitmap for the specified text.
        // Load in batches for speed.
        cloudSprite(contextAndRatio, d, data, di) {
            if (d.sprite)
                return;
            let c = contextAndRatio.context;
            let ratio = contextAndRatio.ratio;
            c.clearRect(0, 0, (this.cw << 5) / ratio, this.ch / ratio);
            let x = 0;
            let y = 0;
            let maxh = 0;
            let n = data.length;
            --di;
            while (++di < n) {
                d = data[di];
                c.save();
                c.font =
                    d.style +
                        ' ' +
                        d.weight +
                        ' ' +
                        ~~((d.size + 1) / ratio) +
                        'px ' +
                        d.font;
                let w = c.measureText(d.text + 'm').width * ratio;
                let h = d.size << 1;
                if (d.rotate) {
                    let sr = Math.sin(d.rotate * Cloud.cloudRadians);
                    let cr = Math.cos(d.rotate * Cloud.cloudRadians);
                    let wcr = w * cr;
                    let wsr = w * sr;
                    let hcr = h * cr;
                    let hsr = h * sr;
                    w =
                        ((Math.max(Math.abs(wcr + hsr), Math.abs(wcr - hsr)) + 0x1f) >>
                            5) <<
                            5;
                    h = ~~Math.max(Math.abs(wsr + hcr), Math.abs(wsr - hcr));
                }
                else {
                    w = ((w + 0x1f) >> 5) << 5;
                }
                if (h > maxh)
                    maxh = h;
                if (x + w >= this.cw << 5) {
                    x = 0;
                    y += maxh;
                    maxh = 0;
                }
                if (y + h >= this.ch)
                    break;
                c.translate((x + (w >> 1)) / ratio, (y + (h >> 1)) / ratio);
                if (d.rotate)
                    c.rotate(d.rotate * Cloud.cloudRadians);
                c.fillText(d.text, 0, 0);
                if (d.padding)
                    (c.lineWidth = 2 * d.padding), c.strokeText(d.text, 0, 0);
                c.restore();
                d.width = w;
                d.height = h;
                d.xoff = x;
                d.yoff = y;
                d.x1 = w >> 1;
                d.y1 = h >> 1;
                d.x0 = -d.x1;
                d.y0 = -d.y1;
                d.hasText = true;
                x += w;
            }
            let pixels = c.getImageData(0, 0, (this.cw << 5) / ratio, this.ch / ratio).data;
            let sprite = [];
            while (--di >= 0) {
                d = data[di];
                if (!d.hasText)
                    continue;
                let w = d.width;
                let w32 = w >> 5;
                let h = d.y1 - d.y0;
                // Zero the buffer
                for (let i = 0; i < h * w32; i++)
                    sprite[i] = 0;
                x = d.xoff;
                if (x == null)
                    return;
                y = d.yoff;
                let seen = 0;
                let seenRow = -1;
                for (let j = 0; j < h; j++) {
                    for (let i = 0; i < w; i++) {
                        let k = w32 * j + (i >> 5);
                        let m = pixels[((y + j) * (this.cw << 5) + (x + i)) << 2]
                            ? 1 << (31 - (i % 32))
                            : 0;
                        sprite[k] |= m;
                        seen |= m;
                    }
                    if (seen)
                        seenRow = j;
                    else {
                        d.y0++;
                        h--;
                        j--;
                        y++;
                    }
                }
                d.y1 = d.y0 + seenRow;
                d.sprite = sprite.slice(0, (d.y1 - d.y0) * w32);
            }
        }
        // Use mask-based collision detection.
        cloudCollide(tag, board, sw) {
            sw >>= 5;
            let sprite = tag.sprite;
            let w = tag.width >> 5;
            let lx = tag.x - (w << 4);
            let sx = lx & 0x7f;
            let msx = 32 - sx;
            let h = tag.y1 - tag.y0;
            let x = (tag.y + tag.y0) * sw + (lx >> 5);
            let last;
            for (let j = 0; j < h; j++) {
                last = 0;
                for (let i = 0; i <= w; i++) {
                    if (((last << msx) | (i < w ? (last = sprite[j * w + i]) >>> sx : 0)) &
                        board[x + i])
                        return true;
                }
                x += sw;
            }
            return false;
        }
        cloudBounds(bounds, d) {
            let b0 = bounds[0];
            let b1 = bounds[1];
            if (d.x + d.x0 < b0.x)
                b0.x = d.x + d.x0;
            if (d.y + d.y0 < b0.y)
                b0.y = d.y + d.y0;
            if (d.x + d.x1 > b1.x)
                b1.x = d.x + d.x1;
            if (d.y + d.y1 > b1.y)
                b1.y = d.y + d.y1;
        }
        collideRects(a, b) {
            return (a.x + a.x1 > b[0].x &&
                a.x + a.x0 < b[1].x &&
                a.y + a.y1 > b[0].y &&
                a.y + a.y0 < b[1].y);
        }
        archimedeanSpiral(size) {
            let e = size[0] / size[1];
            return (t) => {
                return [e * (t *= 0.1) * Math.cos(t), t * Math.sin(t)];
            };
        }
        rectangularSpiral(size) {
            let dy = 4;
            let dx = (dy * size[0]) / size[1];
            let x = 0;
            let y = 0;
            return (t) => {
                let sign = t < 0 ? -1 : 1;
                // See triangular numbers: T_n = n * (n + 1) / 2.
                switch ((Math.sqrt(1 + 4 * sign * t) - sign) & 3) {
                    case 0:
                        x += dx;
                        break;
                    case 1:
                        y += dy;
                        break;
                    case 2:
                        x -= dx;
                        break;
                    default:
                        y -= dy;
                        break;
                }
                return [x, y];
            };
        }
        // TODO reuse arrays?
        zeroArray(n) {
            let a = [];
            let i = -1;
            while (++i < n)
                a[i] = 0;
            return a;
        }
        cloudCanvas() {
            return document.createElement('canvas');
        }
    }
    Cloud.cloudRadians = Math.PI / 180;
    D3CloudTs.Cloud = Cloud;
})(D3CloudTs || (D3CloudTs = {}));

/*
 * Public API Surface of d3-cloud-ts
 */

/**
 * Generated bundle index. Do not edit.
 */

export { D3CloudTs };
//# sourceMappingURL=d3-cloud-ts.mjs.map
