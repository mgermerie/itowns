import assert from 'assert';
import * as THREE from 'three';
import GeometryLayer from 'Layer/GeometryLayer';
import ColorLayer from 'Layer/ColorLayer';
import { emptySource } from './utils';

describe('GeometryLayer', function () {
    const geometry = new GeometryLayer('geometry', new THREE.Group(), { source: emptySource() });
    const color = new ColorLayer('color', { source: emptySource() });

    it('should attached a color layer', function () {
        geometry.attach(color);
        assert.equal(geometry.attachedLayers.length, 1);
    });

    it('should detached a color layer', function () {
        geometry.detach(color);
        assert.equal(geometry.attachedLayers.length, 0);
    });
});
