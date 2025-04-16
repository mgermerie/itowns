import {
    DataTexture,
    ByteType,
    FloatType,
    HalfFloatType,
    IntType,
    ShortType,
    UnsignedByteType,
    UnsignedIntType,
    UnsignedShortType,
    RGBAFormat,
    Vector2,
} from 'three';


import type { Extent } from '@itowns/geographic';
import type { Dimensions, Pool } from 'geotiff';
import type { TypedArray } from 'three';
import type { COGLevel } from '../Source/COGSource';


type TextureWithExtent = DataTexture & { extent: Extent }
// Needed because GeoTIFF.TypedArrayWithDimensions does not include
// Uint8ClampedArray
type TypedArrayWithDimensions = TypedArray & Dimensions;


function selectDataType(format: number, bitsPerSample: number) {
    switch (format) {
        case 1:  // unsigned integer data
            if (bitsPerSample <= 8) {
                return UnsignedByteType;
            } else if (bitsPerSample <= 16) {
                return UnsignedShortType;
            } else if (bitsPerSample <= 32) {
                return UnsignedIntType;
            }
            break;
        case 2:  // two's complement signed integer data
            if (bitsPerSample <= 8) {
                return ByteType;
            } else if (bitsPerSample <= 16) {
                return ShortType;
            } else if (bitsPerSample <= 32) {
                return IntType;
            }
            break;
        case 3:  // IEEE floating point data
            if (bitsPerSample <= 16) {
                return HalfFloatType;
            } else if (bitsPerSample <= 32) {
                return FloatType;
            }  // Double precision float is not supported
            break;
        default:
            break;
    }
    throw Error('Unsuported data format/bitsPerSample combination');
}


async function readRGB(
    level: COGLevel,
    viewport: Array<number>,
    width: number,
    height: number,
    resampleMethod: string,
    pool?: Pool,
) {
    try {
        return await level.image.readRGB({
            window: viewport,
            pool,
            width,
            height,
            resampleMethod,
            enableAlpha: true,
            interleave: true,
        });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        if (error.toString() === 'AggregateError: Request failed') {
            await new Promise((resolve) => {
                setTimeout(resolve, 100);
            });
            return readRGB(level, viewport, width, height, resampleMethod, pool);
        }
        throw error;
    }
}


function extentToImageWindow(extent: Extent, level: COGLevel) {
    const [oX, oY] = level.origin;
    const [imageResX, imageResY] = level.resolution;

    const wnd = [
        Math.round((extent.west - oX) / imageResX),
        Math.round((extent.north - oY) / imageResY),
        Math.round((extent.east - oX) / imageResX),
        Math.round((extent.south - oY) / imageResY),
    ];

    const xMin = Math.min(wnd[0], wnd[2]);
    let xMax = Math.max(wnd[0], wnd[2]);
    const yMin = Math.min(wnd[1], wnd[3]);
    let yMax = Math.max(wnd[1], wnd[3]);

    // prevent zero-sized requests
    if ((xMax - xMin) === 0) { xMax += 1; }
    if ((yMax - yMin) === 0) { yMax += 1; }

    return [xMin, yMin, xMax, yMax];
}


// TODO: rename with typedArray instead of buffer
function rgbBufferToRGBABuffer(
    typedArray: TypedArrayWithDimensions,
    dataType: number,
    alpha: number,
) {
    const { width, height } = typedArray;
    const newBufferLength = width * height * 4;

    const newBuffer = <TypedArrayWithDimensions> typedArray.slice(newBufferLength);
    let newAlpha;

    switch (dataType) {
        case UnsignedByteType:
            // newBuffer = <TypedArrayWithDimensions>
            // new Uint8Array(newBufferLength);
            newAlpha = alpha;
            break;
        case FloatType:
            // newBuffer = <TypedArrayWithDimensions>
            // new Float32Array(newBufferLength);
            newAlpha = alpha / 255;
            break;
        case UnsignedShortType:
        case UnsignedIntType:
        case ByteType:
        case ShortType:
        case IntType:
        case HalfFloatType:
        default:
            throw new Error('unsupported data type');
    }

    newBuffer.width = width;
    newBuffer.height = height;

    for (let i = 0; i < width * height; i++) {
        const oldIndex = i * 3;
        const index = i * 4;
        // Copy RGB from original buffer
        newBuffer[index + 0] = Number(typedArray[oldIndex + 0]);  // R
        newBuffer[index + 1] = Number(typedArray[oldIndex + 1]);  // R
        newBuffer[index + 2] = Number(typedArray[oldIndex + 2]);  // R
        // Add alpha to new buffer
        newBuffer[index + 3] = newAlpha;
    }

    return newBuffer;
}


// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function parse(data: any, options: any) {
    const {
        crs,
        defaultAlpha,
    } = options.in;

    const tileExtent = options.extent.isExtent ?
        options.extent.as(crs) : options.extent.toExtent(crs);

    const tileSpatialDimensions = tileExtent.planarDimensions();
    const tileTextureDimensions = new Vector2(
        255,
        255 * tileSpatialDimensions.y / tileSpatialDimensions.x,
    );

    const image = data.getImage();

    const dataType = selectDataType(
        image.getSampleFormat(),
        image.getBitsPerSample(),
    );

    const level = {
        image,
        width: image.getWidth(),
        height: image.getHeight(),
        resolution: image.getResolution(),
        origin: image.getOrigin(),
        dimensions: image.getDimensions(),
    };

    const viewport = extentToImageWindow(tileExtent, level);

    let buffer = <TypedArrayWithDimensions> await readRGB(
        image,
        viewport,
        tileTextureDimensions.x,
        tileTextureDimensions.y,
        'nearest',  // TODO: find a clean way to parametrise this
        // TODO: find a way to add pool
    );

    const isRGBA = buffer.width * buffer.height * 4 === buffer.byteLength;
    if (!isRGBA) {
        buffer = rgbBufferToRGBABuffer(buffer, dataType, defaultAlpha);
    }

    const texture = <TextureWithExtent> new DataTexture(
        buffer,
        buffer.width,
        buffer.height,
        RGBAFormat,
        dataType,
    );
    texture.extent = options.extent;

    texture.flipY = true;
    texture.needsUpdate = true;

    return texture;
}



export default { parse };


export {
    extentToImageWindow,
    readRGB,
    rgbBufferToRGBABuffer,
    selectDataType,
};

