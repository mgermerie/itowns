import Source from 'Source/Source';
// import Fetcher from 'Provider/Fetcher';
import { Loader3DTiles } from 'three-loader-3dtiles';

const GeoTransform = {
    Reset: 1,
    Mercator: 2,
    WGS84Cartesian: 3,
};
// eslint-disable-next-line no-unused-vars
const PointCloudColoring = {
    Intensity: 1,
    Classification: 2,
    Elevation: 3,
    RGB: 4,
    White: 5,
};
const Shading = {
    FlatTexture: 1,
    ShadedTexture: 2,
    ShadedNoTexture: 3,
};

/**
 * @classdesc
 * An object defining the source connection to a 3DTiles dataset from a web server.
 *
 * @extends Source
 *
 * @property {boolean} isC3DTilesSource - Used to checkout whether this source is a isC3DTilesSource. Default is
 * true. You should not change this, as it is used internally for optimisation.
 * @property {string} url - The URL of the tileset json.
 * @property {string} baseUrl - The base URL to access tiles.
 */
class C3DTilesSource extends Source {
    /**
     * Create a new Source for 3D Tiles data from a web server.
     *
     * @constructor
     * @extends Source
     *
     * @param {Object} source An object that can contain all properties of {@link Source}.
     * Only `url` is mandatory.
     */
    constructor(source) {
        super(source);
        this.isC3DTilesSource = true;
        this.baseUrl = this.url.slice(0, this.url.lastIndexOf('/') + 1);

        this.view = source.view;

        this.whenReady = Loader3DTiles.load({
            url: this.url,
            renderer: source.view.mainLoop.gfxEngine.renderer,
            onProgress: (a, b) => {
                if (a < b) {
                    this.view.notifyChange(this, true);
                }
            },
            options: {
                dracoDecoderPath: 'https://cdn.jsdelivr.net/npm/three@0.146.0/examples/js/libs/draco',
                basisTranscoderPath: 'https://cdn.jsdelivr.net/npm/three@0.146.0/examples/js/libs/basis',
                debug: true,
                geoTransform: GeoTransform.WGS84Cartesian,
                shading: Shading.ShadedTexture,
                // maximumScreenSpaceError: 0.005,
            },
        });
    }
}

export default C3DTilesSource;
