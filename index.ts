// Word cloud layout by Jason Davies, https://www.jasondavies.com/wordcloud/
// Updated by Benjamin Oakham to use D3 7.5.0 (for Strict Mode) and Type Script
// Algorithm due to Jonathan Feinberg, http://static.mrfeinberg.com/bv_ch03.pdf



import * as d3 from 'd3-dispatch';

export namespace D3CloudTs {

  type canvasType<T> =
    T extends HTMLCanvasElement | (() => HTMLCanvasElement) ? CloudData : (() => HTMLCanvasElement);

  type timeInvervalType<T> =
    T extends number | null ? CloudData : number;

  type wordType<T> =
    T extends Word[] ? CloudData : Word[]

  type textFunctorType<T> =
    T extends String | ((_: any, d: Word, i: number) => String) ? CloudData : ((_: any, d: Word, i: number) => String);

  type numberFunctorType<T> =
    T extends number | ((_: any, d: Word, i: number) => number) ? CloudData : ((_: any, d: Word, i: number) => number);

  type sizeType<T> =
    T extends number[] ? CloudData : [number, number];

  type spiralType<T> =
    T extends String | ((size: number[]) => (t: number) => number[]) ? CloudData : (size: number[]) => (t: number) => number[];

  type randomType<T> =
    T extends (() => number) ? CloudData : number;

  type onType<T> =
    T extends any[] ? CloudData : any;


  export interface CloudData {
    canvas?: <T>(_?: T) => canvasType<T>,
    start?: () => CloudData,
    stop?: () => CloudData,
    timeInterval?: <T extends number | null>(_?: T) => timeInvervalType<T>,
    words?: <T extends Word[]>(_?: T) => wordType<T>,
    size?: <T extends number[]>(_?: T) => sizeType<T>,
    font?: <T extends String | ((_: any, d: Word, i: number) => String) >(_?: T) => textFunctorType<T>,
    fontStyle?: <T extends String | ((_: any, d: Word, i: number) => String) >(_?: T) => textFunctorType<T>,
    fontWeight?: <T extends String | ((_: any, d: Word, i: number) => String) >(_?: T) => textFunctorType<T>,
    rotate?: <T extends number | ((_: any, d: Word, i: number) => number) >(_?: T) => numberFunctorType<T>,
    text?: <T extends String | ((_: any, d: Word, i: number) => String) >(_?: T) => textFunctorType<T>,
    spiral?: <T extends String | ((size: number[]) => (t: number) => number[]) >(_?: T) => spiralType<T>,
    fontSize?: <T extends number | ((_: any, d: Word, i: number) => number) >(_?: T) => numberFunctorType<T>,
    padding?: <T extends number | ((_: any, d: Word, i: number) => number) >(_?: T) => numberFunctorType<T>,
    random?: <T extends (() => number) >(_?: T) => randomType<T>,
    on?: <T extends any[2]>(_: T) => onType<T>
  }

  export interface Word {
    key: string,
    value: number,
    text?: string,
    font?: string,
    style?: string,
    weight?: string,
    rotate?: number,
    size?: number,
    padding?: number,
    sprite?: number[],
    x?: number,
    x0?: number,
    x1?: number,
    xoff?: number,
    y?: number,
    y0?: number,
    y1?: number,
    yoff?: number,
    hasText?: boolean,
    width?: number,
    height?: number,
  }

  export class Cloud {

    protected static cloudRadians = Math.PI / 180;
    protected cw = 1 << 11 >> 5;
    protected ch = 1 << 11;
    protected size: [number, number] = [256, 256];
    protected text = this.cloudText;
    protected font = this.cloudFont;
    protected fontSize = this.cloudFontSize;
    protected fontStyle = this.cloudFontNormal;
    protected fontWeight = this.cloudFontNormal;
    protected rotate = this.cloudRotate;
    protected padding = this.cloudPadding;
    protected spiral = this.archimedeanSpiral;
    protected words: Word[] = [];
    protected timeInterval = Infinity;
    protected event = d3.dispatch("word", "end");
    protected timer?: ReturnType<typeof setInterval> | null;
    protected random = Math.random;
    protected canvas = this.cloudCanvas;
    public config: CloudData = {};

