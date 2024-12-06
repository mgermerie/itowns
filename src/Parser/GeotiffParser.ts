import type { GeoTIFFImage, ReadRasterResult } from 'geotiff';
import { DataTexture, RGBAFormat, FloatType, UnsignedByteType } from 'three';


/**
 * @param format - Format to interpret each data sample in a pixel
 * https://www.awaresystems.be/imaging/tiff/tifftags/sampleformat.html
 * @param bitsPerSample - Number of bits per component.
 * https://www.awaresystems.be/imaging/tiff/tifftags/bitspersample.html
 */
function selectDataType(format: number, bitsPerSample: number) {
    switch (format) {
        case 1: // unsigned integer data
            if (bitsPerSample <= 8) {
                return UnsignedByteType;
            }
            break;
        default:
            break;
    }
    return FloatType;
}


/**
 * Convert RGB pixel buffer to RGBA pixel buffer
 *
 * @param buffer - The RGB pixel buffer
 * @param newBuffer - The empty RGBA pixel buffer
 * @param defaultAlpha - Default alpha value
 * @returns The generated texture.
 */
function convertToRGBA(
    buffer: ReadRasterResult,
    dataType: number,
    defaultAlpha: number,
) {
    const { width, height } = buffer;

    let newBuffer: ReadRasterResult;
    switch (dataType) {
        case UnsignedByteType:
            newBuffer = new Uint8ClampedArray(width * height * 4);
            break;
        case FloatType:
            newBuffer = new Float32Array(width * height * 4);
            break;
        default:
            throw new Error('unsupported data type');
    }

    for (let i = 0; i < width * height; i++) {
        const oldIndex = i * 3;
        const index = i * 4;
        // Copy RGB from original buffer
        newBuffer[index + 0] = Number(buffer[oldIndex + 0]); // R
        newBuffer[index + 1] = Number(buffer[oldIndex + 1]); // G
        newBuffer[index + 2] = Number(buffer[oldIndex + 2]); // B
        // Add alpha to new buffer
        newBuffer[index + 3] = defaultAlpha; // A
    }

    newBuffer.width = width;
    newBuffer.height = height;

    return newBuffer;
}


async function parse(data: GeoTIFFImage, options) {
    const image = await data.getImage();

    const dataType = selectDataType(image.getSampleFormat(), image.getBitsPerSample());

    const width = image.getTileWidth();
    const height = image.getTileHeight();

    let rgbBuffer = await <ReadRasterResult>image.readRasters({
        interleave: true,
    });

    const isRGBA = width * height * 4 === rgbBuffer.byteLength;
    if (!isRGBA) {
        rgbBuffer = convertToRGBA(rgbBuffer, dataType, 1);
    }

    const texture = new DataTexture(
        rgbBuffer,
        width,
        height,
        RGBAFormat,
        dataType,
    );

    // console.log('image : ', image);
    // console.log('width : ', width);
    // console.log('height : ', height);
    // console.log('is RGB : ', width * height * 4 === rgbBuffer.byteLength);
    // console.log('format : ', image.getSampleFormat());
    // console.log('bitsPerSample : ', image.getBitsPerSample());
    // console.log('buffer : ', rgbBuffer);
    // console.log('texture : ', texture);
    // console.log('');

    texture.needsUpdate = true;
    texture.extent = options.extent;

    return Promise.resolve(texture);
}


export default {
    parse,
};

