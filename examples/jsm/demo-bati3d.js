/* eslint-disable import/no-unresolved */
import GuiTools from 'GuiTools';
import setupLoadingScreen from 'LoadingScreen';
import {
    // View
    GlobeView,
    // Geographic
    Coordinates,
    // Layer
    ColorLayer,
    ElevationLayer,
    enableDracoLoader,
    enableKtx2Loader,
    enableMeshoptDecoder,
    OGC3DTilesLayer,
    OGC3DTILES_LAYER_EVENTS,
    // Source
    WMTSSource,
    OGC3DTilesSource,
    // Provider
    Fetcher,

} from 'itowns';
import * as debug from 'debug';
import {
    AmbientLight,
    BufferAttribute,
    MeshStandardMaterial,
    PMREMGenerator,
} from 'three';
/* eslint-disable import/extensions */
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
/* eslint-enable import/extensions */
/* eslint-enable import/no-unresolved */



// ---------- CREATE A GlobeView FOR SUPPORTING DATA VISUALIZATION : ----------

// Define camera initial position
const placement = {
    coord: new Coordinates('EPSG:4326', 2.351323, 48.856712),
    range: 5000,
};

// `viewerDiv` will contain iTowns' rendering area (`<canvas>`)
const viewerDiv = document.getElementById('viewerDiv');

// Create a GlobeView
const view = new GlobeView(viewerDiv, placement, {
    disableSkirt: true,
});

// Setup loading screen and debug menu
setupLoadingScreen(viewerDiv, view);
const debugMenu = new GuiTools('menuDiv', view);
debug.createTileDebugUI(debugMenu.gui, view);



// ---------- DISPLAY ORTHO-IMAGES : ----------

Fetcher.json('./layers/JSONLayers/Ortho.json').then(function _(config) {
    config.source = new WMTSSource(config.source);
    view.addLayer(
        new ColorLayer('Ortho', config),
    ).then(debugMenu.addLayerGUI.bind(debugMenu));
});



// ---------- DISPLAY A DIGITAL ELEVATION MODEL : ----------

function addElevationLayerFromConfig(config) {
    config.source = new WMTSSource(config.source);
    view.addLayer(
        new ElevationLayer(config.id, config),
    ).then(debugMenu.addLayerGUI.bind(debugMenu));
}
Fetcher.json('./layers/JSONLayers/IGN_MNT_HIGHRES.json').then(addElevationLayerFromConfig);
Fetcher.json('./layers/JSONLayers/WORLD_DTM.json').then(addElevationLayerFromConfig);



// ---------- ADD A 3D TILES MODEL : ----------

// Add ambient light to globally illuminates all objects
const light = new AmbientLight(0x404040, 40);
view.scene.add(light);

// Set the environment map for all physical materials in the scene.
// Otherwise, mesh with only diffuse colors will appear black.
const environment = new RoomEnvironment();
const pmremGenerator = new PMREMGenerator(view.renderer);
view.scene.environment = pmremGenerator.fromScene(environment).texture;
pmremGenerator.dispose();

// Enable loaders used to decode data
enableDracoLoader('./libs/draco/');
enableKtx2Loader('./lib/basis/', view.renderer);
enableMeshoptDecoder(MeshoptDecoder);


// Create a source for the 3d tiles
const buildingSource = new OGC3DTilesSource({
    url: 'https://batiment3d.ign.fr/data/tileset.json',
});

// Create a Layer for the 3d tiles
const buildingLayer = new OGC3DTilesLayer(
    'buildings',
    {
        source: buildingSource,
    },
);

// Add the 3d tiles layer to the view
view.addLayer(buildingLayer);



// Define a function to color 3d tiles features

/* usedProperty needs to store the name of the properties used to compute color.
 * An array with the actual property values, in the same order, is passed to the
 * getColor method when called.
 */
const usedProperties = [
    'nature',
];

/* A method that is called to define the color of each vertex.
 * Its parameter is an array containing the values of some properties associated
 * to the feature the vertex belongs to. Which properties are in this array, and
 * following which order, must be defined in the `usedProperty` array above.
 *
 * The method MUST return a valid RGB object, such as the one in this example.
 */
function getColor(usedProperties) {
    switch (usedProperties[0]) {
        case 'Industriel, agricole ou commercial':
            return { r: 241, g: 162, b: 8 };
        case 'Indifférenciée':
            return { r: 28, g: 128, b: 19 };
        case 'Eglise':
            return { r: 115, g: 0, b: 113 };
        case 'Monument':
            return { r: 194, g: 192, b: 148 };
        default:
            return { r: 255, g: 0, b: 0 };
    }
}

/*
 * Create a color buffer for a given mesh geometry that matches the
 * metadata with the getColor callback specified above.
 */
function createColorBuffer(child) {
    const geometry = child.geometry;
    const metadata = child.userData.structuralMetadata;
    const meshFeatures = child.userData.meshFeatures;

    const featureInfo = meshFeatures.featureIds[0];

    const propertyTable = metadata.tableAccessors[featureInfo.propertyTable];

    const featureIdAttr = geometry.getAttribute('_feature_id_0');
    const vertexCount = featureIdAttr.count;

    const colors = new Float32Array(vertexCount * 3);

    for (let i = 0; i < vertexCount; i++) {
        const featureId = featureIdAttr.getX(i);

        const properties = [];
        usedProperties.forEach(
            (key) => {
                const value = propertyTable.getPropertyValue(key, featureId);
                properties.push(value);
            },
        );

        const color = getColor(properties);
        colors[i * 3] = color.r / 255;
        colors[(i * 3) + 1] = color.g / 255;
        colors[(i * 3) + 2] = color.b / 255;
    }

    return new BufferAttribute(colors, 3);
}

// When each tile of the 3d tile has its model loaded, we overwrite its material
// to replace it with a custom colored material that depends on metadata.
buildingLayer.addEventListener(
    OGC3DTILES_LAYER_EVENTS.LOAD_MODEL,
    ({ scene }) => {
        scene.traverse((child) => {
            if (child.isMesh) {
                const colorBuffer = createColorBuffer(child);
                child.geometry.setAttribute('color', colorBuffer);

                child.material = new MeshStandardMaterial({
                    vertexColors: true,
                    roughness: 0.9,
                    metalness: 0.1,
                });
                child.receiveShadow = true;
                child.castShadow = true;
            }
        });
    },
);