    constructor() {
      this.config.start = () => {
        let contextAndRatio: { context: CanvasRenderingContext2D, ratio: number } = <{ context: CanvasRenderingContext2D, ratio: number }>this.getContext(this.canvas());
        let board: number[] = this.zeroArray((this.size[0] >> 5) * this.size[1]);
        let bounds: { x: number, y: number }[] | null = null;
        const n = this.words.length;
        let i = -1;
        let tags: Word[] = [];
        let data: Word[] = this.words.map((d, i) => {
          d.text = this.text(this, d, i);
          d.font = this.font(this, d, i);
          d.style = this.fontStyle(this, d, i);
          d.weight = this.fontWeight(this, d, i);
          d.rotate = this.rotate(this, d, i);
          d.size = ~~this.fontSize(this, d, i);
          d.padding = this.padding(this, d, i);
          return d;
        }).sort((a, b) => { return b.size! - a.size!; });
        let step = () => {
          let start = Date.now();
          while (Date.now() - start < this.timeInterval && ++i < n && this.timer) {
            let d: Word = data[i];
            d.x = (this.size[0] * (this.random() + .5)) >> 1;
            d.y = (this.size[1] * (this.random() + .5)) >> 1;
            this.cloudSprite(contextAndRatio, d, data, i);
            if (d.hasText && this.place(board, d, bounds!)) {
              tags.push(d);
              this.event.call("word", this.config, d);
              if (bounds) this.cloudBounds(bounds, d);
              else bounds = [{ x: d.x + d.x0!, y: d.y + d.y0! }, { x: d.x + d.x1!, y: d.y + d.y1! }];
              // Temporary hack
              d.x -= this.size[0] >> 1;
              d.y -= this.size[1] >> 1;
            }
          }
          if (i >= n) {
            this.config.stop!();
            this.event.call("end", this.config, tags, bounds);
          }
        }
        if (this.timer) clearInterval(this.timer);
        this.timer = setInterval(step, 0);
        step();

        return this.config;

      }

      this.config.canvas = <T>(_?: T) => {
        return <canvasType<T>>(_ ? (this.canvas = this.functor(_), this.config) : this.canvas);
      };

      this.config.stop = () => {
        if (this.timer) {
          clearInterval(this.timer);
          this.timer = null;
        }
        return this.config;
      };

      this.config.timeInterval = <T extends number | null>(_?: T): timeInvervalType<T> => {

        return <timeInvervalType<T>>(_ ? (this.timeInterval = _ == null ? Infinity : _, this.config) : this.timeInterval);
      };

      this.config.words = <T extends Word[]>(_?: T) => {
        return <wordType<T>>(_ ? (this.words = _, this.config) : this.words);
      };

      this.config.size = <T extends number[]>(_?: T) => {
        return <sizeType<T>>(_ ? (this.size = [+_[0], +_[1]], this.config) : this.size);
      };


      this.config.font = <T extends String | ((_: any, d: Word, i: number) => String)>(_?: T) => {
        return <textFunctorType<T>>(_ ? (this.font = this.functor(_), this.config) : this.font);
      };

      this.config.fontStyle = <T extends String | ((_: any, d: Word, i: number) => String)>(_?: T) => {
        return <textFunctorType<T>>(_ ? (this.fontStyle = this.functor(_), this.config) : this.fontStyle);
      };

      this.config.fontWeight = <T extends String | ((_: any, d: Word, i: number) => String)>(_?: T) => {
        return <textFunctorType<T>>(_ ? (this.fontWeight = this.functor(_), this.config) : this.fontWeight);
      };

      this.config.rotate = <T extends number | ((_: any, d: Word, i: number) => number)>(_?: T) => {
        return <numberFunctorType<T>>(_ ? (this.rotate = this.functor(_), this.config) : this.rotate);
      };

      this.config.text = <T extends String | ((_: any, d: Word, i: number) => String)>(_?: T) => {
        return <textFunctorType<T>>(_ ? (this.text = this.functor(_), this.config) : this.text);
      };

      this.config.spiral = <T extends String | ((size: number[]) => (t: number) => number[])>(_?: T) => {

        return <spiralType<T>>(_ ? (this.spiral = ((<String>_ == 'archimedean' || <String>_ == 'rectangular') ? this.spirals[<'archimedean' | 'rectangular'>_] : <(size: number[]) => (t: number) => number[]>_), this.config) : this.spiral);
      };

      this.config.fontSize = <T extends number | ((_: any, d: Word, i: number) => number)>(_?: T) => {
        return <numberFunctorType<T>>(_ ? (this.fontSize = this.functor(_), this.config) : this.fontSize);
      };

      this.config.padding = <T extends number | ((_: any, d: Word, i: number) => number)>(_?: T) => {
        return <numberFunctorType<T>>(_ ? (this.padding = this.functor(_), this.config) : this.padding);
      };

      this.config.random = <T extends (() => number)>(_?: T) => {
        return <randomType<T>>(_ ? (this.random = _, this.config) : this.random);
      };

      this.config.on = <T extends any[2]>(_: T) => {
        let value: any = this.event.on.apply(this.event, <any[2]>_);
        return <onType<T>>(value === this.event ? this.config : value);
      };


    };

