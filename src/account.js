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

  sso(done) {
    return new Promise( (resolve, reject) => {
      this.emit('authenticating');
      this._setTimeout(done, reject);
      this.iframe.open({
        path: '/session',
        query: { app: this.get('app') },
        onLoaded: () => this._clearTimeout(),
        done: (data) => this.onSSOFormResolved(data, done, resolve, reject),
      })
    })
  }

  onSSOFormResolved(data, done, resolve, reject) {
    if (data && data.status == 200) {
      this.processSignedIn(data, done, resolve, reject);
    } else if (data && data.status == 404) {
      // process signout, session should be null
      this.processSigningout(done, resolve, reject);
    } else {
      // sso required data to be returned either 200 or 404
      // if reach here, mean wrong in account-server configuration for sso
      done && done('# Error in SSO: something wrong in account-server configuration');
      reject('# Error in SSO: something wrong in account-server configuration');
    }
  }

  signup(done) {
    return new Promise( (resolve, reject) => {
      this._setTimeout(done, reject);
      this.iframe.open({
        path: '/form',
        query: { name: 'signup', app: this.get('app') },
        props: { display: 'block' },
        onLoaded: () => this._clearTimeout(),
        done: (data) => this.onAuthenFormResolved(data, done, resolve, reject, 'SIGN-UP'),
      })
    })
  }

  signin(done) {
    return new Promise( (resolve, reject) => {
      this._setTimeout(done, reject);
      this.iframe.open({
        path: '/form',
        query: { name: 'signin', app: this.get('app'), height: 415 },
        props: { display: 'block' },
        onLoaded: () => this._clearTimeout(),
        done: (data) => this.onAuthenFormResolved(data, done, resolve, reject, 'SIGN-IN'),
      })
    })
  }

  processSignedIn(data, done, resolve, reject) {
    this.setLocalSession(data.session)
    .then(() => {
      this.emit('authenticated', data.session.user);
      done && done(null, data.session.user);
      resolve(data.session.user);
    })
    .catch(err => reject(err));
  }

  onAuthenFormResolved(data, done, resolve, reject, processName) {
    if (data && data.status == 200) {
      this.processSignedIn(data, done, resolve, reject);
    } else if (data && data.code === 'iframe.close') {
      done && done(null, false);
      reject(false);
    } else {
      // if reach here, mean wrong in account-server configuration for sign-in
      done && done(`# Error in ${processName}: something wrong in account-server configuration`);
      reject(`# Error in ${processName}: something wrong in account-server configuration`);
    }
  }

  signout(done) {
    return new Promise( (resolve, reject) => {
      this._setTimeout(done, reject);
      this.iframe.open({
        path: '/form',
        query: { name: 'signout', app: this.get('app'), sid: this.getLocalSession().sid },
        onLoaded: () => this._clearTimeout(),
        done: (data) => this.onSignoutFormResolved(data, done, resolve, reject),
      })
    })
  }

  onSignoutFormResolved(data, done, resolve, reject) {
    if (data && data.status == 200) {
      this.processSigningout(done, resolve, reject);
    } else {
      // if reach here, mean wrong in account-server configuration for signout
      done && done(`# Error in SIGN-OUT: received ${data && data.status}`);
      reject(`# Error in SIGN-OUT: received ${data && data.status}`);
    }
  }

  signoutLocally(done) {
    return new Promise((resolve, reject) => this.processSigningout(done, resolve, reject) );
  }

  processSigningout(done, resolve, reject) {
    this.clearLocalSession()
    .then(() => {
      this.emit('unauthenticated');
      done && done(null, undefined);
      resolve(undefined);
    })
    .catch(err => {
      done && done(err);
      reject(err);
    });
  }

  signinLocally(done) {
    return new Promise( (resolve, reject) => {
      if (typeof(Storage) === "undefined") {
        // Sorry! No Web Storage support..
        done && done("No Web Storage support");
        reject("No Web Storage support");
      }
      const session = JSON.parse(localStorage.getItem(this.get('session')));
      if (session && session.user && session.token) {
        this.processSignedIn({ session }, done, resolve, reject);
      } else {
        this.emit('unauthenticated');
        done && done(404, undefined);
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
      if (typeof(Storage) === "undefined") reject("No Web Storage support");
      localStorage.setItem(this.get('session'), JSON.stringify(session));
      resolve();
    });
  }

  getLocalSession() {
    if (typeof(Storage) === "undefined") throw Error ("No Web Storage support");
    return JSON.parse(localStorage.getItem(this.get('session')));
  }

  _setTimeout(done, reject) {
    const timeout = this.get('timeout') || this.get('timeout');
    this._to = setTimeout(() => {
      this.iframe.close();
      done && done('503 Request Timeout. No response from the server', null);
      reject && reject('503 Request Timeout. No response from the server');
    }, timeout);
  }

  _clearTimeout() {
    clearTimeout(this._to);
  }

}
