import {
    DataTexture,
    RGBAFormat,
    Vector2,
} from 'three';

import type { Extent } from '@itowns/geographic';
import type { Dimensions } from 'geotiff';
import type { TypedArray } from 'three';


import {
    extentToImageWindow,
    readRGB,
    rgbBufferToRGBABuffer,
} from './GeoTIFFParser';

import type { COGLevel } from '../Source/COGSource';


type TextureWithExtent = DataTexture & { extent: Extent }
// Needed because GeoTIFF.TypedArrayWithDimensions does not include
// Uint8ClampedArray
type TypedArrayWithDimensions = TypedArray & Dimensions;


function selectLevel(
    levelTree: Array<COGLevel>,
    extentDimensions: Vector2,
    requestDimensions: Vector2,
) {
    const targetResolution = Math.min(
        extentDimensions.x / requestDimensions.x,
        extentDimensions.y / requestDimensions.y,
    );

    let level;

    for (let index = levelTree.length - 1; index >= 0; index--) {
        level = levelTree[index];
        const sourceResolution = Math.min(
            level.dimensions.x / level.width,
            level.dimensions.y / level.height,
        );

        if (targetResolution >= sourceResolution) {
            break;
        }
    }

    if (!level) {
        throw Error('No level found. LevelTree must be empty');  // TODO: make better message
    }

    return level;
}


// A parser for COG should not be exposed as a Parser module since it only works
// with a COGSource.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function parse(data: any, options: any) {
    const {
        crs,
        levels,
        resampleMethod,
        pool,
        dataType,
        defaultAlpha,
    } = options.in;

    // debugger; // eslint-disable-line no-debugger

    const extent = options.extent.isExtent ?
        options.extent.as(crs) : options.extent.toExtent(crs);

    const extentDimensions = extent.planarDimensions();
    const tileDimensions = new Vector2(255, 255 * extentDimensions.y / extentDimensions.x);

    const level = selectLevel(levels, extentDimensions, tileDimensions);

    const viewport = extentToImageWindow(extent, level);

    let typedArray = <TypedArrayWithDimensions> await readRGB(
        level,
        viewport,
        tileDimensions.x,
        tileDimensions.y,
        resampleMethod,
        pool,
    );

    const isRGBA = typedArray.width * typedArray.height * 4 === typedArray.byteLength;
    if (!isRGBA) {
        typedArray = rgbBufferToRGBABuffer(typedArray, dataType, defaultAlpha);
    }

    const texture = <TextureWithExtent> new DataTexture(
        typedArray,
        typedArray.width,
        typedArray.height,
        RGBAFormat,
        dataType,
    );
    texture.extent = options.extent;

    texture.flipY = true;
    texture.needsUpdate = true;

    return texture;
}


export default { parse };

