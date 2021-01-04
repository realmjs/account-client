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
        done: (data) => {
          if (data && data.status == 200) {
            this.processSignedIn(data, done, resolve);
          } else if (data && data.status == 404) {
            // process signout, session should be null
            this.signoutLocally();
            done && done(404, undefined);
            resolve(undefined);
          } else {
            // sso required data to be returned either 200 or 404
            // if reach here, mean wrong in account-server configuration for sso
            done && done('# Error in SSO: something wrong in account-server configuration');
            reject('# Error in SSO: something wrong in account-server configuration');
          }
        }
      })
    })
  }

  signup(done) {
    return new Promise( (resolve, reject) => {
      this._setTimeout(done, reject);
      this.iframe.open({
        path: '/form',
        query: { name: 'signup', app: this.get('app') },
        props: { display: 'block' },
        onLoaded: () => this._clearTimeout(),
        done: (data) => {
          if (data && data.status == 200) {
            this.processSignedIn(data, done, resolve);
          } else if (data && data.code === 'iframe.close') {
            done && done(null);
            reject(false);
          } else {
            // if reach here, mean wrong in account-server configuration for sign-up
            done && done('# Error in SIGN UP: something wrong in account-server configuration');
            reject('# Error in  SIGN UP: something wrong in account-server configuration');
          }
        }
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
        done: (data) => {
          if (data && data.status == 200) {
            this.processSignedIn(data, done, resolve);
          } else {
            // this case is actually not happen because SignIn Form never returned an error
            // in fact, error will be display in SignIn form
            // code here is just for logical thinking
            done && done(data);
            reject(data);
          }
        }
      })
    })
  }

  signout(done) {
    return new Promise( (resolve, reject) => {
      this._setTimeout(done, reject);
      this.iframe.open({
        path: '/form',
        query: { name: 'signout', app: this.get('app') },
        onLoaded: () => this._clearTimeout(),
        done: (data) => {
          this.iframe.close();
          if (data && data.status == 200) {
            this.signoutLocally();
            done && done(null, undefined);
            resolve(undefined);
          } else {
            done && done(data);
            reject(data);
          }
        }
      })
    })
  }

  signoutLocally() {
    this.clearLocalSession();
    this.emit('unauthenticated');
    return this;
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
        this.processSignedIn({ session }, done, resolve);
      } else {
        this.emit('unauthenticated');
        done && done(404, undefined);
        resolve(undefined);
      }
    })
  }

  clearLocalSession() {
    this.set({ user: undefined, token: undefined });
    if (typeof(Storage) === "undefined") {
      // Sorry! No Web Storage support..
      console.error("No Web Storage support");
      return;
    }
    localStorage.removeItem(this.get('session'));
    return this;
  }

  setLocalSession(session) {
    this.set({ ...session });    // {user, token}
    if (typeof(Storage) === "undefined") {
      // Sorry! No Web Storage support..
      console.error("No Web Storage support");
      return;
    }
    localStorage.setItem(this.get('session'), JSON.stringify(session));
    return this;
  }

  getLocalSession() {
    if (typeof(Storage) === "undefined") {
      // Sorry! No Web Storage support..
      console.error("No Web Storage support");
      return;
    }
    return JSON.parse(localStorage.getItem(this.get('session')));
  }

  updateLocalSession(key, data) {
    const session = this.getLocalSession();
    session[key] = data;
    this.setLocalSession(session);
    return this;
  }

  processSignedIn(data, done, resolve) {
    this.setLocalSession(data.session);
    this.emit('authenticated', data.session.user);
    done && done(null, data.session.user);
    resolve(data.session.user);
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

  /* in future, set local cookie may be needed for server-side rendering */

  // _setCookie(cname, cvalue, exdays) {
  //   let expires = exdays ? `expires=${exdays}` : '';
  //   document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
  //   return this
  // }

  // _clearCookie(cname) {
  //   const expires = 'Thu, 01 Jan 1970 00:00:00 UTC';
  //   this._setCookie(cname, '', expires)
  //   return this
  // }

}
