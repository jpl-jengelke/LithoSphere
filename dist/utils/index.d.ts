import { XYZ } from '../generalTypes.d.ts';
declare const Utils: {
    getIn: (obj: any, keyArray: string[], notSetValue?: any) => any;
    mod: (n: number, m: number) => number;
    findHighestMaxZoom: (tileLayers: any) => number;
    findLowestMinZoom: (tileLayers: any) => number;
    isInExtent: (xyz: XYZ, bb: any, projection: any) => boolean;
    clone: (obj: any) => any;
    getExtension: (string: string) => string;
    getRadiansPerPixel: (zoom: number) => number;
    lastTileContains: any[];
    tileContains: (xyz: any, z: number, useLast?: boolean) => any;
    tileIsContained(xyzContainer: any, xyzContained: any, useLast?: boolean): boolean;
    arrayAverage(array: any, key: string): number;
    hexToRGB(hex: string): any;
};
export default Utils;
