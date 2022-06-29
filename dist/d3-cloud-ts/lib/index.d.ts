import * as d3 from 'd3-dispatch';
export declare namespace D3CloudTs {
    type canvasType<T> = T extends HTMLCanvasElement | (() => HTMLCanvasElement) ? CloudData : (() => HTMLCanvasElement);
    type timeInvervalType<T> = T extends number | null ? CloudData : number;
    type wordType<T> = T extends Word[] ? CloudData : Word[];
    type textFunctorType<T> = T extends String | ((_: any, d: Word, i: number) => String) ? CloudData : ((_: any, d: Word, i: number) => String);
    type numberFunctorType<T> = T extends number | ((_: any, d: Word, i: number) => number) ? CloudData : ((_: any, d: Word, i: number) => number);
    type sizeType<T> = T extends number[] ? CloudData : [number, number];
    type spiralType<T> = T extends String | ((size: number[]) => (t: number) => number[]) ? CloudData : (size: number[]) => (t: number) => number[];
    type randomType<T> = T extends (() => number) ? CloudData : number;
    type onType<T> = T extends any[] ? CloudData : any;
    export interface CloudData {
        canvas?: <T>(_?: T) => canvasType<T>;
        start?: () => CloudData;
        stop?: () => CloudData;
        timeInterval?: <T extends number | null>(_?: T) => timeInvervalType<T>;
        words?: <T extends Word[]>(_?: T) => wordType<T>;
        size?: <T extends number[]>(_?: T) => sizeType<T>;
        font?: <T extends String | ((_: any, d: Word, i: number) => String)>(_?: T) => textFunctorType<T>;
        fontStyle?: <T extends String | ((_: any, d: Word, i: number) => String)>(_?: T) => textFunctorType<T>;
        fontWeight?: <T extends String | ((_: any, d: Word, i: number) => String)>(_?: T) => textFunctorType<T>;
        rotate?: <T extends number | ((_: any, d: Word, i: number) => number)>(_?: T) => numberFunctorType<T>;
        text?: <T extends String | ((_: any, d: Word, i: number) => String)>(_?: T) => textFunctorType<T>;
        spiral?: <T extends String | ((size: number[]) => (t: number) => number[])>(_?: T) => spiralType<T>;
        fontSize?: <T extends number | ((_: any, d: Word, i: number) => number)>(_?: T) => numberFunctorType<T>;
        padding?: <T extends number | ((_: any, d: Word, i: number) => number)>(_?: T) => numberFunctorType<T>;
        random?: <T extends (() => number)>(_?: T) => randomType<T>;
        on?: <T extends any[2]>(_: T) => onType<T>;
    }
    export interface Word {
        key: string;
        value: number;
        text?: string;
        font?: string;
        style?: string;
        weight?: string;
        rotate?: number;
        size?: number;
        padding?: number;
        sprite?: number[];
        x?: number;
        x0?: number;
        x1?: number;
        xoff?: number;
        y?: number;
        y0?: number;
        y1?: number;
        yoff?: number;
        hasText?: boolean;
        width?: number;
        height?: number;
    }
    export class Cloud {
        protected static cloudRadians: number;
        protected cw: number;
        protected ch: number;
        protected size: [number, number];
        protected text: (_: any, d: Word, i: number) => string | undefined;
        protected font: (_: any, d: Word, i: number) => string;
        protected fontSize: (_: any, d: Word, i: number) => number;
        protected fontStyle: (_: any, d: Word, i: number) => string;
        protected fontWeight: (_: any, d: Word, i: number) => string;
        protected rotate: (_: any, d: Word, i: number) => number;
        protected padding: (_: any, d: Word, i: number) => number;
        protected spiral: (size: number[]) => (t: number) => number[];
        protected words: Word[];
        protected timeInterval: number;
        protected event: d3.Dispatch<object>;
        protected timer?: ReturnType<typeof setInterval> | null;
        protected random: () => number;
        protected canvas: () => HTMLCanvasElement;
        config: CloudData;
        constructor();
        protected getContext: (canvas: HTMLCanvasElement) => {
            context: CanvasRenderingContext2D | null;
            ratio: number;
        };
        protected place: (board: number[], tag: Word, bounds: {
            x: number;
            y: number;
        }[]) => boolean;
        cloudText(_: any, d: Word, i: number): string | undefined;
        cloudFont(_: any, d: Word, i: number): string;
        cloudFontNormal(_: any, d: Word, i: number): string;
        cloudFontSize(_: any, d: Word, i: number): number;
        cloudRotate(_: any, d: Word, i: number): number;
        cloudPadding(_: any, d: Word, i: number): number;
        protected cloudSprite(contextAndRatio: {
            context: CanvasRenderingContext2D;
            ratio: number;
        }, d: Word, data: Word[], di: number): void;
        protected cloudCollide(tag: Word, board: number[], sw: number): boolean;
        protected cloudBounds(bounds: {
            x: number;
            y: number;
        }[], d: Word): void;
        protected collideRects(a: Word, b: {
            x: number;
            y: number;
        }[]): boolean;
        protected archimedeanSpiral(size: number[]): (t: number) => number[];
        protected rectangularSpiral(size: number[]): (t: number) => number[];
        protected zeroArray(n: number): number[];
        cloudCanvas(): HTMLCanvasElement;
        protected functor: (returnVal: any) => any;
        protected spirals: {
            archimedean: (size: number[]) => (t: number) => number[];
            rectangular: (size: number[]) => (t: number) => number[];
        };
    }
    export {};
}
