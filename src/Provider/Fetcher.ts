import { TextureLoader } from 'three';


const textureLoader = new TextureLoader();


function checkResponse(response: any) {
    if (!response.ok) {
        const error = new Error(
            `Error loading ${response.url}: status ${response.status}`,
        );
        error.response = response;
        throw error;
    }
}


/**
 * Wrapper over fetch to get some text.
 *
 * @param {string} url - The URL of the text file to fetch.
 * @param {Object} options - Fetch options (passed directly to `fetch()`),
 * see [the syntax for more information](
 * https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch#Syntax).
 *
 * @return {Promise<string>} Promise containing the text.
 */
function text(url: string, options = {}) {
    return fetch(url, options).then((response) => {
        checkResponse(response);
        return response.text();
    });
}


/**
 * Wrapper over fetch to get some JSON.
 *
 * @param {string} url - The URL of the JSON file to fetch.
 * @param {Object} options - Fetch options (passed directly to `fetch()`),
 * see [the syntax for more information](
 * https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch#Syntax).
 *
 * @return {Promise<Object>} Promise containing the JSON object.
 */
function json(url: string, options = {}) {
    return fetch(url, options).then((response) => {
        checkResponse(response);
        return response.json();
    });
}


/**
 * Wrapper over fetch to get some XML.
 *
 * @param {string} url - The URL of the XML file to fetch.
 * @param {Object} options - Fetch options (passed directly to `fetch()`),
 * see [the syntax for more information](
 * https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch#Syntax).
 *
 * @return {Promise<Document>} Promise containing the XML Document.
 */
function xml(url: string, options = {}) {
    return fetch(url, options).then((response) => {
        checkResponse(response);
        return response.text();
    }).then(text => new window.DOMParser().parseFromString(text, 'text/xml'));
}


/**
 * Wrapper over [THREE.TextureLoader](https://threejs.org/docs/#api/en/loaders/TextureLoader).
 *
 * @param {string} url - The URL of the resources to fetch.
 * @param {Object} options - Fetch options (passed directly to `fetch()`),
 * see [the syntax for more information](
 * https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch#Syntax).
 * Note that THREE.js docs mentions `withCredentials`, but it is not
 * actually used in [THREE.TextureLoader](https://threejs.org/docs/#api/en/loaders/TextureLoader).
 *
 * @return {Promise<THREE.Texture>} Promise containing the
 * [THREE.Texture](https://threejs.org/docs/api/en/textures/Texture.html).
 */
function texture(url: string, options = {}) {
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


export {
    text,
    json,
    xml,
    texture,
};
