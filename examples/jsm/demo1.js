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
    coord: new itowns.Coordinates('EPSG:4326', 7.308463, 43.700912),
    range: 5000,
    tilt: 15,
    heading: -45,
};

// `viewerDiv` will contain iTowns' rendering area (`<canvas>`)
const viewerDiv = document.getElementById('viewerDiv');

// Create a GlobeView
const view = new itowns.GlobeView(viewerDiv, placement);

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



// ---------- ADD A SPHERE : ----------


const slider = document.getElementById('altitudeSlider');
const value = document.getElementById('altitudeValue');

const geometry = new THREE.SphereGeometry(1, 4096, 4096);
const material = new THREE.MeshBasicMaterial({
    color: 0x00ff00,
    opacity: 0.5,
    transparent: true,
});
const sphere = new THREE.Mesh(geometry, material);
view.scene.add(sphere);

function setAltitude(altitude) {
    sphere.scale.copy(itowns.ellipsoidSizes).addScalar(altitude);
    sphere.updateMatrixWorld();
    view.notifyChange();
    value.textContent = altitude;
}

setAltitude(slider.value);

slider.addEventListener(
    'input',
    (event) => {
        setAltitude(Number(event.target.value));
    },
);

