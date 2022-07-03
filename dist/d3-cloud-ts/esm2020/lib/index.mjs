// Word cloud layout by Jason Davies, https://www.jasondavies.com/wordcloud/
// Updated by Benjamin Oakham to use D3 7.5.0 (for Strict Mode) and Type Script
// Algorithm due to Jonathan Feinberg, http://static.mrfeinberg.com/bv_ch03.pdf
import * as d3 from 'd3-dispatch';
export var D3CloudTs;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9wcm9qZWN0cy9kMy1jbG91ZC10cy9zcmMvbGliL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLDRFQUE0RTtBQUM1RSwrRUFBK0U7QUFDL0UsK0VBQStFO0FBSS9FLE9BQU8sS0FBSyxFQUFFLE1BQU0sYUFBYSxDQUFDO0FBRWxDLE1BQU0sS0FBVyxTQUFTLENBOHBCekI7QUE5cEJELFdBQWlCLFNBQVM7SUE2RnhCLE1BQWEsS0FBSztRQStCaEI7WUE3QlUsT0FBRSxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNwQixPQUFFLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNiLFNBQUksR0FBcUIsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUM7WUFDcEMsU0FBSSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUM7WUFDdEIsU0FBSSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUM7WUFDdEIsYUFBUSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUM7WUFDOUIsY0FBUyxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUM7WUFDakMsZUFBVSxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUM7WUFDbEMsV0FBTSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUM7WUFDMUIsWUFBTyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUM7WUFDNUIsV0FBTSxHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQztZQUNoQyxVQUFLLEdBQVcsRUFBRSxDQUFDO1lBQ25CLGlCQUFZLEdBQUcsUUFBUSxDQUFDO1lBQ3hCLFVBQUssR0FBRyxFQUFFLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsQ0FBQztZQUVuQyxXQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQztZQUNyQixXQUFNLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQztZQUMxQixV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SUFBSSxDQUFDLEdBQWEsRUFBRSxDQUFDO1lBQ3JCLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQ1gsT0FBTyxFQUFFLENBQUMsR0FBRyxDQUFDO2dCQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDekIsT0FBTyxDQUFDLENBQUM7UUFDWCxDQUFDO1FBRUQsV0FBVztZQUNULE9BQU8sUUFBUSxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUMxQyxDQUFDOztJQWpqQmdCLGtCQUFZLEdBQUcsSUFBSSxDQUFDLEVBQUUsR0FBRyxHQUFHLENBQUM7SUFEbkMsZUFBSyxRQWdrQmpCLENBQUE7QUFDSCxDQUFDLEVBOXBCZ0IsU0FBUyxLQUFULFNBQVMsUUE4cEJ6QiIsInNvdXJjZXNDb250ZW50IjpbIi8vIFdvcmQgY2xvdWQgbGF5b3V0IGJ5IEphc29uIERhdmllcywgaHR0cHM6Ly93d3cuamFzb25kYXZpZXMuY29tL3dvcmRjbG91ZC9cbi8vIFVwZGF0ZWQgYnkgQmVuamFtaW4gT2FraGFtIHRvIHVzZSBEMyA3LjUuMCAoZm9yIFN0cmljdCBNb2RlKSBhbmQgVHlwZSBTY3JpcHRcbi8vIEFsZ29yaXRobSBkdWUgdG8gSm9uYXRoYW4gRmVpbmJlcmcsIGh0dHA6Ly9zdGF0aWMubXJmZWluYmVyZy5jb20vYnZfY2gwMy5wZGZcblxuXG5cbmltcG9ydCAqIGFzIGQzIGZyb20gJ2QzLWRpc3BhdGNoJztcblxuZXhwb3J0IG5hbWVzcGFjZSBEM0Nsb3VkVHMge1xuICB0eXBlIGNhbnZhc1R5cGU8VD4gPSBUIGV4dGVuZHMgSFRNTENhbnZhc0VsZW1lbnQgfCAoKCkgPT4gSFRNTENhbnZhc0VsZW1lbnQpXG4gICAgPyBDbG91ZERhdGFcbiAgICA6ICgpID0+IEhUTUxDYW52YXNFbGVtZW50O1xuXG4gIHR5cGUgdGltZUludmVydmFsVHlwZTxUPiA9IFQgZXh0ZW5kcyBudW1iZXIgfCBudWxsID8gQ2xvdWREYXRhIDogbnVtYmVyO1xuXG4gIHR5cGUgd29yZFR5cGU8VD4gPSBUIGV4dGVuZHMgV29yZFtdID8gQ2xvdWREYXRhIDogV29yZFtdO1xuXG4gIHR5cGUgdGV4dEZ1bmN0b3JUeXBlPFQ+ID0gVCBleHRlbmRzXG4gICAgfCBTdHJpbmdcbiAgICB8ICgoXzogYW55LCBkOiBXb3JkLCBpOiBudW1iZXIpID0+IFN0cmluZylcbiAgICA/IENsb3VkRGF0YVxuICAgIDogKF86IGFueSwgZDogV29yZCwgaTogbnVtYmVyKSA9PiBTdHJpbmc7XG5cbiAgdHlwZSBudW1iZXJGdW5jdG9yVHlwZTxUPiA9IFQgZXh0ZW5kc1xuICAgIHwgbnVtYmVyXG4gICAgfCAoKF86IGFueSwgZDogV29yZCwgaTogbnVtYmVyKSA9PiBudW1iZXIpXG4gICAgPyBDbG91ZERhdGFcbiAgICA6IChfOiBhbnksIGQ6IFdvcmQsIGk6IG51bWJlcikgPT4gbnVtYmVyO1xuXG4gIHR5cGUgc2l6ZVR5cGU8VD4gPSBUIGV4dGVuZHMgbnVtYmVyW10gPyBDbG91ZERhdGEgOiBbbnVtYmVyLCBudW1iZXJdO1xuXG4gIHR5cGUgc3BpcmFsVHlwZTxUPiA9IFQgZXh0ZW5kc1xuICAgIHwgU3RyaW5nXG4gICAgfCAoKHNpemU6IG51bWJlcltdKSA9PiAodDogbnVtYmVyKSA9PiBudW1iZXJbXSlcbiAgICA/IENsb3VkRGF0YVxuICAgIDogKHNpemU6IG51bWJlcltdKSA9PiAodDogbnVtYmVyKSA9PiBudW1iZXJbXTtcblxuICB0eXBlIHJhbmRvbVR5cGU8VD4gPSBUIGV4dGVuZHMgKCkgPT4gbnVtYmVyID8gQ2xvdWREYXRhIDogbnVtYmVyO1xuXG4gIHR5cGUgb25UeXBlPFQ+ID0gVCBleHRlbmRzIGFueVtdID8gQ2xvdWREYXRhIDogYW55O1xuXG4gIGV4cG9ydCBpbnRlcmZhY2UgQ2xvdWREYXRhIHtcbiAgICBjYW52YXM/OiA8VD4oXz86IFQpID0+IGNhbnZhc1R5cGU8VD47XG4gICAgc3RhcnQ/OiAoKSA9PiBDbG91ZERhdGE7XG4gICAgc3RvcD86ICgpID0+IENsb3VkRGF0YTtcbiAgICB0aW1lSW50ZXJ2YWw/OiA8VCBleHRlbmRzIG51bWJlciB8IG51bGw+KF8/OiBUKSA9PiB0aW1lSW52ZXJ2YWxUeXBlPFQ+O1xuICAgIHdvcmRzPzogPFQgZXh0ZW5kcyBXb3JkW10+KF8/OiBUKSA9PiB3b3JkVHlwZTxUPjtcbiAgICBzaXplPzogPFQgZXh0ZW5kcyBudW1iZXJbXT4oXz86IFQpID0+IHNpemVUeXBlPFQ+O1xuICAgIGZvbnQ/OiA8VCBleHRlbmRzIFN0cmluZyB8ICgoXzogYW55LCBkOiBXb3JkLCBpOiBudW1iZXIpID0+IFN0cmluZyk+KFxuICAgICAgXz86IFRcbiAgICApID0+IHRleHRGdW5jdG9yVHlwZTxUPjtcbiAgICBmb250U3R5bGU/OiA8VCBleHRlbmRzIFN0cmluZyB8ICgoXzogYW55LCBkOiBXb3JkLCBpOiBudW1iZXIpID0+IFN0cmluZyk+KFxuICAgICAgXz86IFRcbiAgICApID0+IHRleHRGdW5jdG9yVHlwZTxUPjtcbiAgICBmb250V2VpZ2h0PzogPFQgZXh0ZW5kcyBTdHJpbmcgfCAoKF86IGFueSwgZDogV29yZCwgaTogbnVtYmVyKSA9PiBTdHJpbmcpPihcbiAgICAgIF8/OiBUXG4gICAgKSA9PiB0ZXh0RnVuY3RvclR5cGU8VD47XG4gICAgcm90YXRlPzogPFQgZXh0ZW5kcyBudW1iZXIgfCAoKF86IGFueSwgZDogV29yZCwgaTogbnVtYmVyKSA9PiBudW1iZXIpPihcbiAgICAgIF8/OiBUXG4gICAgKSA9PiBudW1iZXJGdW5jdG9yVHlwZTxUPjtcbiAgICB0ZXh0PzogPFQgZXh0ZW5kcyBTdHJpbmcgfCAoKF86IGFueSwgZDogV29yZCwgaTogbnVtYmVyKSA9PiBTdHJpbmcpPihcbiAgICAgIF8/OiBUXG4gICAgKSA9PiB0ZXh0RnVuY3RvclR5cGU8VD47XG4gICAgc3BpcmFsPzogPFQgZXh0ZW5kcyBTdHJpbmcgfCAoKHNpemU6IG51bWJlcltdKSA9PiAodDogbnVtYmVyKSA9PiBudW1iZXJbXSk+KFxuICAgICAgXz86IFRcbiAgICApID0+IHNwaXJhbFR5cGU8VD47XG4gICAgZm9udFNpemU/OiA8VCBleHRlbmRzIG51bWJlciB8ICgoXzogYW55LCBkOiBXb3JkLCBpOiBudW1iZXIpID0+IG51bWJlcik+KFxuICAgICAgXz86IFRcbiAgICApID0+IG51bWJlckZ1bmN0b3JUeXBlPFQ+O1xuICAgIHBhZGRpbmc/OiA8VCBleHRlbmRzIG51bWJlciB8ICgoXzogYW55LCBkOiBXb3JkLCBpOiBudW1iZXIpID0+IG51bWJlcik+KFxuICAgICAgXz86IFRcbiAgICApID0+IG51bWJlckZ1bmN0b3JUeXBlPFQ+O1xuICAgIHJhbmRvbT86IDxUIGV4dGVuZHMgKCkgPT4gbnVtYmVyPihfPzogVCkgPT4gcmFuZG9tVHlwZTxUPjtcbiAgICBvbj86IDxUIGV4dGVuZHMgYW55WzJdPihfOiBUKSA9PiBvblR5cGU8VD47XG4gIH1cblxuICBleHBvcnQgaW50ZXJmYWNlIFdvcmQge1xuICAgIGtleTogc3RyaW5nO1xuICAgIHZhbHVlOiBudW1iZXI7XG4gICAgdGV4dD86IHN0cmluZztcbiAgICBmb250Pzogc3RyaW5nO1xuICAgIHN0eWxlPzogc3RyaW5nO1xuICAgIHdlaWdodD86IHN0cmluZztcbiAgICByb3RhdGU/OiBudW1iZXI7XG4gICAgc2l6ZT86IG51bWJlcjtcbiAgICBwYWRkaW5nPzogbnVtYmVyO1xuICAgIHNwcml0ZT86IG51bWJlcltdO1xuICAgIHg/OiBudW1iZXI7XG4gICAgeDA/OiBudW1iZXI7XG4gICAgeDE/OiBudW1iZXI7XG4gICAgeG9mZj86IG51bWJlcjtcbiAgICB5PzogbnVtYmVyO1xuICAgIHkwPzogbnVtYmVyO1xuICAgIHkxPzogbnVtYmVyO1xuICAgIHlvZmY/OiBudW1iZXI7XG4gICAgaGFzVGV4dD86IGJvb2xlYW47XG4gICAgd2lkdGg/OiBudW1iZXI7XG4gICAgaGVpZ2h0PzogbnVtYmVyO1xuICAgIGRvbmVBbHJlYWR5PzogYm9vbGVhbjtcbiAgfVxuXG4gIGV4cG9ydCBjbGFzcyBDbG91ZCB7XG4gICAgcHJvdGVjdGVkIHN0YXRpYyBjbG91ZFJhZGlhbnMgPSBNYXRoLlBJIC8gMTgwO1xuICAgIHByb3RlY3RlZCBjdyA9ICgxIDw8IDExKSA+PiA1O1xuICAgIHByb3RlY3RlZCBjaCA9IDEgPDwgMTE7XG4gICAgcHJvdGVjdGVkIHNpemU6IFtudW1iZXIsIG51bWJlcl0gPSBbMjU2LCAyNTZdO1xuICAgIHByb3RlY3RlZCB0ZXh0ID0gdGhpcy5jbG91ZFRleHQ7XG4gICAgcHJvdGVjdGVkIGZvbnQgPSB0aGlzLmNsb3VkRm9udDtcbiAgICBwcm90ZWN0ZWQgZm9udFNpemUgPSB0aGlzLmNsb3VkRm9udFNpemU7XG4gICAgcHJvdGVjdGVkIGZvbnRTdHlsZSA9IHRoaXMuY2xvdWRGb250Tm9ybWFsO1xuICAgIHByb3RlY3RlZCBmb250V2VpZ2h0ID0gdGhpcy5jbG91ZEZvbnROb3JtYWw7XG4gICAgcHJvdGVjdGVkIHJvdGF0ZSA9IHRoaXMuY2xvdWRSb3RhdGU7XG4gICAgcHJvdGVjdGVkIHBhZGRpbmcgPSB0aGlzLmNsb3VkUGFkZGluZztcbiAgICBwcm90ZWN0ZWQgc3BpcmFsID0gdGhpcy5hcmNoaW1lZGVhblNwaXJhbDtcbiAgICBwcm90ZWN0ZWQgd29yZHM6IFdvcmRbXSA9IFtdO1xuICAgIHByb3RlY3RlZCB0aW1lSW50ZXJ2YWwgPSBJbmZpbml0eTtcbiAgICBwcm90ZWN0ZWQgZXZlbnQgPSBkMy5kaXNwYXRjaCgnd29yZCcsICdlbmQnKTtcbiAgICBwcm90ZWN0ZWQgdGltZXI/OiBSZXR1cm5UeXBlPHR5cGVvZiBzZXRJbnRlcnZhbD4gfCBudWxsO1xuICAgIHByb3RlY3RlZCByYW5kb20gPSBNYXRoLnJhbmRvbTtcbiAgICBwcm90ZWN0ZWQgY2FudmFzID0gdGhpcy5jbG91ZENhbnZhcztcbiAgICBwcm90ZWN0ZWQgYm9hcmQ6IG51bWJlcltdID0gdGhpcy56ZXJvQXJyYXkoXG4gICAgICAodGhpcy5zaXplWzBdID4+IDUpICogdGhpcy5zaXplWzFdXG4gICAgKTtcbiAgICBwcm90ZWN0ZWQgYm91bmRzOiB7IHg6IG51bWJlcjsgeTogbnVtYmVyIH1bXSB8IG51bGwgPSBudWxsO1xuICAgIHByb3RlY3RlZCBjb250ZXh0QW5kUmF0aW8hOiB7XG4gICAgICBjb250ZXh0OiBDYW52YXNSZW5kZXJpbmdDb250ZXh0MkQ7XG4gICAgICByYXRpbzogbnVtYmVyO1xuICAgIH07XG4gICAgcHJvdGVjdGVkIGRhdGFTaXplQ2hhbmdlczogYm9vbGVhbiA9IGZhbHNlO1xuICAgIHByb3RlY3RlZCBiaWdnZXN0U2l6ZTogbnVtYmVyID0gMDtcbiAgICBwdWJsaWMgY29uZmlnOiBDbG91ZERhdGEgPSB7fTtcblxuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgdGhpcy5jb25maWcuc3RhcnQgPSAoKSA9PiB7XG4gICAgICAgIGlmICghdGhpcy5jb250ZXh0QW5kUmF0aW8pXG4gICAgICAgICAgdGhpcy5jb250ZXh0QW5kUmF0aW8gPSA8XG4gICAgICAgICAgICB7IGNvbnRleHQ6IENhbnZhc1JlbmRlcmluZ0NvbnRleHQyRDsgcmF0aW86IG51bWJlciB9XG4gICAgICAgICAgPnRoaXMuZ2V0Q29udGV4dCh0aGlzLmNhbnZhcygpKTtcbiAgICAgICAgY29uc3QgbiA9IHRoaXMud29yZHMubGVuZ3RoO1xuICAgICAgICBsZXQgaSA9IC0xO1xuICAgICAgICBsZXQgdGFnczogV29yZFtdID0gW107XG4gICAgICAgIHRoaXMuZGF0YVNpemVDaGFuZ2VzID0gZmFsc2U7XG4gICAgICAgIHRoaXMud29yZHMuZm9yRWFjaCgoZCwgaSkgPT4ge1xuICAgICAgICAgIGlmIChkLnNpemUgJiYgZC52YWx1ZSAhPSAwICYmIGQuc2l6ZSAhPSB+fnRoaXMuZm9udFNpemUodGhpcywgZCwgaSkpIHtcbiAgICAgICAgICAgIHRoaXMuZGF0YVNpemVDaGFuZ2VzID0gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBsZXQgZGF0YTogV29yZFtdO1xuICAgICAgICBsZXQgbmV3QmlnZ2VzdDogbnVtYmVyID0gMDtcbiAgICAgICAgZGF0YSA9IHRoaXMud29yZHNcbiAgICAgICAgICAubWFwKChkLCBpKSA9PiB7XG4gICAgICAgICAgICBpZiAoIWQuc2l6ZSB8fCB0aGlzLmRhdGFTaXplQ2hhbmdlcykge1xuICAgICAgICAgICAgICBkLnRleHQgPSB0aGlzLnRleHQodGhpcywgZCwgaSk7XG4gICAgICAgICAgICAgIGQuZm9udCA9IHRoaXMuZm9udCh0aGlzLCBkLCBpKTtcbiAgICAgICAgICAgICAgZC5zdHlsZSA9IHRoaXMuZm9udFN0eWxlKHRoaXMsIGQsIGkpO1xuICAgICAgICAgICAgICBkLndlaWdodCA9IHRoaXMuZm9udFdlaWdodCh0aGlzLCBkLCBpKTtcbiAgICAgICAgICAgICAgZC5yb3RhdGUgPSB0aGlzLnJvdGF0ZSh0aGlzLCBkLCBpKTtcbiAgICAgICAgICAgICAgZC5zaXplID0gKGQudmFsdWUgIT0gMCk/fn50aGlzLmZvbnRTaXplKHRoaXMsIGQsIGkpOjA7XG4gICAgICAgICAgICAgIGQucGFkZGluZyA9IHRoaXMucGFkZGluZyh0aGlzLCBkLCBpKTtcbiAgICAgICAgICAgICAgZC5kb25lQWxyZWFkeSA9IGZhbHNlO1xuICAgICAgICAgICAgICBpZiAoZC5zaXplISA+IG5ld0JpZ2dlc3QpIHtcbiAgICAgICAgICAgICAgICBuZXdCaWdnZXN0ID0gZC5zaXplITtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGQ7XG4gICAgICAgICAgfSlcbiAgICAgICAgICAuc29ydCgoYSwgYikgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIGIuc2l6ZSEgLSBhLnNpemUhO1xuICAgICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgaWYgKG5ld0JpZ2dlc3QgIT0gdGhpcy5iaWdnZXN0U2l6ZSkge1xuICAgICAgICAgIHRoaXMuYmlnZ2VzdFNpemUgPSBuZXdCaWdnZXN0O1xuICAgICAgICAgIHRoaXMuZGF0YVNpemVDaGFuZ2VzID0gdHJ1ZVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMuZGF0YVNpemVDaGFuZ2VzKSB7XG4gICAgICAgICAgdGhpcy5jb250ZXh0QW5kUmF0aW8gPSA8XG4gICAgICAgICAgICAgIHsgY29udGV4dDogQ2FudmFzUmVuZGVyaW5nQ29udGV4dDJEOyByYXRpbzogbnVtYmVyIH1cbiAgICAgICAgICAgID50aGlzLmdldENvbnRleHQodGhpcy5jYW52YXMoKSk7XG4gICAgICAgICAgdGhpcy5ib2FyZCA9IHRoaXMuemVyb0FycmF5KFxuICAgICAgICAgICAgKHRoaXMuc2l6ZVswXSA+PiA1KSAqIHRoaXMuc2l6ZVsxXVxuICAgICAgICAgICk7XG4gICAgICAgICAgdGhpcy5ib3VuZHMgPSBudWxsO1xuICAgICAgICB9XG5cbiAgICAgICAgbGV0IHN0ZXAgPSAoKSA9PiB7XG4gICAgICAgICAgbGV0IHN0YXJ0ID0gRGF0ZS5ub3coKTtcbiAgICAgICAgICB3aGlsZSAoXG4gICAgICAgICAgICBEYXRlLm5vdygpIC0gc3RhcnQgPCB0aGlzLnRpbWVJbnRlcnZhbCAmJlxuICAgICAgICAgICAgKytpIDwgbiAmJlxuICAgICAgICAgICAgdGhpcy50aW1lclxuICAgICAgICAgICkge1xuICAgICAgICAgICAgbGV0IGQ6IFdvcmQgPSBkYXRhW2ldO1xuICAgICAgICAgICAgaWYgKHRoaXMuZGF0YVNpemVDaGFuZ2VzIHx8ICFkLmRvbmVBbHJlYWR5KSB7XG4gICAgICAgICAgICAgIGQueCA9ICh0aGlzLnNpemVbMF0gKiAodGhpcy5yYW5kb20oKSArIDAuNSkpID4+IDE7XG4gICAgICAgICAgICAgIGQueSA9ICh0aGlzLnNpemVbMV0gKiAodGhpcy5yYW5kb20oKSArIDAuNSkpID4+IDE7XG4gICAgICAgICAgICAgIHRoaXMuY2xvdWRTcHJpdGUodGhpcy5jb250ZXh0QW5kUmF0aW8sIGQsIGRhdGEsIGkpO1xuICAgICAgICAgICAgICBpZiAoZC5oYXNUZXh0ICYmIHRoaXMucGxhY2UodGhpcy5ib2FyZCwgZCwgdGhpcy5ib3VuZHMhKSkge1xuICAgICAgICAgICAgICAgIGQuZG9uZUFscmVhZHkgPSB0cnVlO1xuICAgICAgICAgICAgICAgIGlmIChkLnZhbHVlICE9IDApIHt0YWdzLnB1c2goZCk7fVxuICAgICAgICAgICAgICAgIHRoaXMuZXZlbnQuY2FsbCgnd29yZCcsIHRoaXMuY29uZmlnLCBkKTtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5ib3VuZHMpIHRoaXMuY2xvdWRCb3VuZHModGhpcy5ib3VuZHMsIGQpO1xuICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICAgIHRoaXMuYm91bmRzID0gW1xuICAgICAgICAgICAgICAgICAgICB7IHg6IGQueCArIGQueDAhLCB5OiBkLnkgKyBkLnkwISB9LFxuICAgICAgICAgICAgICAgICAgICB7IHg6IGQueCArIGQueDEhLCB5OiBkLnkgKyBkLnkxISB9LFxuICAgICAgICAgICAgICAgICAgXTtcbiAgICAgICAgICAgICAgICAvLyBUZW1wb3JhcnkgaGFja1xuICAgICAgICAgICAgICAgIGQueCAtPSB0aGlzLnNpemVbMF0gPj4gMTtcbiAgICAgICAgICAgICAgICBkLnkgLT0gdGhpcy5zaXplWzFdID4+IDE7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGlmIChkLnZhbHVlICE9IDApIHt0YWdzLnB1c2goZCk7fVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoaSA+PSBuKSB7XG4gICAgICAgICAgICB0aGlzLmNvbmZpZy5zdG9wISgpO1xuICAgICAgICAgICAgdGhpcy5ldmVudC5jYWxsKCdlbmQnLCB0aGlzLmNvbmZpZywgdGFncywgdGhpcy5ib3VuZHMpO1xuICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgaWYgKHRoaXMudGltZXIpIGNsZWFySW50ZXJ2YWwodGhpcy50aW1lcik7XG4gICAgICAgIHRoaXMudGltZXIgPSBzZXRJbnRlcnZhbCgoKSA9PiAwLCAwKTtcbiAgICAgICAgc3RlcCgpO1xuXG4gICAgICAgIHJldHVybiB0aGlzLmNvbmZpZztcbiAgICAgIH07XG5cbiAgICAgIHRoaXMuY29uZmlnLmNhbnZhcyA9IDxUPihfPzogVCkgPT4ge1xuICAgICAgICByZXR1cm4gPGNhbnZhc1R5cGU8VD4+KFxuICAgICAgICAgIChfID8gKCh0aGlzLmNhbnZhcyA9IHRoaXMuZnVuY3RvcihfKSksIHRoaXMuY29uZmlnKSA6IHRoaXMuY2FudmFzKVxuICAgICAgICApO1xuICAgICAgfTtcblxuICAgICAgdGhpcy5jb25maWcuc3RvcCA9ICgpID0+IHtcbiAgICAgICAgaWYgKHRoaXMudGltZXIpIHtcbiAgICAgICAgICBjbGVhckludGVydmFsKHRoaXMudGltZXIpO1xuICAgICAgICAgIHRoaXMudGltZXIgPSBudWxsO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLmNvbmZpZztcbiAgICAgIH07XG5cbiAgICAgIHRoaXMuY29uZmlnLnRpbWVJbnRlcnZhbCA9IDxUIGV4dGVuZHMgbnVtYmVyIHwgbnVsbD4oXG4gICAgICAgIF8/OiBUXG4gICAgICApOiB0aW1lSW52ZXJ2YWxUeXBlPFQ+ID0+IHtcbiAgICAgICAgcmV0dXJuIDx0aW1lSW52ZXJ2YWxUeXBlPFQ+PihcbiAgICAgICAgICAoX1xuICAgICAgICAgICAgPyAoKHRoaXMudGltZUludGVydmFsID0gXyA9PSBudWxsID8gSW5maW5pdHkgOiBfKSwgdGhpcy5jb25maWcpXG4gICAgICAgICAgICA6IHRoaXMudGltZUludGVydmFsKVxuICAgICAgICApO1xuICAgICAgfTtcblxuICAgICAgdGhpcy5jb25maWcud29yZHMgPSA8VCBleHRlbmRzIFdvcmRbXT4oXz86IFQpID0+IHtcbiAgICAgICAgcmV0dXJuIDx3b3JkVHlwZTxUPj4oXyA/ICgodGhpcy53b3JkcyA9IF8pLCB0aGlzLmNvbmZpZykgOiB0aGlzLndvcmRzKTtcbiAgICAgIH07XG5cbiAgICAgIHRoaXMuY29uZmlnLnNpemUgPSA8VCBleHRlbmRzIG51bWJlcltdPihfPzogVCkgPT4ge1xuICAgICAgICByZXR1cm4gPHNpemVUeXBlPFQ+PihcbiAgICAgICAgICAoXyA/ICgodGhpcy5zaXplID0gWytfWzBdLCArX1sxXV0pLCB0aGlzLmNvbmZpZykgOiB0aGlzLnNpemUpXG4gICAgICAgICk7XG4gICAgICB9O1xuXG4gICAgICB0aGlzLmNvbmZpZy5mb250ID0gPFxuICAgICAgICBUIGV4dGVuZHMgU3RyaW5nIHwgKChfOiBhbnksIGQ6IFdvcmQsIGk6IG51bWJlcikgPT4gU3RyaW5nKVxuICAgICAgPihcbiAgICAgICAgXz86IFRcbiAgICAgICkgPT4ge1xuICAgICAgICByZXR1cm4gPHRleHRGdW5jdG9yVHlwZTxUPj4oXG4gICAgICAgICAgKF8gPyAoKHRoaXMuZm9udCA9IHRoaXMuZnVuY3RvcihfKSksIHRoaXMuY29uZmlnKSA6IHRoaXMuZm9udClcbiAgICAgICAgKTtcbiAgICAgIH07XG5cbiAgICAgIHRoaXMuY29uZmlnLmZvbnRTdHlsZSA9IDxcbiAgICAgICAgVCBleHRlbmRzIFN0cmluZyB8ICgoXzogYW55LCBkOiBXb3JkLCBpOiBudW1iZXIpID0+IFN0cmluZylcbiAgICAgID4oXG4gICAgICAgIF8/OiBUXG4gICAgICApID0+IHtcbiAgICAgICAgcmV0dXJuIDx0ZXh0RnVuY3RvclR5cGU8VD4+KFxuICAgICAgICAgIChfXG4gICAgICAgICAgICA/ICgodGhpcy5mb250U3R5bGUgPSB0aGlzLmZ1bmN0b3IoXykpLCB0aGlzLmNvbmZpZylcbiAgICAgICAgICAgIDogdGhpcy5mb250U3R5bGUpXG4gICAgICAgICk7XG4gICAgICB9O1xuXG4gICAgICB0aGlzLmNvbmZpZy5mb250V2VpZ2h0ID0gPFxuICAgICAgICBUIGV4dGVuZHMgU3RyaW5nIHwgKChfOiBhbnksIGQ6IFdvcmQsIGk6IG51bWJlcikgPT4gU3RyaW5nKVxuICAgICAgPihcbiAgICAgICAgXz86IFRcbiAgICAgICkgPT4ge1xuICAgICAgICByZXR1cm4gPHRleHRGdW5jdG9yVHlwZTxUPj4oXG4gICAgICAgICAgKF9cbiAgICAgICAgICAgID8gKCh0aGlzLmZvbnRXZWlnaHQgPSB0aGlzLmZ1bmN0b3IoXykpLCB0aGlzLmNvbmZpZylcbiAgICAgICAgICAgIDogdGhpcy5mb250V2VpZ2h0KVxuICAgICAgICApO1xuICAgICAgfTtcblxuICAgICAgdGhpcy5jb25maWcucm90YXRlID0gPFxuICAgICAgICBUIGV4dGVuZHMgbnVtYmVyIHwgKChfOiBhbnksIGQ6IFdvcmQsIGk6IG51bWJlcikgPT4gbnVtYmVyKVxuICAgICAgPihcbiAgICAgICAgXz86IFRcbiAgICAgICkgPT4ge1xuICAgICAgICByZXR1cm4gPG51bWJlckZ1bmN0b3JUeXBlPFQ+PihcbiAgICAgICAgICAoXyA/ICgodGhpcy5yb3RhdGUgPSB0aGlzLmZ1bmN0b3IoXykpLCB0aGlzLmNvbmZpZykgOiB0aGlzLnJvdGF0ZSlcbiAgICAgICAgKTtcbiAgICAgIH07XG5cbiAgICAgIHRoaXMuY29uZmlnLnRleHQgPSA8XG4gICAgICAgIFQgZXh0ZW5kcyBTdHJpbmcgfCAoKF86IGFueSwgZDogV29yZCwgaTogbnVtYmVyKSA9PiBTdHJpbmcpXG4gICAgICA+KFxuICAgICAgICBfPzogVFxuICAgICAgKSA9PiB7XG4gICAgICAgIHJldHVybiA8dGV4dEZ1bmN0b3JUeXBlPFQ+PihcbiAgICAgICAgICAoXyA/ICgodGhpcy50ZXh0ID0gdGhpcy5mdW5jdG9yKF8pKSwgdGhpcy5jb25maWcpIDogdGhpcy50ZXh0KVxuICAgICAgICApO1xuICAgICAgfTtcblxuICAgICAgdGhpcy5jb25maWcuc3BpcmFsID0gPFxuICAgICAgICBUIGV4dGVuZHMgU3RyaW5nIHwgKChzaXplOiBudW1iZXJbXSkgPT4gKHQ6IG51bWJlcikgPT4gbnVtYmVyW10pXG4gICAgICA+KFxuICAgICAgICBfPzogVFxuICAgICAgKSA9PiB7XG4gICAgICAgIHJldHVybiA8c3BpcmFsVHlwZTxUPj4oXG4gICAgICAgICAgKF9cbiAgICAgICAgICAgID8gKCh0aGlzLnNwaXJhbCA9XG4gICAgICAgICAgICAgICAgPFN0cmluZz5fID09ICdhcmNoaW1lZGVhbicgfHwgPFN0cmluZz5fID09ICdyZWN0YW5ndWxhcidcbiAgICAgICAgICAgICAgICAgID8gdGhpcy5zcGlyYWxzWzwnYXJjaGltZWRlYW4nIHwgJ3JlY3Rhbmd1bGFyJz5fXVxuICAgICAgICAgICAgICAgICAgOiA8KHNpemU6IG51bWJlcltdKSA9PiAodDogbnVtYmVyKSA9PiBudW1iZXJbXT5fKSxcbiAgICAgICAgICAgICAgdGhpcy5jb25maWcpXG4gICAgICAgICAgICA6IHRoaXMuc3BpcmFsKVxuICAgICAgICApO1xuICAgICAgfTtcblxuICAgICAgdGhpcy5jb25maWcuZm9udFNpemUgPSA8XG4gICAgICAgIFQgZXh0ZW5kcyBudW1iZXIgfCAoKF86IGFueSwgZDogV29yZCwgaTogbnVtYmVyKSA9PiBudW1iZXIpXG4gICAgICA+KFxuICAgICAgICBfPzogVFxuICAgICAgKSA9PiB7XG4gICAgICAgIHJldHVybiA8bnVtYmVyRnVuY3RvclR5cGU8VD4+KFxuICAgICAgICAgIChfID8gKCh0aGlzLmZvbnRTaXplID0gdGhpcy5mdW5jdG9yKF8pKSwgdGhpcy5jb25maWcpIDogdGhpcy5mb250U2l6ZSlcbiAgICAgICAgKTtcbiAgICAgIH07XG5cbiAgICAgIHRoaXMuY29uZmlnLnBhZGRpbmcgPSA8XG4gICAgICAgIFQgZXh0ZW5kcyBudW1iZXIgfCAoKF86IGFueSwgZDogV29yZCwgaTogbnVtYmVyKSA9PiBudW1iZXIpXG4gICAgICA+KFxuICAgICAgICBfPzogVFxuICAgICAgKSA9PiB7XG4gICAgICAgIHJldHVybiA8bnVtYmVyRnVuY3RvclR5cGU8VD4+KFxuICAgICAgICAgIChfID8gKCh0aGlzLnBhZGRpbmcgPSB0aGlzLmZ1bmN0b3IoXykpLCB0aGlzLmNvbmZpZykgOiB0aGlzLnBhZGRpbmcpXG4gICAgICAgICk7XG4gICAgICB9O1xuXG4gICAgICB0aGlzLmNvbmZpZy5yYW5kb20gPSA8VCBleHRlbmRzICgpID0+IG51bWJlcj4oXz86IFQpID0+IHtcbiAgICAgICAgcmV0dXJuIDxyYW5kb21UeXBlPFQ+PihcbiAgICAgICAgICAoXyA/ICgodGhpcy5yYW5kb20gPSBfKSwgdGhpcy5jb25maWcpIDogdGhpcy5yYW5kb20pXG4gICAgICAgICk7XG4gICAgICB9O1xuXG4gICAgICB0aGlzLmNvbmZpZy5vbiA9IDxUIGV4dGVuZHMgYW55WzJdPihfOiBUKSA9PiB7XG4gICAgICAgIGxldCB2YWx1ZTogYW55ID0gdGhpcy5ldmVudC5vbi5hcHBseSh0aGlzLmV2ZW50LCA8YW55WzJdPl8pO1xuICAgICAgICByZXR1cm4gPG9uVHlwZTxUPj4odmFsdWUgPT09IHRoaXMuZXZlbnQgPyB0aGlzLmNvbmZpZyA6IHZhbHVlKTtcbiAgICAgIH07XG4gICAgfVxuXG4gICAgcHJvdGVjdGVkIGdldENvbnRleHQgPSAoY2FudmFzOiBIVE1MQ2FudmFzRWxlbWVudCkgPT4ge1xuICAgICAgY2FudmFzLndpZHRoID0gY2FudmFzLmhlaWdodCA9IDE7XG4gICAgICBsZXQgcmF0aW8gPSBNYXRoLnNxcnQoXG4gICAgICAgIGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpIS5nZXRJbWFnZURhdGEoMCwgMCwgMSwgMSkuZGF0YS5sZW5ndGggPj4gMlxuICAgICAgKTtcbiAgICAgIGNhbnZhcy53aWR0aCA9ICh0aGlzLmN3IDw8IDUpIC8gcmF0aW87XG4gICAgICBjYW52YXMuaGVpZ2h0ID0gdGhpcy5jaCAvIHJhdGlvO1xuXG4gICAgICBsZXQgY29udGV4dCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xuICAgICAgY29udGV4dCEuZmlsbFN0eWxlID0gY29udGV4dCEuc3Ryb2tlU3R5bGUgPSAncmVkJztcbiAgICAgIGNvbnRleHQhLnRleHRBbGlnbiA9ICdjZW50ZXInO1xuXG4gICAgICByZXR1cm4geyBjb250ZXh0OiBjb250ZXh0LCByYXRpbzogcmF0aW8gfTtcbiAgICB9O1xuXG4gICAgcHJvdGVjdGVkIHBsYWNlID0gKFxuICAgICAgYm9hcmQ6IG51bWJlcltdLFxuICAgICAgdGFnOiBXb3JkLFxuICAgICAgYm91bmRzOiB7IHg6IG51bWJlcjsgeTogbnVtYmVyIH1bXVxuICAgICkgPT4ge1xuICAgICAgLy9sZXQgcGVyaW1ldGVyID0gW3t4OiAwLCB5OiAwfSwge3g6IHRoaXMuc2l6ZVswXSwgeTogdGhpcy5zaXplWzFdfV07XG4gICAgICBsZXQgc3RhcnRYID0gdGFnLnghO1xuICAgICAgbGV0IHN0YXJ0WSA9IHRhZy55ITtcbiAgICAgIGxldCBtYXhEZWx0YSA9IE1hdGguc3FydChcbiAgICAgICAgdGhpcy5zaXplWzBdICogdGhpcy5zaXplWzBdICsgdGhpcy5zaXplWzFdICogdGhpcy5zaXplWzFdXG4gICAgICApO1xuICAgICAgbGV0IHMgPSB0aGlzLnNwaXJhbCh0aGlzLnNpemUpO1xuICAgICAgbGV0IGR0ID0gdGhpcy5yYW5kb20oKSA8IDAuNSA/IDEgOiAtMTtcbiAgICAgIGxldCB0ID0gLWR0O1xuICAgICAgbGV0IGR4ZHk6IG51bWJlcltdO1xuICAgICAgbGV0IGR4OiBudW1iZXI7XG4gICAgICBsZXQgZHk6IG51bWJlcjtcblxuICAgICAgd2hpbGUgKChkeGR5ID0gcygodCArPSBkdCkpKSkge1xuICAgICAgICBkeCA9IH5+ZHhkeVswXTtcbiAgICAgICAgZHkgPSB+fmR4ZHlbMV07XG5cbiAgICAgICAgaWYgKE1hdGgubWluKE1hdGguYWJzKGR4KSwgTWF0aC5hYnMoZHkpKSA+PSBtYXhEZWx0YSkgYnJlYWs7XG5cbiAgICAgICAgdGFnLnggPSBzdGFydFggKyBkeDtcbiAgICAgICAgdGFnLnkgPSBzdGFydFkgKyBkeTtcblxuICAgICAgICBpZiAoXG4gICAgICAgICAgdGFnLnggKyB0YWcueDAhIDwgMCB8fFxuICAgICAgICAgIHRhZy55ICsgdGFnLnkwISA8IDAgfHxcbiAgICAgICAgICB0YWcueCArIHRhZy54MSEgPiB0aGlzLnNpemVbMF0gfHxcbiAgICAgICAgICB0YWcueSArIHRhZy55MSEgPiB0aGlzLnNpemVbMV1cbiAgICAgICAgKVxuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAvLyBUT0RPIG9ubHkgY2hlY2sgZm9yIGNvbGxpc2lvbnMgd2l0aGluIGN1cnJlbnQgYm91bmRzLlxuICAgICAgICBpZiAoIWJvdW5kcyB8fCAhdGhpcy5jbG91ZENvbGxpZGUodGFnLCBib2FyZCwgdGhpcy5zaXplWzBdKSkge1xuICAgICAgICAgIGlmICghYm91bmRzIHx8IHRoaXMuY29sbGlkZVJlY3RzKHRhZywgYm91bmRzKSkge1xuICAgICAgICAgICAgbGV0IHNwcml0ZSA9IHRhZy5zcHJpdGU7XG4gICAgICAgICAgICBsZXQgdyA9IHRhZy53aWR0aCEgPj4gNTtcbiAgICAgICAgICAgIGxldCBzdyA9IHRoaXMuc2l6ZVswXSA+PiA1O1xuICAgICAgICAgICAgbGV0IGx4ID0gdGFnLnggLSAodyA8PCA0KTtcbiAgICAgICAgICAgIGxldCBzeCA9IGx4ICYgMHg3ZjtcbiAgICAgICAgICAgIGxldCBtc3ggPSAzMiAtIHN4O1xuICAgICAgICAgICAgbGV0IGggPSB0YWcueTEhIC0gdGFnLnkwITtcbiAgICAgICAgICAgIGxldCB4ID0gKHRhZy55ICsgdGFnLnkwISkgKiBzdyArIChseCA+PiA1KTtcbiAgICAgICAgICAgIGxldCBsYXN0OiBudW1iZXI7XG4gICAgICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IGg7IGorKykge1xuICAgICAgICAgICAgICBsYXN0ID0gMDtcbiAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPD0gdzsgaSsrKSB7XG4gICAgICAgICAgICAgICAgYm9hcmRbeCArIGldIHw9XG4gICAgICAgICAgICAgICAgICAobGFzdCA8PCBtc3gpIHxcbiAgICAgICAgICAgICAgICAgIChpIDwgdyA/IChsYXN0ID0gc3ByaXRlIVtqICogdyArIGldKSA+Pj4gc3ggOiAwKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB4ICs9IHN3O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZGVsZXRlIHRhZy5zcHJpdGU7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9O1xuXG4gICAgY2xvdWRUZXh0KF86IGFueSwgZDogV29yZCwgaTogbnVtYmVyKSB7XG4gICAgICByZXR1cm4gZC50ZXh0O1xuICAgIH1cblxuICAgIGNsb3VkRm9udChfOiBhbnksIGQ6IFdvcmQsIGk6IG51bWJlcikge1xuICAgICAgcmV0dXJuICdzZXJpZic7XG4gICAgfVxuXG4gICAgY2xvdWRGb250Tm9ybWFsKF86IGFueSwgZDogV29yZCwgaTogbnVtYmVyKSB7XG4gICAgICByZXR1cm4gJ25vcm1hbCc7XG4gICAgfVxuXG4gICAgY2xvdWRGb250U2l6ZShfOiBhbnksIGQ6IFdvcmQsIGk6IG51bWJlcikge1xuICAgICAgcmV0dXJuIE1hdGguc3FydChkLnZhbHVlKTtcbiAgICB9XG5cbiAgICBjbG91ZFJvdGF0ZShfOiBhbnksIGQ6IFdvcmQsIGk6IG51bWJlcikge1xuICAgICAgcmV0dXJuICh+fihNYXRoLnJhbmRvbSgpICogNikgLSAzKSAqIDMwO1xuICAgIH1cblxuICAgIGNsb3VkUGFkZGluZyhfOiBhbnksIGQ6IFdvcmQsIGk6IG51bWJlcikge1xuICAgICAgcmV0dXJuIDE7XG4gICAgfVxuXG4gICAgLy8gRmV0Y2hlcyBhIG1vbm9jaHJvbWUgc3ByaXRlIGJpdG1hcCBmb3IgdGhlIHNwZWNpZmllZCB0ZXh0LlxuICAgIC8vIExvYWQgaW4gYmF0Y2hlcyBmb3Igc3BlZWQuXG4gICAgcHJvdGVjdGVkIGNsb3VkU3ByaXRlKFxuICAgICAgY29udGV4dEFuZFJhdGlvOiB7IGNvbnRleHQ6IENhbnZhc1JlbmRlcmluZ0NvbnRleHQyRDsgcmF0aW86IG51bWJlciB9LFxuICAgICAgZDogV29yZCxcbiAgICAgIGRhdGE6IFdvcmRbXSxcbiAgICAgIGRpOiBudW1iZXJcbiAgICApIHtcbiAgICAgIGlmIChkLnNwcml0ZSkgcmV0dXJuO1xuICAgICAgbGV0IGMgPSBjb250ZXh0QW5kUmF0aW8uY29udGV4dDtcbiAgICAgIGxldCByYXRpbyA9IGNvbnRleHRBbmRSYXRpby5yYXRpbztcblxuICAgICAgYy5jbGVhclJlY3QoMCwgMCwgKHRoaXMuY3cgPDwgNSkgLyByYXRpbywgdGhpcy5jaCAvIHJhdGlvKTtcbiAgICAgIGxldCB4ID0gMDtcbiAgICAgIGxldCB5ID0gMDtcbiAgICAgIGxldCBtYXhoID0gMDtcbiAgICAgIGxldCBuID0gZGF0YS5sZW5ndGg7XG4gICAgICAtLWRpO1xuICAgICAgd2hpbGUgKCsrZGkgPCBuKSB7XG4gICAgICAgIGQgPSBkYXRhW2RpXTtcbiAgICAgICAgYy5zYXZlKCk7XG4gICAgICAgIGMuZm9udCA9XG4gICAgICAgICAgZC5zdHlsZSArXG4gICAgICAgICAgJyAnICtcbiAgICAgICAgICBkLndlaWdodCArXG4gICAgICAgICAgJyAnICtcbiAgICAgICAgICB+figoZC5zaXplISArIDEpIC8gcmF0aW8pICtcbiAgICAgICAgICAncHggJyArXG4gICAgICAgICAgZC5mb250O1xuICAgICAgICBsZXQgdyA9IGMubWVhc3VyZVRleHQoZC50ZXh0ICsgJ20nKS53aWR0aCAqIHJhdGlvO1xuICAgICAgICBsZXQgaCA9IGQuc2l6ZSEgPDwgMTtcbiAgICAgICAgaWYgKGQucm90YXRlKSB7XG4gICAgICAgICAgbGV0IHNyID0gTWF0aC5zaW4oZC5yb3RhdGUgKiBDbG91ZC5jbG91ZFJhZGlhbnMpO1xuICAgICAgICAgIGxldCBjciA9IE1hdGguY29zKGQucm90YXRlICogQ2xvdWQuY2xvdWRSYWRpYW5zKTtcbiAgICAgICAgICBsZXQgd2NyID0gdyAqIGNyO1xuICAgICAgICAgIGxldCB3c3IgPSB3ICogc3I7XG4gICAgICAgICAgbGV0IGhjciA9IGggKiBjcjtcbiAgICAgICAgICBsZXQgaHNyID0gaCAqIHNyO1xuICAgICAgICAgIHcgPVxuICAgICAgICAgICAgKChNYXRoLm1heChNYXRoLmFicyh3Y3IgKyBoc3IpLCBNYXRoLmFicyh3Y3IgLSBoc3IpKSArIDB4MWYpID4+XG4gICAgICAgICAgICAgIDUpIDw8XG4gICAgICAgICAgICA1O1xuICAgICAgICAgIGggPSB+fk1hdGgubWF4KE1hdGguYWJzKHdzciArIGhjciksIE1hdGguYWJzKHdzciAtIGhjcikpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHcgPSAoKHcgKyAweDFmKSA+PiA1KSA8PCA1O1xuICAgICAgICB9XG4gICAgICAgIGlmIChoID4gbWF4aCkgbWF4aCA9IGg7XG4gICAgICAgIGlmICh4ICsgdyA+PSB0aGlzLmN3IDw8IDUpIHtcbiAgICAgICAgICB4ID0gMDtcbiAgICAgICAgICB5ICs9IG1heGg7XG4gICAgICAgICAgbWF4aCA9IDA7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHkgKyBoID49IHRoaXMuY2gpIGJyZWFrO1xuICAgICAgICBjLnRyYW5zbGF0ZSgoeCArICh3ID4+IDEpKSAvIHJhdGlvLCAoeSArIChoID4+IDEpKSAvIHJhdGlvKTtcbiAgICAgICAgaWYgKGQucm90YXRlKSBjLnJvdGF0ZShkLnJvdGF0ZSAqIENsb3VkLmNsb3VkUmFkaWFucyk7XG4gICAgICAgIGMuZmlsbFRleHQoZC50ZXh0ISwgMCwgMCk7XG4gICAgICAgIGlmIChkLnBhZGRpbmcpXG4gICAgICAgICAgKGMubGluZVdpZHRoID0gMiAqIGQucGFkZGluZyksIGMuc3Ryb2tlVGV4dChkLnRleHQhLCAwLCAwKTtcbiAgICAgICAgYy5yZXN0b3JlKCk7XG4gICAgICAgIGQud2lkdGggPSB3O1xuICAgICAgICBkLmhlaWdodCA9IGg7XG4gICAgICAgIGQueG9mZiA9IHg7XG4gICAgICAgIGQueW9mZiA9IHk7XG4gICAgICAgIGQueDEgPSB3ID4+IDE7XG4gICAgICAgIGQueTEgPSBoID4+IDE7XG4gICAgICAgIGQueDAgPSAtZC54MTtcbiAgICAgICAgZC55MCA9IC1kLnkxO1xuICAgICAgICBkLmhhc1RleHQgPSB0cnVlO1xuICAgICAgICB4ICs9IHc7XG4gICAgICB9XG4gICAgICBsZXQgcGl4ZWxzID0gYy5nZXRJbWFnZURhdGEoXG4gICAgICAgIDAsXG4gICAgICAgIDAsXG4gICAgICAgICh0aGlzLmN3IDw8IDUpIC8gcmF0aW8sXG4gICAgICAgIHRoaXMuY2ggLyByYXRpb1xuICAgICAgKS5kYXRhO1xuICAgICAgbGV0IHNwcml0ZTogbnVtYmVyW10gPSBbXTtcbiAgICAgIHdoaWxlICgtLWRpID49IDApIHtcbiAgICAgICAgZCA9IGRhdGFbZGldO1xuICAgICAgICBpZiAoIWQuaGFzVGV4dCkgY29udGludWU7XG4gICAgICAgIGxldCB3ID0gZC53aWR0aDtcbiAgICAgICAgbGV0IHczMiA9IHchID4+IDU7XG4gICAgICAgIGxldCBoID0gZC55MSEgLSBkLnkwITtcbiAgICAgICAgLy8gWmVybyB0aGUgYnVmZmVyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgaCAqIHczMjsgaSsrKSBzcHJpdGVbaV0gPSAwO1xuICAgICAgICB4ID0gZC54b2ZmITtcbiAgICAgICAgaWYgKHggPT0gbnVsbCkgcmV0dXJuO1xuICAgICAgICB5ID0gZC55b2ZmITtcbiAgICAgICAgbGV0IHNlZW4gPSAwO1xuICAgICAgICBsZXQgc2VlblJvdyA9IC0xO1xuICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IGg7IGorKykge1xuICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdyE7IGkrKykge1xuICAgICAgICAgICAgbGV0IGsgPSB3MzIgKiBqICsgKGkgPj4gNSk7XG4gICAgICAgICAgICBsZXQgbSA9IHBpeGVsc1soKHkgKyBqKSAqICh0aGlzLmN3IDw8IDUpICsgKHggKyBpKSkgPDwgMl1cbiAgICAgICAgICAgICAgPyAxIDw8ICgzMSAtIChpICUgMzIpKVxuICAgICAgICAgICAgICA6IDA7XG4gICAgICAgICAgICBzcHJpdGVba10gfD0gbTtcbiAgICAgICAgICAgIHNlZW4gfD0gbTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHNlZW4pIHNlZW5Sb3cgPSBqO1xuICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgZC55MCErKztcbiAgICAgICAgICAgIGgtLTtcbiAgICAgICAgICAgIGotLTtcbiAgICAgICAgICAgIHkrKztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZC55MSA9IGQueTAhICsgc2VlblJvdztcbiAgICAgICAgZC5zcHJpdGUgPSBzcHJpdGUuc2xpY2UoMCwgKGQueTEgLSBkLnkwISkgKiB3MzIpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIFVzZSBtYXNrLWJhc2VkIGNvbGxpc2lvbiBkZXRlY3Rpb24uXG4gICAgcHJvdGVjdGVkIGNsb3VkQ29sbGlkZSh0YWc6IFdvcmQsIGJvYXJkOiBudW1iZXJbXSwgc3c6IG51bWJlcikge1xuICAgICAgc3cgPj49IDU7XG4gICAgICBsZXQgc3ByaXRlID0gdGFnLnNwcml0ZTtcbiAgICAgIGxldCB3ID0gdGFnLndpZHRoISA+PiA1O1xuICAgICAgbGV0IGx4ID0gdGFnLnghIC0gKHcgPDwgNCk7XG4gICAgICBsZXQgc3ggPSBseCAmIDB4N2Y7XG4gICAgICBsZXQgbXN4ID0gMzIgLSBzeDtcbiAgICAgIGxldCBoID0gdGFnLnkxISAtIHRhZy55MCE7XG4gICAgICBsZXQgeCA9ICh0YWcueSEgKyB0YWcueTAhKSAqIHN3ICsgKGx4ID4+IDUpO1xuICAgICAgbGV0IGxhc3Q7XG4gICAgICBmb3IgKGxldCBqID0gMDsgaiA8IGg7IGorKykge1xuICAgICAgICBsYXN0ID0gMDtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPD0gdzsgaSsrKSB7XG4gICAgICAgICAgaWYgKFxuICAgICAgICAgICAgKChsYXN0IDw8IG1zeCkgfCAoaSA8IHcgPyAobGFzdCA9IHNwcml0ZSFbaiAqIHcgKyBpXSkgPj4+IHN4IDogMCkpICZcbiAgICAgICAgICAgIGJvYXJkW3ggKyBpXVxuICAgICAgICAgIClcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHggKz0gc3c7XG4gICAgICB9XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgcHJvdGVjdGVkIGNsb3VkQm91bmRzKGJvdW5kczogeyB4OiBudW1iZXI7IHk6IG51bWJlciB9W10sIGQ6IFdvcmQpIHtcbiAgICAgIGxldCBiMCA9IGJvdW5kc1swXTtcbiAgICAgIGxldCBiMSA9IGJvdW5kc1sxXTtcbiAgICAgIGlmIChkLnghICsgZC54MCEgPCBiMC54KSBiMC54ID0gZC54ISArIGQueDAhO1xuICAgICAgaWYgKGQueSEgKyBkLnkwISA8IGIwLnkpIGIwLnkgPSBkLnkhICsgZC55MCE7XG4gICAgICBpZiAoZC54ISArIGQueDEhID4gYjEueCkgYjEueCA9IGQueCEgKyBkLngxITtcbiAgICAgIGlmIChkLnkhICsgZC55MSEgPiBiMS55KSBiMS55ID0gZC55ISArIGQueTEhO1xuICAgIH1cblxuICAgIHByb3RlY3RlZCBjb2xsaWRlUmVjdHMoYTogV29yZCwgYjogeyB4OiBudW1iZXI7IHk6IG51bWJlciB9W10pIHtcbiAgICAgIHJldHVybiAoXG4gICAgICAgIGEueCEgKyBhLngxISA+IGJbMF0ueCAmJlxuICAgICAgICBhLnghICsgYS54MCEgPCBiWzFdLnggJiZcbiAgICAgICAgYS55ISArIGEueTEhID4gYlswXS55ICYmXG4gICAgICAgIGEueSEgKyBhLnkwISA8IGJbMV0ueVxuICAgICAgKTtcbiAgICB9XG5cbiAgICBwcm90ZWN0ZWQgYXJjaGltZWRlYW5TcGlyYWwoc2l6ZTogbnVtYmVyW10pIHtcbiAgICAgIGxldCBlID0gc2l6ZVswXSAvIHNpemVbMV07XG4gICAgICByZXR1cm4gKHQ6IG51bWJlcikgPT4ge1xuICAgICAgICByZXR1cm4gW2UgKiAodCAqPSAwLjEpICogTWF0aC5jb3ModCksIHQgKiBNYXRoLnNpbih0KV07XG4gICAgICB9O1xuICAgIH1cblxuICAgIHByb3RlY3RlZCByZWN0YW5ndWxhclNwaXJhbChzaXplOiBudW1iZXJbXSkge1xuICAgICAgbGV0IGR5ID0gNDtcbiAgICAgIGxldCBkeCA9IChkeSAqIHNpemVbMF0pIC8gc2l6ZVsxXTtcbiAgICAgIGxldCB4ID0gMDtcbiAgICAgIGxldCB5ID0gMDtcbiAgICAgIHJldHVybiAodDogbnVtYmVyKSA9PiB7XG4gICAgICAgIGxldCBzaWduID0gdCA8IDAgPyAtMSA6IDE7XG4gICAgICAgIC8vIFNlZSB0cmlhbmd1bGFyIG51bWJlcnM6IFRfbiA9IG4gKiAobiArIDEpIC8gMi5cbiAgICAgICAgc3dpdGNoICgoTWF0aC5zcXJ0KDEgKyA0ICogc2lnbiAqIHQpIC0gc2lnbikgJiAzKSB7XG4gICAgICAgICAgY2FzZSAwOlxuICAgICAgICAgICAgeCArPSBkeDtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGNhc2UgMTpcbiAgICAgICAgICAgIHkgKz0gZHk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBjYXNlIDI6XG4gICAgICAgICAgICB4IC09IGR4O1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIHkgLT0gZHk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gW3gsIHldO1xuICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyBUT0RPIHJldXNlIGFycmF5cz9cbiAgICBwcm90ZWN0ZWQgemVyb0FycmF5KG46IG51bWJlcikge1xuICAgICAgbGV0IGE6IG51bWJlcltdID0gW107XG4gICAgICBsZXQgaSA9IC0xO1xuICAgICAgd2hpbGUgKCsraSA8IG4pIGFbaV0gPSAwO1xuICAgICAgcmV0dXJuIGE7XG4gICAgfVxuXG4gICAgY2xvdWRDYW52YXMoKSB7XG4gICAgICByZXR1cm4gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG4gICAgfVxuXG4gICAgcHJvdGVjdGVkIGZ1bmN0b3IgPSAocmV0dXJuVmFsOiBhbnkpID0+IHtcbiAgICAgIHJldHVybiB0eXBlb2YgcmV0dXJuVmFsID09PSAnZnVuY3Rpb24nXG4gICAgICAgID8gcmV0dXJuVmFsXG4gICAgICAgIDogKF86IGFueSwgZD86IFdvcmQsIGk/OiBudW1iZXIpID0+IHtcbiAgICAgICAgICAgIHJldHVybiByZXR1cm5WYWw7XG4gICAgICAgICAgfTtcbiAgICB9O1xuXG4gICAgcHJvdGVjdGVkIHNwaXJhbHMgPSB7XG4gICAgICBhcmNoaW1lZGVhbjogdGhpcy5hcmNoaW1lZGVhblNwaXJhbCxcbiAgICAgIHJlY3Rhbmd1bGFyOiB0aGlzLnJlY3Rhbmd1bGFyU3BpcmFsLFxuICAgIH07XG4gIH1cbn0iXX0=