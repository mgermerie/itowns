import {
    DataTexture,
    FloatType,
    RedFormat,
    TextureLoader,
} from 'three';


type NetworkOptions = RequestInit & { crossOrigin?: string }


const textureLoader = new TextureLoader();
const SIZE_TEXTURE_TILE = 256;  // TODO: Can we avoid the magic number ?


/**
 * Use fetch API to get some resource and check if the request was successful.
 *
 * @param url - The URL of the resource to fetch.
 * @param options - Options passed to the request.
 *
 * @throws If the request failed (status not in the range `200`-`209`)
 * @returns The request's response if it was successful.
 */
function fetchAndCheck(url: string, options: RequestInit) {
    return fetch(url, options)
        .then((response) => {
            if (!response.ok) {
                throw Error(
                    `Error loading ${response.url}: status ${response.status}`,
                );
            }
            return response;
        });
}


/**
 * Wrapper over fetch to get some ArrayBuffer.
 *
 * @param url - The URL of the resources to fetch.
 * @param options - Options passed directly to `fetch()`. See
 * [`fetch()` syntax](https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch#Syntax)
 * for more information.
 *
 * @returns A promise that is resolved with the ArrayBuffer
 */
function arrayBuffer(url: string, options: NetworkOptions = {}) {
    return fetchAndCheck(url, options).then(r => r.arrayBuffer());
}


/**
 * Wrapper over fetch to get some JSON.
 *
 * @param url - The URL of the JSON file to fetch.
 * @param options - Options passed directly to `fetch()`. See
 * [`fetch()` syntax](https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch#Syntax)
 * for more information.
 *
 * @returns A promise that is resolved with the JSON object.
 */
function json(url: string, options: NetworkOptions = {}) {
    return fetchAndCheck(url, options).then(r => r.json());
}


/**
 * Wrapper over fetch to get a bunch of files sharing the same name but
 * different extensions.
 *
 * @param url - The shared URL - without the extension - of the resources to
 * fetch.
 * @param extensions -
 */
function multiple(url: string, extensions: any, options: NetworkOptions = {}) {
    console.log(options);
}


/**
 * Wrapper over fetch to get some text.
 *
 * @param url - The URL of the text file to fetch.
 * @param options - Options passed directly to `fetch()`. See
 * [`fetch()` syntax](https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch#Syntax)
 * for more information.
 *
 * @returns A promise that is resolved with the text.
 */
function text(url: string, options: NetworkOptions = {}) {
    return fetchAndCheck(url, options).then(r => r.text());
}


/**
 * Wrapper over [three.js TextureLoader](https://threejs.org/docs/#api/en/loaders/TextureLoader)
 * to get some [three.js Texture](https://threejs.org/docs/#api/en/textures/Texture)
 *
 * @param url - The URL of the resources to fetch.
 * @param options - Options passed directly to `fetch()`. See
 * [`fetch()` syntax](https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch#Syntax)
 * for more information.
 * Note that THREE.js docs mentions `withCredentials`, but it is not
 * actually used in [THREE.TextureLoader](https://threejs.org/docs/#api/en/loaders/TextureLoader).
 *
 * @returns A promise that is resolved with the [THREE.Texture](https://threejs.org/docs/#api/en/textures/Texture).
 */
function texture(url: string, options: NetworkOptions = {}) {
    let res;
    let rej;

    textureLoader.crossOrigin = options.crossOrigin;

    const promise = new Promise((resolve, reject) => {
        res = resolve;
        rej = reject;
    });

    textureLoader.load(url, res, () => {}, rej);
    return promise;
}


/**
 * Wrapper over fetch to get some
 * [three.js DataTexture](https://threejs.org/docs/#api/en/textures/DataTexture).
 *
 * @param url - The URL oof the resources to fetch.
 * @param options - Options passed directly to `fetch()`. See
 * [`fetch()` syntax](https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch#Syntax)
 * for more information.
 *
 * @returns A promise that is resolved with the DataTexture.
 */
function textureFloat(url: string, options: NetworkOptions = {}) {
    return arrayBuffer(url, options)
        .then((buffer) => {
            const texture = new DataTexture(
                new Float32Array(buffer),
                SIZE_TEXTURE_TILE,
                SIZE_TEXTURE_TILE,
                RedFormat,
                FloatType,
            );
            texture.internalFormat = 'R32F';
            texture.needsUpdate = true;
            return texture;
        });
}


/**
 * Wrapper over fetch to get some XML.
 *
 * @param url - The URL of the XML file to fetch.
 * @param options - Options passed directly to `fetch()`. See
 * [`fetch()` syntax](https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch#Syntax)
 * for more information.
 *
 * @returns A promise that is resolved with the XML Document.
 */
function xml(url: string, options: NetworkOptions = {}) {
    return fetchAndCheck(url, options).then(r => r.text())
        .then(text => new window.DOMParser().parseFromString(text, 'text/xml'));
}


export default {
    arrayBuffer,
    json,
    text,
    texture,
    textureFloat,
    xml,
};


// https://www.iana.org/assignments/media-types/media-types.xhtml#application
// https://www.rfc-editor.org/rfc/rfc2046.html
const map = new Map([
    ['application/geo+json', json],
    ['application/isg', text],
    ['application/json', json],
    ['application/kml', xml],
    ['application/gdf', text],
    ['application/gpx', xml],
    ['application/gtx', arrayBuffer],
    ['application/x-protobuf;type=mapbox-vector', arrayBuffer],
    ['image/jpeg', texture],
    ['image/png', texture],
    ['image/x-bil;bits=32', textureFloat],
]);

export function get(format: string = '') {
    return map.get(format) || texture;
}
