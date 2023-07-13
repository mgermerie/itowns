import { Loader3DTiles } from 'ThreeExtended/three-loader-3dtiles';
import Fetcher from 'Provider/Fetcher';
import Source from 'Source/Source';

/**
 * @classdesc
 * An object defining the source connection to a 3DTiles asset of a [Cesium ion server](https://cesium.com/learn/ion/).
 *
 * @extends Source
 *
 * @property {boolean} isC3DTilesIonSource - Used to checkout whether this source is a C3DTilesIonSource. Default is
 * true. You should not change this, as it is used internally for optimisation.
 * @property {string} url - The URL of the tileset json.
 * @property {string} baseUrl - The base URL to access tiles.
 * @property {string} accessToken - The Cesium ion access token used to retrieve the resource.
 * @property {string} assetId - The id of the asset on Cesium ion.
 */
class C3DTilesIonSource extends Source {
    /**
     * Create a new Source for 3D Tiles data from Cesium ion.
     *
     * @constructor
     * @extends Source
     *
     * @param {Object} source An object that can contain all properties of a C3DTilesIonSource and {@link Source}.
     * Only `accessToken` and `assetId` are mandatory.
     */
    constructor(source) {
        if (!source.accessToken) {
            throw new Error('New 3D Tiles Ion Source: access token is required');
        }
        if (!source.assetId) {
            throw new Error('New 3D Tiles Ion Source: asset id is required');
        }

        // Url to query cesium ion the first time to retrieve metadata of the asset with assetId
        source.url = `https://api.cesium.com/v1/assets/${source.assetId}/endpoint?access_token=${source.accessToken}`;
        super(source);

        this.isC3DTilesIonSource = true;
        this.accessToken = source.accessToken;
        this.assetId = source.assetId;

        // get asset metadata
        this.whenReady = Fetcher.json(source.url, this.networkOptions)
            .then((json) => {
                if (json.type !== '3DTILES') {
                    throw new Error(`${json.type} datasets from Cesium ion are not supported with C3DTilesIonSource. ` +
                    'Only 3D Tiles datasets are supported.');
                }
                this.url = json.url; // Store url to the tileset.json
                this.baseUrl = json.url.slice(0, json.url.lastIndexOf('/') + 1); // baseUrl for tiles queries
                this.networkOptions.headers = {};
                this.networkOptions.headers.Authorization = `Bearer ${json.accessToken}`;
                this.attribution = json.attributions;
                this.view = source.view;

                return Loader3DTiles.load({
                    url: this.url,
                    renderer: source.view.mainLoop.gfxEngine.renderer,
                    onProgress: (a, b) => {
                        if (a < b) {
                            this.view.notifyChange(this, true);
                        }
                    },
                    options: {
                        cesiumIONToken: this.accessToken,
                        dracoDecoderPath: 'https://cdn.jsdelivr.net/npm/three@0.146.0/examples/js/libs/draco',
                        basisTranscoderPath: 'https://cdn.jsdelivr.net/npm/three@0.146.0/examples/js/libs/basis',
                        // maximumScreenSpaceError: 0.05,
                        geoTransform: 3,
                        debug: true,
                        maximumMemoryUsage: 1024,
                    },
                });
            });
    }
}

export default C3DTilesIonSource;
