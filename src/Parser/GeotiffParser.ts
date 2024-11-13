import type { GeoTIFFImage, ReadRasterResult } from 'geotiff';
import { DataTexture, RGBAFormat, FloatType } from 'three';


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
    newBuffer: ReadRasterResult,
    defaultAlpha: number,
) {
    const { width, height } = buffer;

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


async function parse(data: GeoTIFFImage) {
    const image = await data.getImage();
    const width = image.getTileWidth();
    const height = image.getTileHeight();
    const pixelCount = width * height;

    let rgbBuffer = await <ReadRasterResult>image.readRGB();
    if (!(pixelCount * 4 === rgbBuffer.byteLength)) {
        rgbBuffer = convertToRGBA(
            rgbBuffer,
            new Float32Array(pixelCount * 4),
            1,
        );
    }

    const texture = new DataTexture(
        rgbBuffer,
        width,
        height,
        RGBAFormat,
        FloatType,
    );

    console.log('image : ', image);
    console.log('width : ', width);
    console.log('height : ', height);
    console.log('is RGB : ', pixelCount * 4 === rgbBuffer.byteLength);
    console.log('format : ', image.getSampleFormat());
    console.log('bitsPerSample : ', image.getBitsPerSample());
    console.log('buffer : ', rgbBuffer);
    console.log('texture : ', texture);
    console.log('');

    texture.needsUpdate = true;

    return Promise.resolve(texture);
}


export default {
    parse,
};

