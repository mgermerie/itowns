/* eslint-disable import/no-unresolved */
import GuiTools from 'GuiTools';
import setupLoadingScreen from 'LoadingScreen';
import * as THREE from 'three';
import * as itowns from 'itowns';
import * as debug from 'debug';
/* eslint-enable import/no-unresolved */



// ---------- CREATE A GlobeView FOR SUPPORTING DATA VISUALIZATION : ----------

// Define camera initial position
const placement = {
    coord: new itowns.Coordinates('EPSG:4326', 7.264944, 43.695706),
    range: 5000,
    tilt: 15,
    heading: 45,
};

// `viewerDiv` will contain iTowns' rendering area (`<canvas>`)
const viewerDiv = document.getElementById('viewerDiv');

// Create a GlobeView
const view = new itowns.GlobeView(viewerDiv, placement, {
    disableSkirt: true,
});

// Setup loading screen and debug menu
setupLoadingScreen(viewerDiv, view);
const debugMenu = new GuiTools('menuDiv', view);
debug.createTileDebugUI(debugMenu.gui, view);



// ---------- DISPLAY ORTHO-IMAGES : ----------

itowns.Fetcher.json('./layers/JSONLayers/Ortho.json').then(function _(config) {
    config.source = new itowns.WMTSSource(config.source);
    view.addLayer(
        new itowns.ColorLayer('Ortho', config),
    ).then(debugMenu.addLayerGUI.bind(debugMenu));
});



// ---------- DISPLAY A DIGITAL ELEVATION MODEL : ----------

function addElevationLayerFromConfig(config) {
    config.source = new itowns.WMTSSource(config.source);
    view.addLayer(
        new itowns.ElevationLayer(config.id, config),
    ).then(debugMenu.addLayerGUI.bind(debugMenu));
}
itowns.Fetcher.json('./layers/JSONLayers/IGN_MNT_HIGHRES.json').then(addElevationLayerFromConfig);
itowns.Fetcher.json('./layers/JSONLayers/WORLD_DTM.json').then(addElevationLayerFromConfig);



// ---------- ADD A BOX : ----------


// An instance of WaterMesh is a Mesh representing a box with given position, rotation, dimension
// and material. It implements useful methods for the use case represented in this example.
class WaterMesh extends THREE.Mesh {
    constructor(params) {
        const {
            coordinates,
            dimensions = {},
            color = '#0000ff',
            opacity = 0.5,
        } = params;

        const geometry = new THREE.BoxGeometry();
        const material = new THREE.MeshBasicMaterial({
            color,
            opacity,
            transparent: true,
        });
        super(geometry, material);

        this.setPosition(coordinates);

        const parsedDimensions = { x: 1, y: 1, z: 0, ...dimensions };
        this.setDimensions(parsedDimensions);

        // TODO: add rotation
    }

    setPosition(position) {
        this.position.copy(position.as(view.referenceCrs));
        this.lookAt(0, 0, 0);

        this.update();
    }

    setDimensions(dimensions) {
        const { x, y, z } = { ...this.scale, ...dimensions };

        this.scale.set(x, y, z);

        this.update();
    }

    setHeight(height) {
        this.setDimensions({ z: height });
    }

    update() {
        this.updateMatrix();
        this.updateMatrixWorld(true);
        view.notifyChange();
    }
}


async function addWaterFromConfig(configUrl) {
    // Fetch the configuration file for the demo, and parse its data:

    const config = await fetch(configUrl)
        .then(rawResponse => rawResponse.json())
        // parse json response (transform coordinates into an actual iTowns Coordinates object)
        .then(json => ({
            ...json,
            coordinates: new itowns.Coordinates(
                'EPSG:4326',
                json.coordinates.lon,
                json.coordinates.lat,
                json.coordinates.alt,
            ),
        }));


    // Create a WaterMesh from the configuration and add it to the scene:

    const { coordinates, dimensions, color, opacity } = config;
    const water = new WaterMesh({ coordinates, dimensions, color, opacity });
    view.scene.add(water);


    // Link the WaterMesh to the UI:

    // Get UI configuration:
    const { controller } = config;

    // Setup slider as specified in configuration
    const slider = document.getElementById('altitudeSlider');
    slider.min = controller.min;
    slider.max = controller.max;
    slider.step = controller.step;
    slider.value = dimensions.z || 0;

    // Setup slider value indicator
    const value = document.getElementById('altitudeValue');
    value.textContent = dimensions.z || 0;

    // Update WaterMesh and UI when slider moves
    slider.addEventListener(
        'input',
        () => {
            const altitude = Number(slider.value);
            value.textContent = altitude;  // Update slider value indicator
            water.setHeight(altitude);  // Update WaterMesh height
        },
    );
}

addWaterFromConfig('waterDemo1.json');

