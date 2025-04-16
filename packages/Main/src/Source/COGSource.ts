import * as GeoTIFF from 'geotiff';
import { Extent } from '@itowns/geographic';

import type { Vector2 } from 'three';

import { selectDataType } from '../Parser/GeoTIFFParser';
import COGParser from '../Parser/COGParser';
import Source from './Source';


export type COGLevel = {
    image: GeoTIFF.GeoTIFFImage,
    width: number,
    height: number,
    resolution: Array<number>,
    origin: Array<number>,
    dimensions: Vector2,
};
export type TileDimensions = {
    width: number,
    height: number,
};


// The idea is the following:
// - we load a tree structure when source is ready ;
// - we provide a method to extract subimage from an extent, thus needing to
// find the right leaf in the tree structure ;
// - we plug this method to the parser.

class COGSource extends Source {
    firstImage: GeoTIFF.GeoTIFFImage;
    defaultAlpha: number;
    dataType: number;
    dimensions: Vector2;

    resampleMethod: string;

    levels: Array<COGLevel>;

    pool: GeoTIFF.Pool;

    extent: Extent;

    zoom: {
        min: number,
        max: number,
    };


    constructor(source) {
        const {
            pool = new GeoTIFF.Pool(),
            defaultAlpha = 255,
            resampleMethod = 'nearest',
            zoom = { min: 0, max: Infinity },
            ...sourceConfig
        } = source;

        // We don't use fetcher, we let geotiff.js manage it
        sourceConfig.fetcher = () => Promise.resolve({});
        sourceConfig.parser = COGParser.parse;

        super(sourceConfig);

        this.zoom = zoom;  // TODO: should be removable

        this.defaultAlpha = defaultAlpha;
        this.pool = pool;
        this.resampleMethod = resampleMethod;

        this.whenReady = GeoTIFF.fromUrl(this.url)
            .then(async (geotiff) => {
                this.firstImage = await geotiff.getImage();

                const firstImageOrigin = this.firstImage.getOrigin();

                this.dataType = selectDataType(
                    this.firstImage.getSampleFormat(),
                    this.firstImage.getBitsPerSample(),
                );

                // Compute extent of root image
                const [minX, minY, maxX, maxY] = this.firstImage.getBoundingBox();
                this.extent = new Extent(this.crs, minX, maxX, minY, maxY);
                this.dimensions = this.extent.planarDimensions();

                this.levels = [
                    this.makeLevel(
                        this.firstImage,
                        this.firstImage.getResolution(),
                        firstImageOrigin,
                        this.dimensions,
                    ),
                ];

                // Number of images (original + overviews)
                const imageCount = await geotiff.getImageCount();
                const promises = [];
                for (let index = 1; index < imageCount; index++) {
                    const promise = geotiff.getImage(index)
                        .then(
                            image => this.makeLevel(
                                image,
                                image.getResolution(this.firstImage),
                                firstImageOrigin,
                                this.dimensions,
                            ),
                        );
                    promises.push(promise);
                }
                this.levels = this.levels.concat(await Promise.all(promises));
            });
    }

    extentInsideLimit(extent: Extent) {
        return this.extent.intersectsExtent(extent);
    }

    makeLevel(
        image: GeoTIFF.GeoTIFFImage,
        resolution: Array<number>,
        origin: Array<number>,
        dimensions: Vector2,
    ) {
        return {
            image,
            width: image.getWidth(),
            height: image.getHeight(),
            resolution,
            origin,
            dimensions,
        };
    }

    selectLevel(extentDimensions: Vector2, requestDimensions: Vector2) {
        // const extentDimension = requestExtent.planarDimensions();

        const targetResolution = Math.min(
            extentDimensions.x / requestDimensions.x,
            extentDimensions.y / requestDimensions.y,
        );

        let level;

        for (let index = this.levels.length - 1; index >= 0; index--) {
            level = this.levels[index];
            const sourceResolution = Math.min(
                this.dimensions.x / level.width,
                this.dimensions.y / level.height,
            );

            if (targetResolution >= sourceResolution) {
                break;
            }
        }
        return level;
    }

    urlFromExtent() {
        return '';
    }
}


export default COGSource;

