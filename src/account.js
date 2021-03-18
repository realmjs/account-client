"use strict"

import { isNotObject } from './util'
import Iframe from './iframe'

export default class AccountClient {
  constructor(props) {
    this.validateProps(props);
    this.initProps(props);
    this.iframe = new Iframe({ baseurl: this._props.baseurl });
    this._eventHandlers = {};
    /* in case these methods are called by an event such as onClick, need to remain 'this' context */
    const fn = ['sso', 'signinLocally', 'signup', 'signin', 'signout', 'signoutLocally'];
    fn.forEach(method => this[method] = this[method].bind(this));
  }

  get(prop) {
    return this._props[prop];
  }

  set(props) {
    if (isNotObject(props)) {
      throw new Error('Require props to be an Object');
    }
    for (let p in props) {
      this._props[p] = props[p];
    }
    return this;
  }

  validateProps(props) {
    if (!props.baseurl) {
      throw new Error('missing prop: baseurl');
    }
    if (!props.app) {
      throw new Error('missing prop: app');
    }
    if (!props.session) {
      throw new Error('missing prop: session');
    }
  }

  initProps(props) {
    this._props = {};
    this.set(props);
    this.setDefaulProps();
  }

  setDefaulProps() {
    if (!this._props.timeout) { this._props.timeout = 50000; }
    if (!this._props.cookie) { this._props.cookie = false; }
  }

  emit(event, ...args) {
    if (this._eventHandlers[event]) {
      this._eventHandlers[event].forEach(fn => fn.call(this, ...args));
    }
    return this;
  }

  on(event, callback) {
    if (!this._eventHandlers[event]) {
      this._eventHandlers[event] = [];
    }
    this._eventHandlers[event].push(callback);
    return this;
  }

  sso(defer) {
    return new Promise( (resolve, reject) => {
      this.emit('authenticating');
      this._setTimeout(reject);
      this.iframe.open({
        path: '/session',
        query: { app: this.get('app') },
        onLoaded: () => this._clearTimeout(),
        done: (data) => this.onSSOFormResolved(data, defer, resolve, reject),
      })
    })
  }

  onSSOFormResolved(data, defer, resolve, reject) {
    if (data && data.status == 200) {
      this.processSignedIn(data, defer, resolve, reject);
    } else if (data && data.status == 404) {
      // process signout, session should be null
      this.processSigningout(defer, resolve, reject);
    } else {
      // sso required data to be returned either 200 or 404
      // if reach here, mean wrong in account-server configuration for sso
      reject('# Error in SSO: something wrong in account-server configuration');
    }
  }

  signup(defer) {
    return new Promise( (resolve, reject) => {
      this._setTimeout(reject);
      this.iframe.open({
        path: '/form',
        query: { name: 'signup', app: this.get('app') },
        props: { display: 'block' },
        onLoaded: () => this._clearTimeout(),
        done: (data) => this.onAuthenFormResolved(data, defer, resolve, reject, 'SIGN-UP'),
      })
    })
  }

  signin(defer) {
    return new Promise( (resolve, reject) => {
      this._setTimeout(reject);
      this.iframe.open({
        path: '/form',
        query: { name: 'signin', app: this.get('app'), height: 415 },
        props: { display: 'block' },
        onLoaded: () => this._clearTimeout(),
        done: (data) => this.onAuthenFormResolved(data, defer, resolve, reject, 'SIGN-IN'),
      })
    })
  }

  processSignedIn(data, defer, resolve, reject) {
    this.setLocalSession(data.session)
    .then(() => {
      this.emit('authenticated', data.session.user);
      if (defer) {
        defer(data.session.user).then(() => resolve(data.session.user)).catch(reject);
      } else {
        resolve(data.session.user);
      }
    })
    .catch(err => reject(err));
  }

  onAuthenFormResolved(data, defer, resolve, reject, processName) {
    if (data && data.status == 200) {
      this.processSignedIn(data, defer, resolve, reject);
    } else if (data && data.code === 'iframe.close') {
      reject(false);
    } else {
      // if reach here, mean wrong in account-server configuration for sign-in
      reject(`# Error in ${processName}: something wrong in account-server configuration`);
    }
  }

  signout(defer) {
    return new Promise( (resolve, reject) => {
      this._setTimeout(reject);
      this.iframe.open({
        path: '/form',
        query: { name: 'signout', app: this.get('app'), sid: this.getLocalSession().sid },
        onLoaded: () => this._clearTimeout(),
        done: (data) => this.onSignoutFormResolved(data, defer, resolve, reject),
      })
    })
  }

  onSignoutFormResolved(data, defer, resolve, reject) {
    if (data && data.status == 200) {
      this.processSigningout(defer, resolve, reject);
    } else {
      // if reach here, mean wrong in account-server configuration for signout
      reject(`# Error in SIGN-OUT: received ${data && data.status}`);
    }
  }

  signoutLocally(defer) {
    return new Promise((resolve, reject) => this.processSigningout(defer, resolve, reject) );
  }

  processSigningout(defer, resolve, reject) {
    this.clearLocalSession()
    .then(() => {
      this.emit('unauthenticated');
      if (defer) {
        defer(undefined).then(() => resolve(undefined)).catch(reject);
      } else {
        resolve(undefined);
      }
    })
    .catch(reject);
  }

  signinLocally(defer) {
    return new Promise( (resolve, reject) => {
      if (typeof(Storage) === "undefined") {
        reject("No Web Storage support");
      }
      const session = JSON.parse(localStorage.getItem(this.get('session')));
      if (session && session.user && session.token) {
        this.processSignedIn({ session }, defer, resolve, reject);
      } else {
        this.emit('unauthenticated');
        resolve(undefined);
      }
    })
  }

  clearLocalSession() {
    return new Promise((resolve, reject) => {
      this.set({ user: undefined, token: undefined });
      if (typeof(Storage) === "undefined") reject("No Web Storage support");
      localStorage.removeItem(this.get('session'));
      resolve();
    });
  }

  setLocalSession(session) {
    return new Promise((resolve, reject) => {
      this.set({ ...session });    // {user, token}
      if (typeof(Storage) === "undefined") {
        reject("No Web Storage support");
      }
      localStorage.setItem(this.get('session'), JSON.stringify(session));
      resolve();
    });
  }

  getLocalSession() {
    if (typeof(Storage) === "undefined") throw Error ("No Web Storage support");
    return JSON.parse(localStorage.getItem(this.get('session')));
  }

  _setTimeout(reject) {
    const timeout = this.get('timeout') || this.get('timeout');
    this._to = setTimeout(() => {
      this.iframe.close();
      reject && reject('503 Request Timeout. No response from the server');
    }, timeout);
  }

  _clearTimeout() {
    clearTimeout(this._to);
  }

}
