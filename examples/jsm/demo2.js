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
    range: 100000,
    // range: 5000,
    // tilt: 15,
    // heading: -45,
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

const water = new itowns.GeometryLayer(
    'water',
    new THREE.Group(),
    {
        source: false,
    },
);


water.update = (context, layer, node, parent) => {
    if (!parent || !node.material) {
        return;
    }

    if (!node.material.visible) {
        return;
    }

    if (node.waterMesh) {
        return;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', node.geometry.attributes.position.clone());
    geometry.setAttribute('normal', node.geometry.attributes.normal.clone());
    geometry.setIndex(node.geometry.index.clone());


    const material = new THREE.ShaderMaterial({
        vertexShader: `
            varying vec3 vPosition;

            void main() {
                vec3 displacedPosition = position;
                vPosition = displacedPosition;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(displacedPosition, 1.0);
            }
        `,
        fragmentShader: `
            varying vec3 vPosition;

            void main() {
                vec3 color = normalize(vPosition);
                gl_FragColor = vec4(color, 0.5);
            }
        `,
        transparent: true,
    });

    const mesh = new THREE.Mesh(geometry, material);

    layer.object3d.add(mesh);

    mesh.matrixWorld.copy(node.matrixWorld);

    node.waterMesh = mesh;
};

view.addLayer(water);

