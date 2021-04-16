import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import {
  getDirectionsQuery,
  setupMapTest,
  setupActionTracking,
} from 'ember-google-maps/test-support';
import { setupLocations } from 'dummy/tests/helpers/locations';
import wait from 'dummy/tests/helpers/wait';
import { render } from '@ember/test-helpers';
import hbs from 'htmlbars-inline-precompile';

module('Integration | Component | g-map/directions', function (hooks) {
  setupRenderingTest(hooks);
  setupMapTest(hooks);
  setupLocations(hooks);
  setupActionTracking(hooks);

  test('it fetches directions', async function (assert) {
    this.origin = 'Covent Garden';
    this.destination = 'Clerkenwell';

    await render(hbs`
      <GMap @lat={{lat}} @lng={{lng}} as |g|>
        <g.directions
          @origin={{origin}}
          @destination={{destination}}
          @travelMode="WALKING"
          @onDirectionsChanged={{fn this.trackAction "directionsReady"}} />
      </GMap>
    `);

    await this.seenAction('directionsReady', { timeout: 10000 });

    let {
      components: { directions },
    } = this.gMapAPI;

    assert.equal(directions.length, 1);

    let { origin, destination } = getDirectionsQuery(directions[0].directions);

    assert.equal(origin, this.origin);
    assert.equal(destination, this.destination);

    await wait(1000);
  });

  test('it updates the directions when one of the attributes changes', async function (assert) {
    this.origin = 'Covent Garden';
    this.destination = 'Clerkenwell';

    await render(hbs`
      <GMap @lat={{lat}} @lng={{lng}} as |g|>
        <g.directions
          @origin={{origin}}
          @destination={{destination}}
          @travelMode="WALKING"
          @onDirectionsChanged={{fn this.trackAction "directionsReady"}} />
      </GMap>
    `);

    await this.seenAction('directionsReady', { timeout: 10000 });

    let {
      components: { directions },
    } = this.gMapAPI;
    let { origin, destination } = getDirectionsQuery(directions[0].directions);

    assert.equal(origin, this.origin);
    assert.equal(destination, this.destination);

    await wait(1000);

    this.set('origin', 'Holborn Station');

    await this.seenAction('directionsReady', { timeout: 10000 });

    ({ origin, destination } = getDirectionsQuery(directions[0].directions));

    assert.equal(origin, this.origin);
    assert.equal(destination, this.destination);

    await wait(1000);
  });
});
