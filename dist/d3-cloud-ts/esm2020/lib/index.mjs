// Word cloud layout by Jason Davies, https://www.jasondavies.com/wordcloud/
// Updated by Benjamin Oakham to use D3 7.5.0 (for Strict Mode) and Type Script
// Algorithm due to Jonathan Feinberg, http://static.mrfeinberg.com/bv_ch03.pdf
import * as d3 from 'd3-dispatch';
export var D3CloudTs;
(function (D3CloudTs) {
    class Cloud {
        constructor() {
            this.cw = 1 << 11 >> 5;
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
            this.event = d3.dispatch("word", "end");
            this.random = Math.random;
            this.canvas = this.cloudCanvas;
            this.config = {};
            this.getContext = (canvas) => {
                canvas.width = canvas.height = 1;
                let ratio = Math.sqrt(canvas.getContext("2d").getImageData(0, 0, 1, 1).data.length >> 2);
                canvas.width = (this.cw << 5) / ratio;
                canvas.height = this.ch / ratio;
                let context = canvas.getContext("2d");
                context.fillStyle = context.strokeStyle = "red";
                context.textAlign = "center";
                return { context: context, ratio: ratio };
            };
            this.place = (board, tag, bounds) => {
                //let perimeter = [{x: 0, y: 0}, {x: this.size[0], y: this.size[1]}];
                let startX = tag.x;
                let startY = tag.y;
                let maxDelta = Math.sqrt(this.size[0] * this.size[0] + this.size[1] * this.size[1]);
                let s = this.spiral(this.size);
                let dt = this.random() < .5 ? 1 : -1;
                let t = -dt;
                let dxdy;
                let dx;
                let dy;
                while (dxdy = s(t += dt)) {
                    dx = ~~dxdy[0];
                    dy = ~~dxdy[1];
                    if (Math.min(Math.abs(dx), Math.abs(dy)) >= maxDelta)
                        break;
                    tag.x = startX + dx;
                    tag.y = startY + dy;
                    if (tag.x + tag.x0 < 0 || tag.y + tag.y0 < 0 ||
                        tag.x + tag.x1 > this.size[0] || tag.y + tag.y1 > this.size[1])
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
                                    board[x + i] |= (last << msx) | (i < w ? (last = sprite[j * w + i]) >>> sx : 0);
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
                return typeof returnVal === "function" ? returnVal : ((_, d, i) => { return returnVal; });
            };
            this.spirals = {
                archimedean: this.archimedeanSpiral,
                rectangular: this.rectangularSpiral
            };
            this.config.start = () => {
                let contextAndRatio = this.getContext(this.canvas());
                let board = this.zeroArray((this.size[0] >> 5) * this.size[1]);
                let bounds = null;
                const n = this.words.length;
                let i = -1;
                let tags = [];
                let data = this.words.map((d, i) => {
                    d.text = this.text(this, d, i);
                    d.font = this.font(this, d, i);
                    d.style = this.fontStyle(this, d, i);
                    d.weight = this.fontWeight(this, d, i);
                    d.rotate = this.rotate(this, d, i);
                    d.size = ~~this.fontSize(this, d, i);
                    d.padding = this.padding(this, d, i);
                    return d;
                }).sort((a, b) => { return b.size - a.size; });
                let step = () => {
                    let start = Date.now();
                    while (Date.now() - start < this.timeInterval && ++i < n && this.timer) {
                        let d = data[i];
                        d.x = (this.size[0] * (this.random() + .5)) >> 1;
                        d.y = (this.size[1] * (this.random() + .5)) >> 1;
                        this.cloudSprite(contextAndRatio, d, data, i);
                        if (d.hasText && this.place(board, d, bounds)) {
                            tags.push(d);
                            this.event.call("word", this.config, d);
                            if (bounds)
                                this.cloudBounds(bounds, d);
                            else
                                bounds = [{ x: d.x + d.x0, y: d.y + d.y0 }, { x: d.x + d.x1, y: d.y + d.y1 }];
                            // Temporary hack
                            d.x -= this.size[0] >> 1;
                            d.y -= this.size[1] >> 1;
                        }
                    }
                    if (i >= n) {
                        this.config.stop();
                        this.event.call("end", this.config, tags, bounds);
                    }
                };
                if (this.timer)
                    clearInterval(this.timer);
                this.timer = setInterval(step, 0);
                step();
                return this.config;
            };
            this.config.canvas = (_) => {
                return (_ ? (this.canvas = this.functor(_), this.config) : this.canvas);
            };
            this.config.stop = () => {
                if (this.timer) {
                    clearInterval(this.timer);
                    this.timer = null;
                }
                return this.config;
            };
            this.config.timeInterval = (_) => {
                return (_ ? (this.timeInterval = _ == null ? Infinity : _, this.config) : this.timeInterval);
            };
            this.config.words = (_) => {
                return (_ ? (this.words = _, this.config) : this.words);
            };
            this.config.size = (_) => {
                return (_ ? (this.size = [+_[0], +_[1]], this.config) : this.size);
            };
            this.config.font = (_) => {
                return (_ ? (this.font = this.functor(_), this.config) : this.font);
            };
            this.config.fontStyle = (_) => {
                return (_ ? (this.fontStyle = this.functor(_), this.config) : this.fontStyle);
            };
            this.config.fontWeight = (_) => {
                return (_ ? (this.fontWeight = this.functor(_), this.config) : this.fontWeight);
            };
            this.config.rotate = (_) => {
                return (_ ? (this.rotate = this.functor(_), this.config) : this.rotate);
            };
            this.config.text = (_) => {
                return (_ ? (this.text = this.functor(_), this.config) : this.text);
            };
            this.config.spiral = (_) => {
                return (_ ? (this.spiral = ((_ == 'archimedean' || _ == 'rectangular') ? this.spirals[_] : _), this.config) : this.spiral);
            };
            this.config.fontSize = (_) => {
                return (_ ? (this.fontSize = this.functor(_), this.config) : this.fontSize);
            };
            this.config.padding = (_) => {
                return (_ ? (this.padding = this.functor(_), this.config) : this.padding);
            };
            this.config.random = (_) => {
                return (_ ? (this.random = _, this.config) : this.random);
            };
            this.config.on = (_) => {
                let value = this.event.on.apply(this.event, _);
                return (value === this.event ? this.config : value);
            };
        }
        ;
        cloudText(_, d, i) {
            return d.text;
        }
        cloudFont(_, d, i) {
            return "serif";
        }
        cloudFontNormal(_, d, i) {
            return "normal";
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
                c.font = d.style + " " + d.weight + " " + ~~((d.size + 1) / ratio) + "px " + d.font;
                let w = c.measureText(d.text + "m").width * ratio;
                let h = d.size << 1;
                if (d.rotate) {
                    let sr = Math.sin(d.rotate * Cloud.cloudRadians);
                    let cr = Math.cos(d.rotate * Cloud.cloudRadians);
                    let wcr = w * cr;
                    let wsr = w * sr;
                    let hcr = h * cr;
                    let hsr = h * sr;
                    w = (Math.max(Math.abs(wcr + hsr), Math.abs(wcr - hsr)) + 0x1f) >> 5 << 5;
                    h = ~~Math.max(Math.abs(wsr + hcr), Math.abs(wsr - hcr));
                }
                else {
                    w = (w + 0x1f) >> 5 << 5;
                }
                if (h > maxh)
                    maxh = h;
                if (x + w >= (this.cw << 5)) {
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
                    c.lineWidth = 2 * d.padding, c.strokeText(d.text, 0, 0);
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
                        let m = pixels[((y + j) * (this.cw << 5) + (x + i)) << 2] ? 1 << (31 - (i % 32)) : 0;
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
                    if (((last << msx) | (i < w ? (last = sprite[j * w + i]) >>> sx : 0))
                        & board[x + i])
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
            return a.x + a.x1 > b[0].x && a.x + a.x0 < b[1].x && a.y + a.y1 > b[0].y && a.y + a.y0 < b[1].y;
        }
        archimedeanSpiral(size) {
            let e = size[0] / size[1];
            return (t) => {
                return [e * (t *= .1) * Math.cos(t), t * Math.sin(t)];
            };
        }
        rectangularSpiral(size) {
            let dy = 4;
            let dx = dy * size[0] / size[1];
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
            return document.createElement("canvas");
        }
    }
    Cloud.cloudRadians = Math.PI / 180;
    D3CloudTs.Cloud = Cloud;
    ;
})(D3CloudTs || (D3CloudTs = {}));
;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9wcm9qZWN0cy9kMy1jbG91ZC10cy9zcmMvbGliL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLDRFQUE0RTtBQUM1RSwrRUFBK0U7QUFDL0UsK0VBQStFO0FBSS9FLE9BQU8sS0FBSyxFQUFFLE1BQU0sYUFBYSxDQUFDO0FBRWxDLE1BQU0sS0FBVyxTQUFTLENBNGR6QjtBQTVkRCxXQUFpQixTQUFTO0lBeUV4QixNQUFhLEtBQUs7UUFzQmhCO1lBbkJVLE9BQUUsR0FBRyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztZQUNsQixPQUFFLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNiLFNBQUksR0FBcUIsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUM7WUFDcEMsU0FBSSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUM7WUFDdEIsU0FBSSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUM7WUFDdEIsYUFBUSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUM7WUFDOUIsY0FBUyxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUM7WUFDakMsZUFBVSxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUM7WUFDbEMsV0FBTSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUM7WUFDMUIsWUFBTyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUM7WUFDNUIsV0FBTSxHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQztZQUNoQyxVQUFLLEdBQVcsRUFBRSxDQUFDO1lBQ25CLGlCQUFZLEdBQUcsUUFBUSxDQUFDO1lBQ3hCLFVBQUssR0FBRyxFQUFFLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsQ0FBQztZQUVuQyxXQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQztZQUNyQixXQUFNLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQztZQUM3QixXQUFNLEdBQWMsRUFB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M0IsSUFBSSxDQUFDLEdBQWEsRUFBRSxDQUFDO1lBQ3JCLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQ1gsT0FBTyxFQUFFLENBQUMsR0FBRyxDQUFDO2dCQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDekIsT0FBTyxDQUFDLENBQUM7UUFDWCxDQUFDO1FBRUQsV0FBVztZQUNULE9BQU8sUUFBUSxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUMxQyxDQUFDOztJQW5ZZ0Isa0JBQVksR0FBRyxJQUFJLENBQUMsRUFBRSxHQUFHLEdBQUcsQ0FBQztJQUZuQyxlQUFLLFFBaVpqQixDQUFBO0lBQUEsQ0FBQztBQUVKLENBQUMsRUE1ZGdCLFNBQVMsS0FBVCxTQUFTLFFBNGR6QjtBQUFBLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBXb3JkIGNsb3VkIGxheW91dCBieSBKYXNvbiBEYXZpZXMsIGh0dHBzOi8vd3d3Lmphc29uZGF2aWVzLmNvbS93b3JkY2xvdWQvXG4vLyBVcGRhdGVkIGJ5IEJlbmphbWluIE9ha2hhbSB0byB1c2UgRDMgNy41LjAgKGZvciBTdHJpY3QgTW9kZSkgYW5kIFR5cGUgU2NyaXB0XG4vLyBBbGdvcml0aG0gZHVlIHRvIEpvbmF0aGFuIEZlaW5iZXJnLCBodHRwOi8vc3RhdGljLm1yZmVpbmJlcmcuY29tL2J2X2NoMDMucGRmXG5cblxuXG5pbXBvcnQgKiBhcyBkMyBmcm9tICdkMy1kaXNwYXRjaCc7XG5cbmV4cG9ydCBuYW1lc3BhY2UgRDNDbG91ZFRzIHtcblxuICB0eXBlIGNhbnZhc1R5cGU8VD4gPVxuICAgIFQgZXh0ZW5kcyBIVE1MQ2FudmFzRWxlbWVudCB8ICgoKSA9PiBIVE1MQ2FudmFzRWxlbWVudCkgPyBDbG91ZERhdGEgOiAoKCkgPT4gSFRNTENhbnZhc0VsZW1lbnQpO1xuXG4gIHR5cGUgdGltZUludmVydmFsVHlwZTxUPiA9XG4gICAgVCBleHRlbmRzIG51bWJlciB8IG51bGwgPyBDbG91ZERhdGEgOiBudW1iZXI7XG5cbiAgdHlwZSB3b3JkVHlwZTxUPiA9XG4gICAgVCBleHRlbmRzIFdvcmRbXSA/IENsb3VkRGF0YSA6IFdvcmRbXVxuXG4gIHR5cGUgdGV4dEZ1bmN0b3JUeXBlPFQ+ID1cbiAgICBUIGV4dGVuZHMgU3RyaW5nIHwgKChfOiBhbnksIGQ6IFdvcmQsIGk6IG51bWJlcikgPT4gU3RyaW5nKSA/IENsb3VkRGF0YSA6ICgoXzogYW55LCBkOiBXb3JkLCBpOiBudW1iZXIpID0+IFN0cmluZyk7XG5cbiAgdHlwZSBudW1iZXJGdW5jdG9yVHlwZTxUPiA9XG4gICAgVCBleHRlbmRzIG51bWJlciB8ICgoXzogYW55LCBkOiBXb3JkLCBpOiBudW1iZXIpID0+IG51bWJlcikgPyBDbG91ZERhdGEgOiAoKF86IGFueSwgZDogV29yZCwgaTogbnVtYmVyKSA9PiBudW1iZXIpO1xuXG4gIHR5cGUgc2l6ZVR5cGU8VD4gPVxuICAgIFQgZXh0ZW5kcyBudW1iZXJbXSA/IENsb3VkRGF0YSA6IFtudW1iZXIsIG51bWJlcl07XG5cbiAgdHlwZSBzcGlyYWxUeXBlPFQ+ID1cbiAgICBUIGV4dGVuZHMgU3RyaW5nIHwgKChzaXplOiBudW1iZXJbXSkgPT4gKHQ6IG51bWJlcikgPT4gbnVtYmVyW10pID8gQ2xvdWREYXRhIDogKHNpemU6IG51bWJlcltdKSA9PiAodDogbnVtYmVyKSA9PiBudW1iZXJbXTtcblxuICB0eXBlIHJhbmRvbVR5cGU8VD4gPVxuICAgIFQgZXh0ZW5kcyAoKCkgPT4gbnVtYmVyKSA/IENsb3VkRGF0YSA6IG51bWJlcjtcblxuICB0eXBlIG9uVHlwZTxUPiA9XG4gICAgVCBleHRlbmRzIGFueVtdID8gQ2xvdWREYXRhIDogYW55O1xuXG5cbiAgZXhwb3J0IGludGVyZmFjZSBDbG91ZERhdGEge1xuICAgIGNhbnZhcz86IDxUPihfPzogVCkgPT4gY2FudmFzVHlwZTxUPixcbiAgICBzdGFydD86ICgpID0+IENsb3VkRGF0YSxcbiAgICBzdG9wPzogKCkgPT4gQ2xvdWREYXRhLFxuICAgIHRpbWVJbnRlcnZhbD86IDxUIGV4dGVuZHMgbnVtYmVyIHwgbnVsbD4oXz86IFQpID0+IHRpbWVJbnZlcnZhbFR5cGU8VD4sXG4gICAgd29yZHM/OiA8VCBleHRlbmRzIFdvcmRbXT4oXz86IFQpID0+IHdvcmRUeXBlPFQ+LFxuICAgIHNpemU/OiA8VCBleHRlbmRzIG51bWJlcltdPihfPzogVCkgPT4gc2l6ZVR5cGU8VD4sXG4gICAgZm9udD86IDxUIGV4dGVuZHMgU3RyaW5nIHwgKChfOiBhbnksIGQ6IFdvcmQsIGk6IG51bWJlcikgPT4gU3RyaW5nKSA+KF8/OiBUKSA9PiB0ZXh0RnVuY3RvclR5cGU8VD4sXG4gICAgZm9udFN0eWxlPzogPFQgZXh0ZW5kcyBTdHJpbmcgfCAoKF86IGFueSwgZDogV29yZCwgaTogbnVtYmVyKSA9PiBTdHJpbmcpID4oXz86IFQpID0+IHRleHRGdW5jdG9yVHlwZTxUPixcbiAgICBmb250V2VpZ2h0PzogPFQgZXh0ZW5kcyBTdHJpbmcgfCAoKF86IGFueSwgZDogV29yZCwgaTogbnVtYmVyKSA9PiBTdHJpbmcpID4oXz86IFQpID0+IHRleHRGdW5jdG9yVHlwZTxUPixcbiAgICByb3RhdGU/OiA8VCBleHRlbmRzIG51bWJlciB8ICgoXzogYW55LCBkOiBXb3JkLCBpOiBudW1iZXIpID0+IG51bWJlcikgPihfPzogVCkgPT4gbnVtYmVyRnVuY3RvclR5cGU8VD4sXG4gICAgdGV4dD86IDxUIGV4dGVuZHMgU3RyaW5nIHwgKChfOiBhbnksIGQ6IFdvcmQsIGk6IG51bWJlcikgPT4gU3RyaW5nKSA+KF8/OiBUKSA9PiB0ZXh0RnVuY3RvclR5cGU8VD4sXG4gICAgc3BpcmFsPzogPFQgZXh0ZW5kcyBTdHJpbmcgfCAoKHNpemU6IG51bWJlcltdKSA9PiAodDogbnVtYmVyKSA9PiBudW1iZXJbXSkgPihfPzogVCkgPT4gc3BpcmFsVHlwZTxUPixcbiAgICBmb250U2l6ZT86IDxUIGV4dGVuZHMgbnVtYmVyIHwgKChfOiBhbnksIGQ6IFdvcmQsIGk6IG51bWJlcikgPT4gbnVtYmVyKSA+KF8/OiBUKSA9PiBudW1iZXJGdW5jdG9yVHlwZTxUPixcbiAgICBwYWRkaW5nPzogPFQgZXh0ZW5kcyBudW1iZXIgfCAoKF86IGFueSwgZDogV29yZCwgaTogbnVtYmVyKSA9PiBudW1iZXIpID4oXz86IFQpID0+IG51bWJlckZ1bmN0b3JUeXBlPFQ+LFxuICAgIHJhbmRvbT86IDxUIGV4dGVuZHMgKCgpID0+IG51bWJlcikgPihfPzogVCkgPT4gcmFuZG9tVHlwZTxUPixcbiAgICBvbj86IDxUIGV4dGVuZHMgYW55WzJdPihfOiBUKSA9PiBvblR5cGU8VD5cbiAgfVxuXG4gIGV4cG9ydCBpbnRlcmZhY2UgV29yZCB7XG4gICAga2V5OiBzdHJpbmcsXG4gICAgdmFsdWU6IG51bWJlcixcbiAgICB0ZXh0Pzogc3RyaW5nLFxuICAgIGZvbnQ/OiBzdHJpbmcsXG4gICAgc3R5bGU/OiBzdHJpbmcsXG4gICAgd2VpZ2h0Pzogc3RyaW5nLFxuICAgIHJvdGF0ZT86IG51bWJlcixcbiAgICBzaXplPzogbnVtYmVyLFxuICAgIHBhZGRpbmc/OiBudW1iZXIsXG4gICAgc3ByaXRlPzogbnVtYmVyW10sXG4gICAgeD86IG51bWJlcixcbiAgICB4MD86IG51bWJlcixcbiAgICB4MT86IG51bWJlcixcbiAgICB4b2ZmPzogbnVtYmVyLFxuICAgIHk/OiBudW1iZXIsXG4gICAgeTA/OiBudW1iZXIsXG4gICAgeTE/OiBudW1iZXIsXG4gICAgeW9mZj86IG51bWJlcixcbiAgICBoYXNUZXh0PzogYm9vbGVhbixcbiAgICB3aWR0aD86IG51bWJlcixcbiAgICBoZWlnaHQ/OiBudW1iZXIsXG4gIH1cblxuICBleHBvcnQgY2xhc3MgQ2xvdWQge1xuXG4gICAgcHJvdGVjdGVkIHN0YXRpYyBjbG91ZFJhZGlhbnMgPSBNYXRoLlBJIC8gMTgwO1xuICAgIHByb3RlY3RlZCBjdyA9IDEgPDwgMTEgPj4gNTtcbiAgICBwcm90ZWN0ZWQgY2ggPSAxIDw8IDExO1xuICAgIHByb3RlY3RlZCBzaXplOiBbbnVtYmVyLCBudW1iZXJdID0gWzI1NiwgMjU2XTtcbiAgICBwcm90ZWN0ZWQgdGV4dCA9IHRoaXMuY2xvdWRUZXh0O1xuICAgIHByb3RlY3RlZCBmb250ID0gdGhpcy5jbG91ZEZvbnQ7XG4gICAgcHJvdGVjdGVkIGZvbnRTaXplID0gdGhpcy5jbG91ZEZvbnRTaXplO1xuICAgIHByb3RlY3RlZCBmb250U3R5bGUgPSB0aGlzLmNsb3VkRm9udE5vcm1hbDtcbiAgICBwcm90ZWN0ZWQgZm9udFdlaWdodCA9IHRoaXMuY2xvdWRGb250Tm9ybWFsO1xuICAgIHByb3RlY3RlZCByb3RhdGUgPSB0aGlzLmNsb3VkUm90YXRlO1xuICAgIHByb3RlY3RlZCBwYWRkaW5nID0gdGhpcy5jbG91ZFBhZGRpbmc7XG4gICAgcHJvdGVjdGVkIHNwaXJhbCA9IHRoaXMuYXJjaGltZWRlYW5TcGlyYWw7XG4gICAgcHJvdGVjdGVkIHdvcmRzOiBXb3JkW10gPSBbXTtcbiAgICBwcm90ZWN0ZWQgdGltZUludGVydmFsID0gSW5maW5pdHk7XG4gICAgcHJvdGVjdGVkIGV2ZW50ID0gZDMuZGlzcGF0Y2goXCJ3b3JkXCIsIFwiZW5kXCIpO1xuICAgIHByb3RlY3RlZCB0aW1lcj86IFJldHVyblR5cGU8dHlwZW9mIHNldEludGVydmFsPiB8IG51bGw7XG4gICAgcHJvdGVjdGVkIHJhbmRvbSA9IE1hdGgucmFuZG9tO1xuICAgIHByb3RlY3RlZCBjYW52YXMgPSB0aGlzLmNsb3VkQ2FudmFzO1xuICAgIHB1YmxpYyBjb25maWc6IENsb3VkRGF0YSA9IHt9O1xuXG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICB0aGlzLmNvbmZpZy5zdGFydCA9ICgpID0+IHtcbiAgICAgICAgbGV0IGNvbnRleHRBbmRSYXRpbzogeyBjb250ZXh0OiBDYW52YXNSZW5kZXJpbmdDb250ZXh0MkQsIHJhdGlvOiBudW1iZXIgfSA9IDx7IGNvbnRleHQ6IENhbnZhc1JlbmRlcmluZ0NvbnRleHQyRCwgcmF0aW86IG51bWJlciB9PnRoaXMuZ2V0Q29udGV4dCh0aGlzLmNhbnZhcygpKTtcbiAgICAgICAgbGV0IGJvYXJkOiBudW1iZXJbXSA9IHRoaXMuemVyb0FycmF5KCh0aGlzLnNpemVbMF0gPj4gNSkgKiB0aGlzLnNpemVbMV0pO1xuICAgICAgICBsZXQgYm91bmRzOiB7IHg6IG51bWJlciwgeTogbnVtYmVyIH1bXSB8IG51bGwgPSBudWxsO1xuICAgICAgICBjb25zdCBuID0gdGhpcy53b3Jkcy5sZW5ndGg7XG4gICAgICAgIGxldCBpID0gLTE7XG4gICAgICAgIGxldCB0YWdzOiBXb3JkW10gPSBbXTtcbiAgICAgICAgbGV0IGRhdGE6IFdvcmRbXSA9IHRoaXMud29yZHMubWFwKChkLCBpKSA9PiB7XG4gICAgICAgICAgZC50ZXh0ID0gdGhpcy50ZXh0KHRoaXMsIGQsIGkpO1xuICAgICAgICAgIGQuZm9udCA9IHRoaXMuZm9udCh0aGlzLCBkLCBpKTtcbiAgICAgICAgICBkLnN0eWxlID0gdGhpcy5mb250U3R5bGUodGhpcywgZCwgaSk7XG4gICAgICAgICAgZC53ZWlnaHQgPSB0aGlzLmZvbnRXZWlnaHQodGhpcywgZCwgaSk7XG4gICAgICAgICAgZC5yb3RhdGUgPSB0aGlzLnJvdGF0ZSh0aGlzLCBkLCBpKTtcbiAgICAgICAgICBkLnNpemUgPSB+fnRoaXMuZm9udFNpemUodGhpcywgZCwgaSk7XG4gICAgICAgICAgZC5wYWRkaW5nID0gdGhpcy5wYWRkaW5nKHRoaXMsIGQsIGkpO1xuICAgICAgICAgIHJldHVybiBkO1xuICAgICAgICB9KS5zb3J0KChhLCBiKSA9PiB7IHJldHVybiBiLnNpemUhIC0gYS5zaXplITsgfSk7XG4gICAgICAgIGxldCBzdGVwID0gKCkgPT4ge1xuICAgICAgICAgIGxldCBzdGFydCA9IERhdGUubm93KCk7XG4gICAgICAgICAgd2hpbGUgKERhdGUubm93KCkgLSBzdGFydCA8IHRoaXMudGltZUludGVydmFsICYmICsraSA8IG4gJiYgdGhpcy50aW1lcikge1xuICAgICAgICAgICAgbGV0IGQ6IFdvcmQgPSBkYXRhW2ldO1xuICAgICAgICAgICAgZC54ID0gKHRoaXMuc2l6ZVswXSAqICh0aGlzLnJhbmRvbSgpICsgLjUpKSA+PiAxO1xuICAgICAgICAgICAgZC55ID0gKHRoaXMuc2l6ZVsxXSAqICh0aGlzLnJhbmRvbSgpICsgLjUpKSA+PiAxO1xuICAgICAgICAgICAgdGhpcy5jbG91ZFNwcml0ZShjb250ZXh0QW5kUmF0aW8sIGQsIGRhdGEsIGkpO1xuICAgICAgICAgICAgaWYgKGQuaGFzVGV4dCAmJiB0aGlzLnBsYWNlKGJvYXJkLCBkLCBib3VuZHMhKSkge1xuICAgICAgICAgICAgICB0YWdzLnB1c2goZCk7XG4gICAgICAgICAgICAgIHRoaXMuZXZlbnQuY2FsbChcIndvcmRcIiwgdGhpcy5jb25maWcsIGQpO1xuICAgICAgICAgICAgICBpZiAoYm91bmRzKSB0aGlzLmNsb3VkQm91bmRzKGJvdW5kcywgZCk7XG4gICAgICAgICAgICAgIGVsc2UgYm91bmRzID0gW3sgeDogZC54ICsgZC54MCEsIHk6IGQueSArIGQueTAhIH0sIHsgeDogZC54ICsgZC54MSEsIHk6IGQueSArIGQueTEhIH1dO1xuICAgICAgICAgICAgICAvLyBUZW1wb3JhcnkgaGFja1xuICAgICAgICAgICAgICBkLnggLT0gdGhpcy5zaXplWzBdID4+IDE7XG4gICAgICAgICAgICAgIGQueSAtPSB0aGlzLnNpemVbMV0gPj4gMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGkgPj0gbikge1xuICAgICAgICAgICAgdGhpcy5jb25maWcuc3RvcCEoKTtcbiAgICAgICAgICAgIHRoaXMuZXZlbnQuY2FsbChcImVuZFwiLCB0aGlzLmNvbmZpZywgdGFncywgYm91bmRzKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMudGltZXIpIGNsZWFySW50ZXJ2YWwodGhpcy50aW1lcik7XG4gICAgICAgIHRoaXMudGltZXIgPSBzZXRJbnRlcnZhbChzdGVwLCAwKTtcbiAgICAgICAgc3RlcCgpO1xuXG4gICAgICAgIHJldHVybiB0aGlzLmNvbmZpZztcblxuICAgICAgfVxuXG4gICAgICB0aGlzLmNvbmZpZy5jYW52YXMgPSA8VD4oXz86IFQpID0+IHtcbiAgICAgICAgcmV0dXJuIDxjYW52YXNUeXBlPFQ+PihfID8gKHRoaXMuY2FudmFzID0gdGhpcy5mdW5jdG9yKF8pLCB0aGlzLmNvbmZpZykgOiB0aGlzLmNhbnZhcyk7XG4gICAgICB9O1xuXG4gICAgICB0aGlzLmNvbmZpZy5zdG9wID0gKCkgPT4ge1xuICAgICAgICBpZiAodGhpcy50aW1lcikge1xuICAgICAgICAgIGNsZWFySW50ZXJ2YWwodGhpcy50aW1lcik7XG4gICAgICAgICAgdGhpcy50aW1lciA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuY29uZmlnO1xuICAgICAgfTtcblxuICAgICAgdGhpcy5jb25maWcudGltZUludGVydmFsID0gPFQgZXh0ZW5kcyBudW1iZXIgfCBudWxsPihfPzogVCk6IHRpbWVJbnZlcnZhbFR5cGU8VD4gPT4ge1xuXG4gICAgICAgIHJldHVybiA8dGltZUludmVydmFsVHlwZTxUPj4oXyA/ICh0aGlzLnRpbWVJbnRlcnZhbCA9IF8gPT0gbnVsbCA/IEluZmluaXR5IDogXywgdGhpcy5jb25maWcpIDogdGhpcy50aW1lSW50ZXJ2YWwpO1xuICAgICAgfTtcblxuICAgICAgdGhpcy5jb25maWcud29yZHMgPSA8VCBleHRlbmRzIFdvcmRbXT4oXz86IFQpID0+IHtcbiAgICAgICAgcmV0dXJuIDx3b3JkVHlwZTxUPj4oXyA/ICh0aGlzLndvcmRzID0gXywgdGhpcy5jb25maWcpIDogdGhpcy53b3Jkcyk7XG4gICAgICB9O1xuXG4gICAgICB0aGlzLmNvbmZpZy5zaXplID0gPFQgZXh0ZW5kcyBudW1iZXJbXT4oXz86IFQpID0+IHtcbiAgICAgICAgcmV0dXJuIDxzaXplVHlwZTxUPj4oXyA/ICh0aGlzLnNpemUgPSBbK19bMF0sICtfWzFdXSwgdGhpcy5jb25maWcpIDogdGhpcy5zaXplKTtcbiAgICAgIH07XG5cblxuICAgICAgdGhpcy5jb25maWcuZm9udCA9IDxUIGV4dGVuZHMgU3RyaW5nIHwgKChfOiBhbnksIGQ6IFdvcmQsIGk6IG51bWJlcikgPT4gU3RyaW5nKT4oXz86IFQpID0+IHtcbiAgICAgICAgcmV0dXJuIDx0ZXh0RnVuY3RvclR5cGU8VD4+KF8gPyAodGhpcy5mb250ID0gdGhpcy5mdW5jdG9yKF8pLCB0aGlzLmNvbmZpZykgOiB0aGlzLmZvbnQpO1xuICAgICAgfTtcblxuICAgICAgdGhpcy5jb25maWcuZm9udFN0eWxlID0gPFQgZXh0ZW5kcyBTdHJpbmcgfCAoKF86IGFueSwgZDogV29yZCwgaTogbnVtYmVyKSA9PiBTdHJpbmcpPihfPzogVCkgPT4ge1xuICAgICAgICByZXR1cm4gPHRleHRGdW5jdG9yVHlwZTxUPj4oXyA/ICh0aGlzLmZvbnRTdHlsZSA9IHRoaXMuZnVuY3RvcihfKSwgdGhpcy5jb25maWcpIDogdGhpcy5mb250U3R5bGUpO1xuICAgICAgfTtcblxuICAgICAgdGhpcy5jb25maWcuZm9udFdlaWdodCA9IDxUIGV4dGVuZHMgU3RyaW5nIHwgKChfOiBhbnksIGQ6IFdvcmQsIGk6IG51bWJlcikgPT4gU3RyaW5nKT4oXz86IFQpID0+IHtcbiAgICAgICAgcmV0dXJuIDx0ZXh0RnVuY3RvclR5cGU8VD4+KF8gPyAodGhpcy5mb250V2VpZ2h0ID0gdGhpcy5mdW5jdG9yKF8pLCB0aGlzLmNvbmZpZykgOiB0aGlzLmZvbnRXZWlnaHQpO1xuICAgICAgfTtcblxuICAgICAgdGhpcy5jb25maWcucm90YXRlID0gPFQgZXh0ZW5kcyBudW1iZXIgfCAoKF86IGFueSwgZDogV29yZCwgaTogbnVtYmVyKSA9PiBudW1iZXIpPihfPzogVCkgPT4ge1xuICAgICAgICByZXR1cm4gPG51bWJlckZ1bmN0b3JUeXBlPFQ+PihfID8gKHRoaXMucm90YXRlID0gdGhpcy5mdW5jdG9yKF8pLCB0aGlzLmNvbmZpZykgOiB0aGlzLnJvdGF0ZSk7XG4gICAgICB9O1xuXG4gICAgICB0aGlzLmNvbmZpZy50ZXh0ID0gPFQgZXh0ZW5kcyBTdHJpbmcgfCAoKF86IGFueSwgZDogV29yZCwgaTogbnVtYmVyKSA9PiBTdHJpbmcpPihfPzogVCkgPT4ge1xuICAgICAgICByZXR1cm4gPHRleHRGdW5jdG9yVHlwZTxUPj4oXyA/ICh0aGlzLnRleHQgPSB0aGlzLmZ1bmN0b3IoXyksIHRoaXMuY29uZmlnKSA6IHRoaXMudGV4dCk7XG4gICAgICB9O1xuXG4gICAgICB0aGlzLmNvbmZpZy5zcGlyYWwgPSA8VCBleHRlbmRzIFN0cmluZyB8ICgoc2l6ZTogbnVtYmVyW10pID0+ICh0OiBudW1iZXIpID0+IG51bWJlcltdKT4oXz86IFQpID0+IHtcblxuICAgICAgICByZXR1cm4gPHNwaXJhbFR5cGU8VD4+KF8gPyAodGhpcy5zcGlyYWwgPSAoKDxTdHJpbmc+XyA9PSAnYXJjaGltZWRlYW4nIHx8IDxTdHJpbmc+XyA9PSAncmVjdGFuZ3VsYXInKSA/IHRoaXMuc3BpcmFsc1s8J2FyY2hpbWVkZWFuJyB8ICdyZWN0YW5ndWxhcic+X10gOiA8KHNpemU6IG51bWJlcltdKSA9PiAodDogbnVtYmVyKSA9PiBudW1iZXJbXT5fKSwgdGhpcy5jb25maWcpIDogdGhpcy5zcGlyYWwpO1xuICAgICAgfTtcblxuICAgICAgdGhpcy5jb25maWcuZm9udFNpemUgPSA8VCBleHRlbmRzIG51bWJlciB8ICgoXzogYW55LCBkOiBXb3JkLCBpOiBudW1iZXIpID0+IG51bWJlcik+KF8/OiBUKSA9PiB7XG4gICAgICAgIHJldHVybiA8bnVtYmVyRnVuY3RvclR5cGU8VD4+KF8gPyAodGhpcy5mb250U2l6ZSA9IHRoaXMuZnVuY3RvcihfKSwgdGhpcy5jb25maWcpIDogdGhpcy5mb250U2l6ZSk7XG4gICAgICB9O1xuXG4gICAgICB0aGlzLmNvbmZpZy5wYWRkaW5nID0gPFQgZXh0ZW5kcyBudW1iZXIgfCAoKF86IGFueSwgZDogV29yZCwgaTogbnVtYmVyKSA9PiBudW1iZXIpPihfPzogVCkgPT4ge1xuICAgICAgICByZXR1cm4gPG51bWJlckZ1bmN0b3JUeXBlPFQ+PihfID8gKHRoaXMucGFkZGluZyA9IHRoaXMuZnVuY3RvcihfKSwgdGhpcy5jb25maWcpIDogdGhpcy5wYWRkaW5nKTtcbiAgICAgIH07XG5cbiAgICAgIHRoaXMuY29uZmlnLnJhbmRvbSA9IDxUIGV4dGVuZHMgKCgpID0+IG51bWJlcik+KF8/OiBUKSA9PiB7XG4gICAgICAgIHJldHVybiA8cmFuZG9tVHlwZTxUPj4oXyA/ICh0aGlzLnJhbmRvbSA9IF8sIHRoaXMuY29uZmlnKSA6IHRoaXMucmFuZG9tKTtcbiAgICAgIH07XG5cbiAgICAgIHRoaXMuY29uZmlnLm9uID0gPFQgZXh0ZW5kcyBhbnlbMl0+KF86IFQpID0+IHtcbiAgICAgICAgbGV0IHZhbHVlOiBhbnkgPSB0aGlzLmV2ZW50Lm9uLmFwcGx5KHRoaXMuZXZlbnQsIDxhbnlbMl0+Xyk7XG4gICAgICAgIHJldHVybiA8b25UeXBlPFQ+Pih2YWx1ZSA9PT0gdGhpcy5ldmVudCA/IHRoaXMuY29uZmlnIDogdmFsdWUpO1xuICAgICAgfTtcblxuXG4gICAgfTtcblxuICAgIHByb3RlY3RlZCBnZXRDb250ZXh0ID0gKGNhbnZhczogSFRNTENhbnZhc0VsZW1lbnQpID0+IHtcbiAgICAgIGNhbnZhcy53aWR0aCA9IGNhbnZhcy5oZWlnaHQgPSAxO1xuICAgICAgbGV0IHJhdGlvID0gTWF0aC5zcXJ0KGNhbnZhcy5nZXRDb250ZXh0KFwiMmRcIikhLmdldEltYWdlRGF0YSgwLCAwLCAxLCAxKS5kYXRhLmxlbmd0aCA+PiAyKTtcbiAgICAgIGNhbnZhcy53aWR0aCA9ICh0aGlzLmN3IDw8IDUpIC8gcmF0aW87XG4gICAgICBjYW52YXMuaGVpZ2h0ID0gdGhpcy5jaCAvIHJhdGlvO1xuXG4gICAgICBsZXQgY29udGV4dCA9IGNhbnZhcy5nZXRDb250ZXh0KFwiMmRcIik7XG4gICAgICBjb250ZXh0IS5maWxsU3R5bGUgPSBjb250ZXh0IS5zdHJva2VTdHlsZSA9IFwicmVkXCI7XG4gICAgICBjb250ZXh0IS50ZXh0QWxpZ24gPSBcImNlbnRlclwiO1xuXG4gICAgICByZXR1cm4geyBjb250ZXh0OiBjb250ZXh0LCByYXRpbzogcmF0aW8gfTtcbiAgICB9XG5cblxuICAgIHByb3RlY3RlZCBwbGFjZSA9IChib2FyZDogbnVtYmVyW10sIHRhZzogV29yZCwgYm91bmRzOiB7IHg6IG51bWJlciwgeTogbnVtYmVyIH1bXSkgPT4ge1xuICAgICAgLy9sZXQgcGVyaW1ldGVyID0gW3t4OiAwLCB5OiAwfSwge3g6IHRoaXMuc2l6ZVswXSwgeTogdGhpcy5zaXplWzFdfV07XG4gICAgICBsZXQgc3RhcnRYID0gdGFnLnghO1xuICAgICAgbGV0IHN0YXJ0WSA9IHRhZy55ITtcbiAgICAgIGxldCBtYXhEZWx0YSA9IE1hdGguc3FydCh0aGlzLnNpemVbMF0gKiB0aGlzLnNpemVbMF0gKyB0aGlzLnNpemVbMV0gKiB0aGlzLnNpemVbMV0pO1xuICAgICAgbGV0IHMgPSB0aGlzLnNwaXJhbCh0aGlzLnNpemUpO1xuICAgICAgbGV0IGR0ID0gdGhpcy5yYW5kb20oKSA8IC41ID8gMSA6IC0xO1xuICAgICAgbGV0IHQgPSAtZHQ7XG4gICAgICBsZXQgZHhkeTogbnVtYmVyW107XG4gICAgICBsZXQgZHg6IG51bWJlcjtcbiAgICAgIGxldCBkeTogbnVtYmVyO1xuXG4gICAgICB3aGlsZSAoZHhkeSA9IHModCArPSBkdCkpIHtcbiAgICAgICAgZHggPSB+fmR4ZHlbMF07XG4gICAgICAgIGR5ID0gfn5keGR5WzFdO1xuXG4gICAgICAgIGlmIChNYXRoLm1pbihNYXRoLmFicyhkeCksIE1hdGguYWJzKGR5KSkgPj0gbWF4RGVsdGEpIGJyZWFrO1xuXG4gICAgICAgIHRhZy54ID0gc3RhcnRYICsgZHg7XG4gICAgICAgIHRhZy55ID0gc3RhcnRZICsgZHk7XG5cbiAgICAgICAgaWYgKHRhZy54ICsgdGFnLngwISA8IDAgfHwgdGFnLnkgKyB0YWcueTAhIDwgMCB8fFxuICAgICAgICAgIHRhZy54ICsgdGFnLngxISA+IHRoaXMuc2l6ZVswXSB8fCB0YWcueSArIHRhZy55MSEgPiB0aGlzLnNpemVbMV0pIGNvbnRpbnVlO1xuICAgICAgICAvLyBUT0RPIG9ubHkgY2hlY2sgZm9yIGNvbGxpc2lvbnMgd2l0aGluIGN1cnJlbnQgYm91bmRzLlxuICAgICAgICBpZiAoIWJvdW5kcyB8fCAhdGhpcy5jbG91ZENvbGxpZGUodGFnLCBib2FyZCwgdGhpcy5zaXplWzBdKSkge1xuICAgICAgICAgIGlmICghYm91bmRzIHx8IHRoaXMuY29sbGlkZVJlY3RzKHRhZywgYm91bmRzKSkge1xuICAgICAgICAgICAgbGV0IHNwcml0ZSA9IHRhZy5zcHJpdGU7XG4gICAgICAgICAgICBsZXQgdyA9IHRhZy53aWR0aCEgPj4gNTtcbiAgICAgICAgICAgIGxldCBzdyA9IHRoaXMuc2l6ZVswXSA+PiA1O1xuICAgICAgICAgICAgbGV0IGx4ID0gdGFnLnggLSAodyA8PCA0KTtcbiAgICAgICAgICAgIGxldCBzeCA9IGx4ICYgMHg3ZjtcbiAgICAgICAgICAgIGxldCBtc3ggPSAzMiAtIHN4O1xuICAgICAgICAgICAgbGV0IGggPSB0YWcueTEhIC0gdGFnLnkwITtcbiAgICAgICAgICAgIGxldCB4ID0gKHRhZy55ICsgdGFnLnkwISkgKiBzdyArIChseCA+PiA1KTtcbiAgICAgICAgICAgIGxldCBsYXN0OiBudW1iZXI7XG4gICAgICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IGg7IGorKykge1xuICAgICAgICAgICAgICBsYXN0ID0gMDtcbiAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPD0gdzsgaSsrKSB7XG4gICAgICAgICAgICAgICAgYm9hcmRbeCArIGldIHw9IChsYXN0IDw8IG1zeCkgfCAoaSA8IHcgPyAobGFzdCA9IHNwcml0ZSFbaiAqIHcgKyBpXSkgPj4+IHN4IDogMCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgeCArPSBzdztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGRlbGV0ZSB0YWcuc3ByaXRlO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG5cbiAgICBjbG91ZFRleHQoXzogYW55LCBkOiBXb3JkLCBpOiBudW1iZXIpIHtcbiAgICAgIHJldHVybiBkLnRleHQ7XG4gICAgfVxuXG4gICAgY2xvdWRGb250KF86IGFueSwgZDogV29yZCwgaTogbnVtYmVyKSB7XG4gICAgICByZXR1cm4gXCJzZXJpZlwiO1xuICAgIH1cblxuICAgIGNsb3VkRm9udE5vcm1hbChfOiBhbnksIGQ6IFdvcmQsIGk6IG51bWJlcikge1xuICAgICAgcmV0dXJuIFwibm9ybWFsXCI7XG4gICAgfVxuXG4gICAgY2xvdWRGb250U2l6ZShfOiBhbnksIGQ6IFdvcmQsIGk6IG51bWJlcikge1xuICAgICAgcmV0dXJuIE1hdGguc3FydChkLnZhbHVlKTtcbiAgICB9XG5cbiAgICBjbG91ZFJvdGF0ZShfOiBhbnksIGQ6IFdvcmQsIGk6IG51bWJlcikge1xuICAgICAgcmV0dXJuICh+fihNYXRoLnJhbmRvbSgpICogNikgLSAzKSAqIDMwO1xuICAgIH1cblxuICAgIGNsb3VkUGFkZGluZyhfOiBhbnksIGQ6IFdvcmQsIGk6IG51bWJlcikge1xuICAgICAgcmV0dXJuIDE7XG4gICAgfVxuXG4gICAgLy8gRmV0Y2hlcyBhIG1vbm9jaHJvbWUgc3ByaXRlIGJpdG1hcCBmb3IgdGhlIHNwZWNpZmllZCB0ZXh0LlxuICAgIC8vIExvYWQgaW4gYmF0Y2hlcyBmb3Igc3BlZWQuXG4gICAgcHJvdGVjdGVkIGNsb3VkU3ByaXRlKGNvbnRleHRBbmRSYXRpbzogeyBjb250ZXh0OiBDYW52YXNSZW5kZXJpbmdDb250ZXh0MkQsIHJhdGlvOiBudW1iZXIgfSwgZDogV29yZCwgZGF0YTogV29yZFtdLCBkaTogbnVtYmVyKSB7XG4gICAgICBpZiAoZC5zcHJpdGUpIHJldHVybjtcbiAgICAgIGxldCBjID0gY29udGV4dEFuZFJhdGlvLmNvbnRleHQ7XG4gICAgICBsZXQgcmF0aW8gPSBjb250ZXh0QW5kUmF0aW8ucmF0aW87XG5cbiAgICAgIGMuY2xlYXJSZWN0KDAsIDAsICh0aGlzLmN3IDw8IDUpIC8gcmF0aW8sIHRoaXMuY2ggLyByYXRpbyk7XG4gICAgICBsZXQgeCA9IDA7XG4gICAgICBsZXQgeSA9IDA7XG4gICAgICBsZXQgbWF4aCA9IDA7XG4gICAgICBsZXQgbiA9IGRhdGEubGVuZ3RoO1xuICAgICAgLS1kaTtcbiAgICAgIHdoaWxlICgrK2RpIDwgbikge1xuICAgICAgICBkID0gZGF0YVtkaV07XG4gICAgICAgIGMuc2F2ZSgpO1xuICAgICAgICBjLmZvbnQgPSBkLnN0eWxlICsgXCIgXCIgKyBkLndlaWdodCArIFwiIFwiICsgfn4oKGQuc2l6ZSEgKyAxKSAvIHJhdGlvKSArIFwicHggXCIgKyBkLmZvbnQ7XG4gICAgICAgIGxldCB3ID0gYy5tZWFzdXJlVGV4dChkLnRleHQgKyBcIm1cIikud2lkdGggKiByYXRpbztcbiAgICAgICAgbGV0IGggPSBkLnNpemUhIDw8IDE7XG4gICAgICAgIGlmIChkLnJvdGF0ZSkge1xuICAgICAgICAgIGxldCBzciA9IE1hdGguc2luKGQucm90YXRlICogQ2xvdWQuY2xvdWRSYWRpYW5zKTtcbiAgICAgICAgICBsZXQgY3IgPSBNYXRoLmNvcyhkLnJvdGF0ZSAqIENsb3VkLmNsb3VkUmFkaWFucyk7XG4gICAgICAgICAgbGV0IHdjciA9IHcgKiBjcjtcbiAgICAgICAgICBsZXQgd3NyID0gdyAqIHNyO1xuICAgICAgICAgIGxldCBoY3IgPSBoICogY3I7XG4gICAgICAgICAgbGV0IGhzciA9IGggKiBzcjtcbiAgICAgICAgICB3ID0gKE1hdGgubWF4KE1hdGguYWJzKHdjciArIGhzciksIE1hdGguYWJzKHdjciAtIGhzcikpICsgMHgxZikgPj4gNSA8PCA1O1xuICAgICAgICAgIGggPSB+fk1hdGgubWF4KE1hdGguYWJzKHdzciArIGhjciksIE1hdGguYWJzKHdzciAtIGhjcikpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHcgPSAodyArIDB4MWYpID4+IDUgPDwgNTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaCA+IG1heGgpIG1heGggPSBoO1xuICAgICAgICBpZiAoeCArIHcgPj0gKHRoaXMuY3cgPDwgNSkpIHtcbiAgICAgICAgICB4ID0gMDtcbiAgICAgICAgICB5ICs9IG1heGg7XG4gICAgICAgICAgbWF4aCA9IDA7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHkgKyBoID49IHRoaXMuY2gpIGJyZWFrO1xuICAgICAgICBjLnRyYW5zbGF0ZSgoeCArICh3ID4+IDEpKSAvIHJhdGlvLCAoeSArIChoID4+IDEpKSAvIHJhdGlvKTtcbiAgICAgICAgaWYgKGQucm90YXRlKSBjLnJvdGF0ZShkLnJvdGF0ZSAqIENsb3VkLmNsb3VkUmFkaWFucyk7XG4gICAgICAgIGMuZmlsbFRleHQoZC50ZXh0ISwgMCwgMCk7XG4gICAgICAgIGlmIChkLnBhZGRpbmcpIGMubGluZVdpZHRoID0gMiAqIGQucGFkZGluZywgYy5zdHJva2VUZXh0KGQudGV4dCEsIDAsIDApO1xuICAgICAgICBjLnJlc3RvcmUoKTtcbiAgICAgICAgZC53aWR0aCA9IHc7XG4gICAgICAgIGQuaGVpZ2h0ID0gaDtcbiAgICAgICAgZC54b2ZmID0geDtcbiAgICAgICAgZC55b2ZmID0geTtcbiAgICAgICAgZC54MSA9IHcgPj4gMTtcbiAgICAgICAgZC55MSA9IGggPj4gMTtcbiAgICAgICAgZC54MCA9IC1kLngxO1xuICAgICAgICBkLnkwID0gLWQueTE7XG4gICAgICAgIGQuaGFzVGV4dCA9IHRydWU7XG4gICAgICAgIHggKz0gdztcbiAgICAgIH1cbiAgICAgIGxldCBwaXhlbHMgPSBjLmdldEltYWdlRGF0YSgwLCAwLCAodGhpcy5jdyA8PCA1KSAvIHJhdGlvLCB0aGlzLmNoIC8gcmF0aW8pLmRhdGE7XG4gICAgICBsZXQgc3ByaXRlOiBudW1iZXJbXSA9IFtdO1xuICAgICAgd2hpbGUgKC0tZGkgPj0gMCkge1xuICAgICAgICBkID0gZGF0YVtkaV07XG4gICAgICAgIGlmICghZC5oYXNUZXh0KSBjb250aW51ZTtcbiAgICAgICAgbGV0IHcgPSBkLndpZHRoO1xuICAgICAgICBsZXQgdzMyID0gdyEgPj4gNTtcbiAgICAgICAgbGV0IGggPSBkLnkxISAtIGQueTAhO1xuICAgICAgICAvLyBaZXJvIHRoZSBidWZmZXJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBoICogdzMyOyBpKyspIHNwcml0ZVtpXSA9IDA7XG4gICAgICAgIHggPSBkLnhvZmYhO1xuICAgICAgICBpZiAoeCA9PSBudWxsKSByZXR1cm47XG4gICAgICAgIHkgPSBkLnlvZmYhO1xuICAgICAgICBsZXQgc2VlbiA9IDA7XG4gICAgICAgIGxldCBzZWVuUm93ID0gLTE7XG4gICAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgaDsgaisrKSB7XG4gICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB3ITsgaSsrKSB7XG4gICAgICAgICAgICBsZXQgayA9IHczMiAqIGogKyAoaSA+PiA1KTtcbiAgICAgICAgICAgIGxldCBtID0gcGl4ZWxzWygoeSArIGopICogKHRoaXMuY3cgPDwgNSkgKyAoeCArIGkpKSA8PCAyXSA/IDEgPDwgKDMxIC0gKGkgJSAzMikpIDogMDtcbiAgICAgICAgICAgIHNwcml0ZVtrXSB8PSBtO1xuICAgICAgICAgICAgc2VlbiB8PSBtO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoc2Vlbikgc2VlblJvdyA9IGo7XG4gICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBkLnkwISsrO1xuICAgICAgICAgICAgaC0tO1xuICAgICAgICAgICAgai0tO1xuICAgICAgICAgICAgeSsrO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBkLnkxID0gZC55MCEgKyBzZWVuUm93O1xuICAgICAgICBkLnNwcml0ZSA9IHNwcml0ZS5zbGljZSgwLCAoZC55MSAtIGQueTAhKSAqIHczMik7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gVXNlIG1hc2stYmFzZWQgY29sbGlzaW9uIGRldGVjdGlvbi5cbiAgICBwcm90ZWN0ZWQgY2xvdWRDb2xsaWRlKHRhZzogV29yZCwgYm9hcmQ6IG51bWJlcltdLCBzdzogbnVtYmVyKSB7XG4gICAgICBzdyA+Pj0gNTtcbiAgICAgIGxldCBzcHJpdGUgPSB0YWcuc3ByaXRlO1xuICAgICAgbGV0IHcgPSB0YWcud2lkdGghID4+IDU7XG4gICAgICBsZXQgbHggPSB0YWcueCEgLSAodyA8PCA0KTtcbiAgICAgIGxldCBzeCA9IGx4ICYgMHg3ZjtcbiAgICAgIGxldCBtc3ggPSAzMiAtIHN4O1xuICAgICAgbGV0IGggPSB0YWcueTEhIC0gdGFnLnkwITtcbiAgICAgIGxldCB4ID0gKHRhZy55ISArIHRhZy55MCEpICogc3cgKyAobHggPj4gNSk7XG4gICAgICBsZXQgbGFzdDtcbiAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgaDsgaisrKSB7XG4gICAgICAgIGxhc3QgPSAwO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8PSB3OyBpKyspIHtcbiAgICAgICAgICBpZiAoKChsYXN0IDw8IG1zeCkgfCAoaSA8IHcgPyAobGFzdCA9IHNwcml0ZSFbaiAqIHcgKyBpXSkgPj4+IHN4IDogMCkpXG4gICAgICAgICAgICAmIGJvYXJkW3ggKyBpXSkgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgeCArPSBzdztcbiAgICAgIH1cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBwcm90ZWN0ZWQgY2xvdWRCb3VuZHMoYm91bmRzOiB7IHg6IG51bWJlciwgeTogbnVtYmVyIH1bXSwgZDogV29yZCkge1xuICAgICAgbGV0IGIwID0gYm91bmRzWzBdO1xuICAgICAgbGV0IGIxID0gYm91bmRzWzFdO1xuICAgICAgaWYgKGQueCEgKyBkLngwISA8IGIwLngpIGIwLnggPSBkLnghICsgZC54MCE7XG4gICAgICBpZiAoZC55ISArIGQueTAhIDwgYjAueSkgYjAueSA9IGQueSEgKyBkLnkwITtcbiAgICAgIGlmIChkLnghICsgZC54MSEgPiBiMS54KSBiMS54ID0gZC54ISArIGQueDEhO1xuICAgICAgaWYgKGQueSEgKyBkLnkxISA+IGIxLnkpIGIxLnkgPSBkLnkhICsgZC55MSE7XG4gICAgfVxuXG4gICAgcHJvdGVjdGVkIGNvbGxpZGVSZWN0cyhhOiBXb3JkLCBiOiB7IHg6IG51bWJlciwgeTogbnVtYmVyIH1bXSkge1xuICAgICAgcmV0dXJuIGEueCEgKyBhLngxISA+IGJbMF0ueCAmJiBhLnghICsgYS54MCEgPCBiWzFdLnggJiYgYS55ISArIGEueTEhID4gYlswXS55ICYmIGEueSEgKyBhLnkwISA8IGJbMV0ueTtcbiAgICB9XG5cbiAgICBwcm90ZWN0ZWQgYXJjaGltZWRlYW5TcGlyYWwoc2l6ZTogbnVtYmVyW10pIHtcbiAgICAgIGxldCBlID0gc2l6ZVswXSAvIHNpemVbMV07XG4gICAgICByZXR1cm4gKHQ6IG51bWJlcikgPT4ge1xuICAgICAgICByZXR1cm4gW2UgKiAodCAqPSAuMSkgKiBNYXRoLmNvcyh0KSwgdCAqIE1hdGguc2luKHQpXTtcbiAgICAgIH07XG4gICAgfVxuXG4gICAgcHJvdGVjdGVkIHJlY3Rhbmd1bGFyU3BpcmFsKHNpemU6IG51bWJlcltdKSB7XG4gICAgICBsZXQgZHkgPSA0O1xuICAgICAgbGV0IGR4ID0gZHkgKiBzaXplWzBdIC8gc2l6ZVsxXTtcbiAgICAgIGxldCB4ID0gMDtcbiAgICAgIGxldCB5ID0gMDtcbiAgICAgIHJldHVybiAodDogbnVtYmVyKSA9PiB7XG4gICAgICAgIGxldCBzaWduID0gdCA8IDAgPyAtMSA6IDE7XG4gICAgICAgIC8vIFNlZSB0cmlhbmd1bGFyIG51bWJlcnM6IFRfbiA9IG4gKiAobiArIDEpIC8gMi5cbiAgICAgICAgc3dpdGNoICgoTWF0aC5zcXJ0KDEgKyA0ICogc2lnbiAqIHQpIC0gc2lnbikgJiAzKSB7XG4gICAgICAgICAgY2FzZSAwOiB4ICs9IGR4OyBicmVhaztcbiAgICAgICAgICBjYXNlIDE6IHkgKz0gZHk7IGJyZWFrO1xuICAgICAgICAgIGNhc2UgMjogeCAtPSBkeDsgYnJlYWs7XG4gICAgICAgICAgZGVmYXVsdDogeSAtPSBkeTsgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIFt4LCB5XTtcbiAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gVE9ETyByZXVzZSBhcnJheXM/XG4gICAgcHJvdGVjdGVkIHplcm9BcnJheShuOiBudW1iZXIpIHtcbiAgICAgIGxldCBhOiBudW1iZXJbXSA9IFtdO1xuICAgICAgbGV0IGkgPSAtMTtcbiAgICAgIHdoaWxlICgrK2kgPCBuKSBhW2ldID0gMDtcbiAgICAgIHJldHVybiBhO1xuICAgIH1cblxuICAgIGNsb3VkQ2FudmFzKCkge1xuICAgICAgcmV0dXJuIGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJjYW52YXNcIik7XG4gICAgfVxuXG4gICAgcHJvdGVjdGVkIGZ1bmN0b3IgPSAocmV0dXJuVmFsOiBhbnkpID0+IHtcblxuICAgICAgcmV0dXJuIHR5cGVvZiByZXR1cm5WYWwgPT09IFwiZnVuY3Rpb25cIiA/IHJldHVyblZhbCA6ICgoXzogYW55LCBkPzogV29yZCwgaT86IG51bWJlcikgPT4geyByZXR1cm4gcmV0dXJuVmFsOyB9KTtcbiAgICB9XG5cbiAgICBwcm90ZWN0ZWQgc3BpcmFscyA9IHtcbiAgICAgIGFyY2hpbWVkZWFuOiB0aGlzLmFyY2hpbWVkZWFuU3BpcmFsLFxuICAgICAgcmVjdGFuZ3VsYXI6IHRoaXMucmVjdGFuZ3VsYXJTcGlyYWxcbiAgICB9O1xuXG4gIH07XG5cbn07XG4iXX0=