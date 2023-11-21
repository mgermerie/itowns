import * as THREE from 'three';
import Capabilities from 'Core/System/Capabilities';
import { load } from '@loaders.gl/core';
import { TILE_REFINEMENT } from '@loaders.gl/tiles';
import { Tile3DBatchTable, TILE3D_TYPE } from '@loaders.gl/3d-tiles';
import { parseTiles } from 'Core/3DTiles/C3DTileset';
import shaderUtils from 'Renderer/Shader/ShaderUtils';
import { GLTFLoader } from 'ThreeExtended/loaders/GLTFLoader';
// import { C3DTilesTypes } from 'Core/3DTiles/C3DTilesEnums';
// import B3dmParser from 'Parser/B3dmParser';
// import PntsParser from 'Parser/PntsParser';
// import Fetcher from 'Provider/Fetcher';
// import ReferLayerProperties from 'Layer/ReferencingLayerProperties';
// import utf8Decoder from 'Utils/Utf8Decoder';
import PointsMaterial from 'Renderer/PointsMaterial';


const gltfLoader = new GLTFLoader();


// class ProperBatchTable {
//     constructor(json, binary, featureCount) {
//         // TODO: can we remove ?
//         this.type = C3DTilesTypes.batchTable;
//         this.batchLength = featureCount;
//
//         const jsonContent = json;
//     }
// }


const vector3 = new THREE.Vector3();
const matrixRotateX = (new THREE.Matrix4()).makeRotationX(Math.PI / 2);
const matrixRotateZ = (new THREE.Matrix4()).makeRotationZ(-Math.PI / 2);


function convertB3dm(parsedB3dm, options) {
    console.log(parsedB3dm);
    const promises = [];

    // Gltf content
    promises.push(new Promise((resolve) => {
        gltfLoader.parse(
            parsedB3dm.gltfArrayBuffer,
            options.baseURL,
            (gltf) => {
                // TODO: from loaders.gl code, it seems result.gltfUpAxis
                // defaults to 'Y', so there should be no instance where it is
                // undefined. This should be thoroughly checked though.
                if (parsedB3dm.gltfUpAxis === 'Y') {
                    gltf.scene.applyMatrix4(matrixRotateX);
                } else if (parsedB3dm.gltfUpAxis === 'X') {
                    gltf.scene.applyMatrix4(matrixRotateZ);
                }

                // Apply rtc center
                if (parsedB3dm.rtcCenter) {
                    gltf.scene.position.copy(
                        vector3.fromArray(parsedB3dm.rtcCenter),
                    );
                }

                gltf.scene.traverse((mesh) => {
                    mesh.frustumCulled = false;

                    // Patch materials if needed
                    if (mesh.material) {
                        if (
                            Capabilities.isLogDepthBufferSupported()
                            && mesh.material.isRawShaderMaterial
                            && !options.doNotPatchMaterial
                        ) {
                            shaderUtils.patchMaterialForLogDepthSupport(
                                mesh.material,
                            );
                            console.warn(
                                'b3dm shader has been patched to add log depth'
                                + ' buffer support',
                            );
                        }
                        // TODO: uncomment following line
                        // ReferLayerProperties(mesh.material, options.layer);
                    }
                });
                resolve(gltf);
            },
        );
    }));

    if (parsedB3dm.header.batchTableJsonLength) {
        const batchTable = new Tile3DBatchTable(
            parsedB3dm.batchTableJson,
            parsedB3dm.batchTableBinary,
            parsedB3dm.featureTableJson.BATCH_LENGTH,
            parsedB3dm.batchTableJson.extensions,
        );
        console.log(batchTable);
        // Batch table
        promises.push(Promise.resolve(
            batchTable,
        ));
    }

    return Promise.all(promises)
        .then(values => (
            {
                content: values[0].scene,
                batchTable: values[1],
            }
        ));
}


