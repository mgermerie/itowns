import Source from 'Source/Source';
import Fetcher from 'Provider/Fetcher';

/**
 * Define the source for 3d-tiles data.
 *
 * @class C3DTilesSource
 */
class C3DTilesSource extends Source {
    /**
     * Builds a new instance of C3DTilesSource
     *
     * @param {Object} source - An object that can contain all properties of a
     * Source. Only the `url` property is mandatory.
     */
    constructor(source) {
        super(source);
        this.baseUrl = this.url.slice(0, this.url.lastIndexOf('/') + 1);
        this.whenReady = Fetcher.json(this.url, this.networkOptions);
    }
}

export default C3DTilesSource;