    protected getContext = (canvas: HTMLCanvasElement) => {
      canvas.width = canvas.height = 1;
      let ratio = Math.sqrt(canvas.getContext("2d")!.getImageData(0, 0, 1, 1).data.length >> 2);
      canvas.width = (this.cw << 5) / ratio;
      canvas.height = this.ch / ratio;

      let context = canvas.getContext("2d");
      context!.fillStyle = context!.strokeStyle = "red";
      context!.textAlign = "center";

      return { context: context, ratio: ratio };
    }


    protected place = (board: number[], tag: Word, bounds: { x: number, y: number }[]) => {
      //let perimeter = [{x: 0, y: 0}, {x: this.size[0], y: this.size[1]}];
      let startX = tag.x!;
      let startY = tag.y!;
      let maxDelta = Math.sqrt(this.size[0] * this.size[0] + this.size[1] * this.size[1]);
      let s = this.spiral(this.size);
      let dt = this.random() < .5 ? 1 : -1;
      let t = -dt;
      let dxdy: number[];
      let dx: number;
      let dy: number;

      while (dxdy = s(t += dt)) {
        dx = ~~dxdy[0];
        dy = ~~dxdy[1];

        if (Math.min(Math.abs(dx), Math.abs(dy)) >= maxDelta) break;

        tag.x = startX + dx;
        tag.y = startY + dy;

        if (tag.x + tag.x0! < 0 || tag.y + tag.y0! < 0 ||
          tag.x + tag.x1! > this.size[0] || tag.y + tag.y1! > this.size[1]) continue;
        // TODO only check for collisions within current bounds.
        if (!bounds || !this.cloudCollide(tag, board, this.size[0])) {
          if (!bounds || this.collideRects(tag, bounds)) {
            let sprite = tag.sprite;
            let w = tag.width! >> 5;
            let sw = this.size[0] >> 5;
            let lx = tag.x - (w << 4);
            let sx = lx & 0x7f;
            let msx = 32 - sx;
            let h = tag.y1! - tag.y0!;
            let x = (tag.y + tag.y0!) * sw + (lx >> 5);
            let last: number;
            for (let j = 0; j < h; j++) {
              last = 0;
              for (let i = 0; i <= w; i++) {
                board[x + i] |= (last << msx) | (i < w ? (last = sprite![j * w + i]) >>> sx : 0);
              }
              x += sw;
            }
            delete tag.sprite;
            return true;
          }
        }
      }
      return false;
    }


    cloudText(_: any, d: Word, i: number) {
      return d.text;
    }

    cloudFont(_: any, d: Word, i: number) {
      return "serif";
    }

    cloudFontNormal(_: any, d: Word, i: number) {
      return "normal";
    }

    cloudFontSize(_: any, d: Word, i: number) {
      return Math.sqrt(d.value);
    }

    cloudRotate(_: any, d: Word, i: number) {
      return (~~(Math.random() * 6) - 3) * 30;
    }

    cloudPadding(_: any, d: Word, i: number) {
      return 1;
    }