function convertPnts(parsedPnts, options) {
    console.log(parsedPnts);
    // TODO: add management for POSITION_QUANTIZED, RGBA, RGB565, NORMAL,
    // NORMAL_OCT16P, BATCH_ID
    if (parsedPnts.isQuantized) {
        throw new Error('For pnts loader, POSITION_QUANTIZED: not yet managed');
    }
    if (parsedPnts.isTranslucent) {
        throw new Error('For pnts loader, RGBA: not yet managed');
    }
    if (parsedPnts.isRGB565) {
        throw new Error('For pnts loader, RGB565: not yet managed');
    }
    if (parsedPnts.attributes.normals) {
        throw new Error('For pnts loader, NORMAL: not yet managed');
    }
    if (parsedPnts.isOctEncoded16P) {
        throw new Error('For pnts loader, NORMAL_OCT16P: not yet managed');
    }
    if (parsedPnts.attributes.batchIds) {
        throw new Error('For pnts loader, BATCH_ID: not yet managed');
    }

    const geometry = new THREE.BufferGeometry();

    geometry.setAttribute(
        'position',
        new THREE.BufferAttribute(
            parsedPnts.attributes.positions,
            3,
        ),
    );
    geometry.setAttribute(
        'color',
        new THREE.BufferAttribute(
            parsedPnts.attributes.colors.value,
            parsedPnts.attributes.colors.size,
            parsedPnts.attributes.colors.normalized,
        ),
    );

    const material = options.material
        ? options.material.clone()
        : new PointsMaterial({
            size: 0.05,
            mode: options.pntsMode,
            shape: options.pntsShape,
            classification: options.classification,
            sizeMode: options.pntsSizeMode,
            minAttenuatedSize: options.pntsMinAttenuatedSize,
            maxAttenuatedSize: options.pntsMaxAttenuatedSize,
        });
        // refer material properties in the layer so when layers opacity and visibility is updated, the material is
        // automatically updated
        // ReferLayerProperties(material, layer);

    const points = new THREE.Points(geometry, material);

    if (parsedPnts.rtcCenter) {
        points.position.copy(
            vector3.fromArray(parsedPnts.rtcCenter),
        );
    }

    // TODO: build batch table (with extension)
    const batchTable = {};

    return {
        content: points,
        batchTable,
    };
}


export function configureTile(tile, layer, metadata, parent) {
    tile.frustumCulled = false;
    tile.layer = layer;

    // parse metadata
    if (metadata.transform) {
        tile.applyMatrix4(metadata.transform);
    }
    tile.geometricError = metadata.geometricError;
    tile.tileId = metadata.tileId;
    if (metadata.refine) {
        tile.additiveRefinement = (metadata.refine === TILE_REFINEMENT.ADD);
    } else {
        tile.additiveRefinement = parent ? (parent.additiveRefinement) : false;
    }
    tile.viewerRequestVolume = metadata.viewerRequestVolume;
    tile.boundingVolume = metadata.boundingVolume;
    tile.updateMatrixWorld();
}


function executeCommand(command) {
    const layer = command.layer;
    const metadata = command.metadata;
    const tile = new THREE.Object3D();
    configureTile(tile, layer, metadata, command.requester);
    // Patch for supporting 3D Tiles pre 1.0 (metadata.content.url) and 1.0
    // (metadata.content.uri)
    const path = metadata.content && (metadata.content.url || metadata.content.uri);

    const setLayer = (obj) => {
        obj.userData.metadata = metadata;
        obj.layer = layer;
    };
    if (path) {
        // Check if we have relative or absolute url (with tileset's lopocs for example)
        const url = path.startsWith('http') ? path : metadata.baseURL + path;

        // TODO: find a way if necessary to add layer.networkOptions
        return load(
            url,
            layer.tileset.loader,
            { '3d-tiles': {
                loadGLTF: false,
                // assetGltfUpAxis: 'Y',  // Default value but I put it here to
                // illustrate what could be parametrized. This should be checked
                // but from what I figured, this parameter is set in `loader`
                // options so it might not be necessary to pass the value frome
                // the json tileset here.
            } },
        ).then(
            (result) => {
                const convertOptions = {
                    // for batch table :
                    // registeredExtensions: layer.registeredExtensions,
                };

                switch (result.type) {
                    case 'TILES3D': {  // TODO: search type in loaders.gl
                        // Extend tileset
                        parseTiles(
                            layer.tileset,
                            result.root,
                            url.slice(0, url.lastIndexOf('/') + 1),
                            layer.tileset.tiles[metadata.tileId],
                            layer.registeredExtensions,
                        );
                        layer.tileset.tiles[metadata.tileId].children =
                            [result.root];
                        layer.tileset.tiles[metadata.tileId].isTileset = true;

                        break;
                    }
                    case TILE3D_TYPE.BATCHED_3D_MODEL: {
                        Object.assign(convertOptions, {
                            baseURL: metadata.baseURL,
                            overrideMaterials: layer.overrideMaterials,
                            doNotPatchMaterial: layer.doNotPatchMaterial,
                        });
                        return convertB3dm(result, convertOptions);
                    }
                    case TILE3D_TYPE.POINT_CLOUD: {
                        if (layer.material) {
                            convertOptions.material = layer.material;
                        } else {
                            Object.assign(convertOptions, {
                                pntsMode: layer.pntsMode,
                                pntsShape: layer.pntsShape,
                                classification: layer.classification,
                                pntsSizeMode: layer.pntsSizeMode,
                                pntsMinAttenuatedSize: layer.pntsMinAttenuatedSize,
                                pntsMaxAttenuatedSize: layer.pntsMaxAttenuatedSize,
                            });
                        }
                        return convertPnts(result, convertOptions);
                    }
                    default:
                        break;
                }
            },
        ).then((convertedTile) => {
            if (convertedTile) {
                Object.assign(tile, convertedTile);
                tile.add(tile.content);
            }
            tile.traverse(setLayer);
            return tile;
        });
    } else {
        tile.traverse(setLayer);
        return Promise.resolve(tile);
    }
}

export default {
    executeCommand,
};
