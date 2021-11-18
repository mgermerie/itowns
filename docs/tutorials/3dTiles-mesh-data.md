The goal of this tutorial is to give an example on how to use iTowns to visualize some mesh data.
These data are formated in 3d-tiles, and represent buildings on Lyon city area.
They can be found [here](https://github.com/iTowns/iTowns2-sample-data/tree/master/3DTiles/dataset-dl.liris.cnrs.fr/three-d-tiles-lyon-metropolis/Lyon_2015_TileSet).
They shall be displayed on a `{@link PlanarView}`, as the one created in the [CC46 tutorial]{@tutorial Raster-data-CC46}

## Preparing the field

We are going to use the data displayed in the [CC46 tutorial]{@tutorial Raster-data-CC46}.
We are also going to add the labels we displayed in the
[vector data projected on ground tutorial]{@tutorial Vector-data-on-ground} tutorial.

```html
<!DOCTYPE html>
<html>
    <head>
        <meta charset="UTF-8">
        <title>3D-tiles mesh data</title>
        <style>
            html { height: 100%; }
            body { margin: 0; overflow: hidden; height: 100%; }
            #viewerDiv { margin: auto; height: 100%; width: 100%; padding: 0; }
            canvas { display: block }
        </style>
    </head>
    <body>
        <div id="viewerDiv"></div>
        <script src="js/itowns.js"></script>
        <script type="text/javascript">

            // Retrieve the view container
            const viewerDiv = document.getElementById('viewerDiv');

            // Define the view geographic extent
            itowns.proj4.defs(
                'EPSG:3946',
                '+proj=lcc +lat_1=45.25 +lat_2=46.75 +lat_0=46 +lon_0=3 +x_0=1700000 +y_0=5200000 +ellps=GRS80 ' +
                '+towgs84=0,0,0,0,0,0,0 +units=m +no_defs',
            );
            const viewExtent = new itowns.Extent(
                'EPSG:3946',
                1837816.94334, 1847692.32501,
                5170036.4587, 5178412.82698,
            );

            // Define the camera initial placement
            const placement = {
                coord: viewExtent.center(),
                tilt: 12,
                heading: 40,
                range: 6200,
            };

            // Create the planar view
            const view = new itowns.PlanarView(viewerDiv, viewExtent, {
                placement: placement,
            });

            // Define the source of the ortho-images
            const sourceOrtho = new itowns.WMSSource({
                url: 'https://download.data.grandlyon.com/wms/grandlyon',
                name: 'Ortho2009_vue_ensemble_16cm_CC46',
                format: 'image/jpeg',
                crs: 'EPSG:3946',
                extent: viewExtent,
            });
            // Create the ortho-images ColorLayer and add it to the view
            const layerOrtho = new itowns.ColorLayer('Ortho', { source: sourceOrtho });
            view.addLayer(layerOrtho);

            // Define the source of the dem data
            const sourceDEM = new itowns.WMSSource({
                url: 'https://download.data.grandlyon.com/wms/grandlyon',
                name: 'MNT2018_Altitude_2m',
                format: 'image/jpeg',
                crs: 'EPSG:3946',
                extent: viewExtent,
            });
            // Create the dem ElevationLayer and add it to the view
            const layerDEM = new itowns.ElevationLayer('DEM', {
                source: sourceDEM,
                useColorTextureElevation: true,
                colorTextureElevationMinZ: 144,
                colorTextureElevationMaxZ: 622,
            });
            view.addLayer(layerDEM);
            
            // Define a Source for the city names
            const citySource = new itowns.WFSSource({
                url: 'https://wxs.ign.fr/cartovecto/geoportail/wfs?',
                typeName: 'BDCARTO_BDD_WLD_WGS84G:zone_habitat_mairie',
                crs: 'EPSG:3946',
            });

            // Define a Style for the city names
            const cityStyle = new itowns.Style({
                text: {
                    field: '{toponyme}',
                    color: 'white',
                    transform: 'uppercase',
                    size: 15,
                    haloColor: 'rgba(20, 20, 20, 0.8)',
                    haloWidth: 3,
                },
            });

            // Create a LabelLayer to display city names and add it to the view
            const cityLayer = new itowns.LabelLayer('cities', {
                source: citySource,
                style: cityStyle,
            });
            view.addLayer(cityLayer);

        </script>
    </body>
</html>
```

## Display buildings mesh data

As for every data displayed in iTowns, we need to define the source of our mesh data.
Our data is in 3d-tiles format, so we can use iTowns `{@link C3DTilesSource}` : 

```js
const buildingsSource = new itowns.C3DTilesSource({
    url: 'https://raw.githubusercontent.com/iTowns/iTowns2-sample-data/master/3DTiles/' +
        'dataset-dl.liris.cnrs.fr/three-d-tiles-lyon-metropolis/Lyon_2015_TileSet/tileset.json',
});
```

It is worth noting that the 3d-tiles data we want to display on a given `{@link View}` must be in the same Coordinates 
Reference System (CRS) as the `{@link View}`.
Here, our 3d-tiles data are in [RGF93 / CC46](https://epsg.io/3946) projection, just like our `{@link PlanarView}`.
This is the reason why we do not need to specify a `crs` parameter when instantiating our `{@link C3DTilesSource}`.

Now that the source of our data is set, we need to create a `{@link Layer}` which will contain the data.
To display 3d-tiles data, iTowns comes with a `{@link C3DTilesLayer}`, which we can use as such :

```js
const buildingsLayer = new itowns.C3DTilesLayer('buildings', {
    source: buildingsSource,
}, view);
itowns.View.prototype.addLayer.call(view, buildingsLayer);
```

When instantiating a `{@link C3DTilesLayer}`, we need to specify which `{@link View}` it is added to.
We also need to call the generic `addLayer` method from `{@link View}`, and not the specific one from 
`{@link PlanarView}`.
This is because both 3d-tiles data and `{@link PlanarView}` have their own spatial subdivision. 
Therefore, 3d-tiles data must not use specific `{@link PlanarView}` spatial subdivision.

The code above results in the following :

![Simple PlanarView](images/3dTiles-mesh-data-1.png)

We can see our buildings, but they are all black.
In order to improve their visualisation, we can add light effects to our view.

## Add light effects

We can use ThreeJS [`DirectionalLight`](https://threejs.org/docs/index.html#api/en/lights/DirectionalLight) and 
[`AmbientLight`](https://threejs.org/docs/index.html#api/en/lights/AmbientLight) to add light effects to our view.
We just need to implement them as we would in any [ThreeJS](https://threejs.org/) application :

```js
const directionalLight = new itowns.THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(-0.9, 0.3, 1);
directionalLight.updateMatrixWorld();
view.scene.add(directionalLight);

const ambiantLight = new itowns.THREE.AmbientLight(0xffffff, 0.2);
view.scene.add(ambiantLight);
```

We can now see our buildings with some light effects :

![Simple PlanarView](images/3dTiles-mesh-data-2.png)

## Result

By reaching here, you are now able to display some mesh data in 3d-tiles format.
The final code to do so is the following :

```html
<!DOCTYPE html>
<html>
    <head>
        <meta charset="UTF-8">
        <title>3D-tiles mesh data</title>
        <style>
            html { height: 100%; }
            body { margin: 0; overflow: hidden; height: 100%; }
            #viewerDiv { margin: auto; height: 100%; width: 100%; padding: 0; }
            canvas { display: block }
        </style>
    </head>
    <body>
        <div id="viewerDiv"></div>
        <script src="js/itowns.js"></script>
        <script type="text/javascript">

            // Retrieve the view container
            const viewerDiv = document.getElementById('viewerDiv');

            // Define the view geographic extent
            itowns.proj4.defs(
                'EPSG:3946',
                '+proj=lcc +lat_1=45.25 +lat_2=46.75 +lat_0=46 +lon_0=3 +x_0=1700000 +y_0=5200000 +ellps=GRS80 ' +
                '+towgs84=0,0,0,0,0,0,0 +units=m +no_defs',
            );
            const viewExtent = new itowns.Extent(
                'EPSG:3946',
                1837816.94334, 1847692.32501,
                5170036.4587, 5178412.82698,
            );

            // Define the camera initial placement
            const placement = {
                coord: viewExtent.center(),
                tilt: 12,
                heading: 40,
                range: 6200,
            };

            // Create the planar view
            const view = new itowns.PlanarView(viewerDiv, viewExtent, {
                placement: placement,
            });

            // Define the source of the ortho-images
            const sourceOrtho = new itowns.WMSSource({
                url: 'https://download.data.grandlyon.com/wms/grandlyon',
                name: 'Ortho2009_vue_ensemble_16cm_CC46',
                format: 'image/jpeg',
                crs: 'EPSG:3946',
                extent: viewExtent,
            });
            // Create the ortho-images ColorLayer and add it to the view
            const layerOrtho = new itowns.ColorLayer('Ortho', { source: sourceOrtho });
            view.addLayer(layerOrtho);

            // Define the source of the dem data
            const sourceDEM = new itowns.WMSSource({
                url: 'https://download.data.grandlyon.com/wms/grandlyon',
                name: 'MNT2018_Altitude_2m',
                format: 'image/jpeg',
                crs: 'EPSG:3946',
                extent: viewExtent,
            });
            // Create the dem ElevationLayer and add it to the view
            const layerDEM = new itowns.ElevationLayer('DEM', {
                source: sourceDEM,
                useColorTextureElevation: true,
                colorTextureElevationMinZ: 144,
                colorTextureElevationMaxZ: 622,
            });
            view.addLayer(layerDEM);

            // Define a Source for the city names
            const citySource = new itowns.WFSSource({
                url: 'https://wxs.ign.fr/cartovecto/geoportail/wfs?',
                typeName: 'BDCARTO_BDD_WLD_WGS84G:zone_habitat_mairie',
                crs: 'EPSG:3946',
            });

            // Define a Style for the city names
            const cityStyle = new itowns.Style({
                text: {
                    field: '{toponyme}',
                    color: 'white',
                    transform: 'uppercase',
                    size: 15,
                    haloColor: 'rgba(20, 20, 20, 0.8)',
                    haloWidth: 3,
                },
            });

            // Create a LabelLayer to display city names and add it to the view
            const cityLayer = new itowns.LabelLayer('cities', {
                source: citySource,
                style: cityStyle,
            });
            view.addLayer(cityLayer);

            // Define the source of our 3d-tiles data
            const buildingsSource = new itowns.C3DTilesSource({
                url: 'https://raw.githubusercontent.com/iTowns/iTowns2-sample-data/master/3DTiles/' +
                    'dataset-dl.liris.cnrs.fr/three-d-tiles-lyon-metropolis/Lyon_2015_TileSet/tileset.json',
            });

            // Create a layer to display our 3d-tiles data and add it to the view
            const buildingsLayer = new itowns.C3DTilesLayer('buildings', {
                source: buildingsSource,
            }, view);
            itowns.View.prototype.addLayer.call(view, buildingsLayer);

            // Add directional light effect to the view
            const directionalLight = new itowns.THREE.DirectionalLight(0xffffff, 1);
            directionalLight.position.set(-0.9, 0.3, 1);
            directionalLight.updateMatrixWorld();
            view.scene.add(directionalLight);

            // Add ambiant light effect to the view
            const ambiantLight = new itowns.THREE.AmbientLight(0xffffff, 0.2);
            view.scene.add(ambiantLight);
            
        </script>
    </body>
</html>
```
