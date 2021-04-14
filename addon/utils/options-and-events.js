import { decamelize } from '@ember/string';
import { next } from '@ember/runloop';

import { DEBUG } from '@glimmer/env';
import { HAS_NATIVE_PROXY } from './platform';

export const ignoredOptions = ['lat', 'lng', 'getContext', 'classNames', 'onLoad'];

const IGNORED = Symbol('Ignored'),
  EVENT = Symbol('Event'),
  OPTION = Symbol('Option'),
  OPTIONS = Symbol('Options'),
  EVENTS = Symbol('Events');

export class OptionsAndEvents {
  whosThatProp = new Map();

  [OPTION] = new Set();
  [EVENT] = new Set();

  constructor(args) {
    this.args = args;

    this.ignoredSet = new Set(ignoredOptions);

    // Sort and cache the arguments by type.
    this.parse();

    let getFromArgs = this.getFromArgs.bind(this);

    if (HAS_NATIVE_PROXY) {
      let target = Object.create(null);

      let optionsHandler = new ArgsProxyHandler(this[OPTION], getFromArgs);
      let eventsHandler = new ArgsProxyHandler(this[EVENT], getFromArgs);

      this.options = new Proxy(target, optionsHandler);
      this.events = new Proxy(target, eventsHandler);
    } else {
      this.options = newNoProxyFallback(this[OPTION], getFromArgs);
      this.events = newNoProxyFallback(this[EVENT], getFromArgs);
    }
  }

  getFromArgs(prop) {
    let identity = this.whosThatProp.get(prop);

    switch (identity) {
      case OPTIONS:
        return this.args.options[prop];

      case EVENTS:
        return this.args.events[prop];

      case OPTION:
      case EVENT:
        return this.args[prop];
    }
  }

  parse() {
    for (let prop in this.args) {
      let identity = this.identify(prop);

      switch (identity) {
        case OPTION:
        case EVENT:
          this[identity].add(prop);
          this.whosThatProp.set(prop, identity);
          break;

        case OPTIONS:
          for (let innerProp in this.args[prop]) {
            this[OPTION].add(innerProp);
            this.whosThatProp.set(innerProp, identity);
          }
          break;

        case EVENTS:
          for (let innerProp in this.args[prop]) {
            this[EVENT].add(innerProp);
            this.whosThatProp.set(innerProp, identity);
          }
          break;

        case IGNORED:
          break;
      }
    }
  }

  identify(prop) {
    if (this.isIgnored(prop)) {
      return IGNORED;
    }

    if (prop === 'options') {
      return OPTIONS;
    }

    if (prop === 'events') {
      return EVENTS;
    }

    if (this.isEvent(prop)) {
      return EVENT;
    }

    return OPTION;
  }

  isEvent(prop) {
    return prop.slice(0, 2) === 'on';
  }

  isIgnored(prop) {
    return this.ignoredSet.has(prop);
  }
}

class ArgsProxyHandler {
  constructor(cache, getFromArgs) {
    this.cache = cache;
    this.getFromArgs = getFromArgs;
    this.setCache = new Map();
  }

  get(_target, prop) {
    return this.getFromArgs(prop) ?? this.setCache.get(prop);
  }

  // TODO: Google Maps like to set default stuff. Check how this is going to
  // work.
  set(_target, prop, value) {
    if (value !== undefined) {
      this.setCache.set(prop, value);
      return value;
    } else {
      this.setCache.delete(prop);
    }
  }

  has(_target, prop) {
    return this.cache.has(prop);
  }

  ownKeys() {
    return Array.from(this.cache.values());
  }

  isExtensible() {
    return false;
  }

  getOwnPropertyDescriptor(_target, prop) {
    if (DEBUG && !this.cache.has(prop)) {
      throw new Error(
        `args proxies do not have real property descriptors, so you should never need to call getOwnPropertyDescriptor yourself. This code exists for enumerability, such as in for-in loops and Object.keys(). Attempted to get the descriptor for \`${String(
          prop
        )}\``
      );
    }

    return {
      enumerable: true,
      configurable: true,
    };
  }
}

function newNoProxyFallback(propSet, getFromArgs) {
  let obj = {};

  propSet.forEach((prop) => {
    Object.defineProperty(obj, prop, {
      enumerable: true,
      configurable: true,
      get() {
        return getFromArgs(prop);
      },
      set(prop, value) {
        if (value === undefined) {
          delete obj[prop];
        } else {
          obj[prop] = value;
        }
      },
    });
  });

  return obj;
}

/* Events */

export function addEventListener(
  target,
  originalEventName,
  action,
  payload = {}
) {
  let eventName = decamelize(originalEventName).slice(3);

  function callback(googleEvent) {
    let params = {
      event: window.event,
      googleEvent,
      eventName,
      target,
      ...payload,
    };

    next(target, action, params);
  }

  let addGoogleListener =
    target instanceof Element
      ? google.maps.event.addDomListener
      : google.maps.event.addListener;

  let listener = addGoogleListener(target, eventName, callback);

  return {
    name: eventName,
    listener,
    remove: () => listener.remove(),
  };
}

/**
 * Add event listeners on a target object using the cross-browser event
 * listener library provided by the Google Maps API.
 *
 * @param {Object} target
 * @param {Events} events
 * @param {[Object]} payload = {} An optional object of additional parameters
 *     to include with the event payload.
 * @return {google.maps.MapsEventListener[]} An array of bound event listeners
 *     that should be used to remove the listeners when no longer needed.
 */
export function addEventListeners(target, events, payload = {}) {
  return Object.entries(events).map(([originalEventName, action]) => {
    return addEventListener(target, originalEventName, action, payload);
  });
}