    // Fetches a monochrome sprite bitmap for the specified text.
    // Load in batches for speed.
    protected cloudSprite(contextAndRatio: { context: CanvasRenderingContext2D, ratio: number }, d: Word, data: Word[], di: number) {
      if (d.sprite) return;
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
        c.font = d.style + " " + d.weight + " " + ~~((d.size! + 1) / ratio) + "px " + d.font;
        let w = c.measureText(d.text + "m").width * ratio;
        let h = d.size! << 1;
        if (d.rotate) {
          let sr = Math.sin(d.rotate * Cloud.cloudRadians);
          let cr = Math.cos(d.rotate * Cloud.cloudRadians);
          let wcr = w * cr;
          let wsr = w * sr;
          let hcr = h * cr;
          let hsr = h * sr;
          w = (Math.max(Math.abs(wcr + hsr), Math.abs(wcr - hsr)) + 0x1f) >> 5 << 5;
          h = ~~Math.max(Math.abs(wsr + hcr), Math.abs(wsr - hcr));
        } else {
          w = (w + 0x1f) >> 5 << 5;
        }
        if (h > maxh) maxh = h;
        if (x + w >= (this.cw << 5)) {
          x = 0;
          y += maxh;
          maxh = 0;
        }
        if (y + h >= this.ch) break;
        c.translate((x + (w >> 1)) / ratio, (y + (h >> 1)) / ratio);
        if (d.rotate) c.rotate(d.rotate * Cloud.cloudRadians);
        c.fillText(d.text!, 0, 0);
        if (d.padding) c.lineWidth = 2 * d.padding, c.strokeText(d.text!, 0, 0);
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
      let sprite: number[] = [];
      while (--di >= 0) {
        d = data[di];
        if (!d.hasText) continue;
        let w = d.width;
        let w32 = w! >> 5;
        let h = d.y1! - d.y0!;
        // Zero the buffer
        for (let i = 0; i < h * w32; i++) sprite[i] = 0;
        x = d.xoff!;
        if (x == null) return;
        y = d.yoff!;
        let seen = 0;
        let seenRow = -1;
        for (let j = 0; j < h; j++) {
          for (let i = 0; i < w!; i++) {
            let k = w32 * j + (i >> 5);
            let m = pixels[((y + j) * (this.cw << 5) + (x + i)) << 2] ? 1 << (31 - (i % 32)) : 0;
            sprite[k] |= m;
            seen |= m;
          }
          if (seen) seenRow = j;
          else {
            d.y0!++;
            h--;
            j--;
            y++;
          }
        }
        d.y1 = d.y0! + seenRow;
        d.sprite = sprite.slice(0, (d.y1 - d.y0!) * w32);
      }
    }

    // Use mask-based collision detection.
    protected cloudCollide(tag: Word, board: number[], sw: number) {
      sw >>= 5;
      let sprite = tag.sprite;
      let w = tag.width! >> 5;
      let lx = tag.x! - (w << 4);
      let sx = lx & 0x7f;
      let msx = 32 - sx;
      let h = tag.y1! - tag.y0!;
      let x = (tag.y! + tag.y0!) * sw + (lx >> 5);
      let last;
      for (let j = 0; j < h; j++) {
        last = 0;
        for (let i = 0; i <= w; i++) {
          if (((last << msx) | (i < w ? (last = sprite![j * w + i]) >>> sx : 0))
            & board[x + i]) return true;
        }
        x += sw;
      }
      return false;
    }

    protected cloudBounds(bounds: { x: number, y: number }[], d: Word) {
      let b0 = bounds[0];
      let b1 = bounds[1];
      if (d.x! + d.x0! < b0.x) b0.x = d.x! + d.x0!;
      if (d.y! + d.y0! < b0.y) b0.y = d.y! + d.y0!;
      if (d.x! + d.x1! > b1.x) b1.x = d.x! + d.x1!;
      if (d.y! + d.y1! > b1.y) b1.y = d.y! + d.y1!;
    }

    protected collideRects(a: Word, b: { x: number, y: number }[]) {
      return a.x! + a.x1! > b[0].x && a.x! + a.x0! < b[1].x && a.y! + a.y1! > b[0].y && a.y! + a.y0! < b[1].y;
    }

    protected archimedeanSpiral(size: number[]) {
      let e = size[0] / size[1];
      return (t: number) => {
        return [e * (t *= .1) * Math.cos(t), t * Math.sin(t)];
      };
    }

    protected rectangularSpiral(size: number[]) {
      let dy = 4;
      let dx = dy * size[0] / size[1];
      let x = 0;
      let y = 0;
      return (t: number) => {
        let sign = t < 0 ? -1 : 1;
        // See triangular numbers: T_n = n * (n + 1) / 2.
        switch ((Math.sqrt(1 + 4 * sign * t) - sign) & 3) {
          case 0: x += dx; break;
          case 1: y += dy; break;
          case 2: x -= dx; break;
          default: y -= dy; break;
        }
        return [x, y];
      };
    }

    // TODO reuse arrays?
    protected zeroArray(n: number) {
      let a: number[] = [];
      let i = -1;
      while (++i < n) a[i] = 0;
      return a;
    }

    cloudCanvas() {
      return document.createElement("canvas");
    }

    protected functor = (returnVal: any) => {

      return typeof returnVal === "function" ? returnVal : ((_: any, d?: Word, i?: number) => { return returnVal; });
    }

    protected spirals = {
      archimedean: this.archimedeanSpiral,
      rectangular: this.rectangularSpiral
    };

  };

};
