import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { setupMapTest, trigger } from 'ember-google-maps/test-support';
import { setupLocations } from 'dummy/tests/helpers/locations';
import { render } from '@ember/test-helpers';
import hbs from 'htmlbars-inline-precompile';

module('Integration | Component | g map/marker', function (hooks) {
  setupRenderingTest(hooks);
  setupMapTest(hooks);
  setupLocations(hooks);

  test('it renders a marker', async function (assert) {
    await render(hbs`
      <GMap @lat={{this.lat}} @lng={{this.lng}} as |g|>
        <g.marker @lat={{this.lat}} @lng={{this.lng}} />
      </GMap>
    `);

    let {
      map,
      components: { markers },
    } = await this.waitForMap();

    let marker = markers[0].mapComponent;

    assert.equal(markers.length, 1);
    assert.equal(marker.map, map);
  });

  test('it attaches an event to a marker', async function (assert) {
    assert.expect(1);

    this.onClick = () => assert.ok('It binds events to actions');

    await render(hbs`
      <GMap @lat={{this.lat}} @lng={{this.lng}} as |g|>
        <g.marker @lat={{this.lat}} @lng={{this.lng}} @onClick={{this.onClick}} />
      </GMap>
    `);

    let {
      components: { markers },
    } = await this.waitForMap();

    let marker = markers[0].mapComponent;

    trigger(marker, 'click');
  });

  test('it sets options on a marker', async function (assert) {
    await render(hbs`
      <GMap @lat={{this.lat}} @lng={{this.lng}} as |g|>
        <g.marker @lat={{this.lat}} @lng={{this.lng}} @draggable={{true}} />
      </GMap>
    `);

    let {
      components: { markers },
    } = await this.waitForMap();

    let marker = markers[0].mapComponent;

    assert.equal(marker.draggable, true);
  });
});
