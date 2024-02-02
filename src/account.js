"use strict"

import endpoint from '@realmjs/account-endpoint'

import { isNotObject } from './util'
import Iframe from './iframe'

export default class AccountClient {

  props = {}
  events = {
    'authenticated': [],
    'unauthenticated': [],
  }

  constructor(props) {
    this.validateProps(props)
    this.initProps(props)
    this.iframe = new Iframe({ baseurl: this.props.baseurl })
    this._eventHandlers = {}
    /* in case these methods are called by an event such as onClick, need to remain 'this' context */
    // const fn = ['signup']
    // fn.forEach(method => this[method] = this[method].bind(this))
  }

  validateProps(props) {
    if (!props.baseurl) {
      throw new Error('missing prop: baseurl')
    }
    if (!props.app) {
      throw new Error('missing prop: app')
    }
    if (!props.session) {
      throw new Error('missing prop: session')
    }
  }

  initProps(props) {
    this.set(props)
    if (!this.props.timeout) { this.props.timeout = 50000 }
    if (!this.props.cookie) { this.props.cookie = false }
  }

  set(props) {
    if (isNotObject(props)) {
      throw new Error('Require props to be an Object')
    }
    for (let p in props) {
      this.props[p] = props[p]
    }
    return this
  }

  get(prop) {
    return this.props[prop]
  }

  on(eventName, eventHandler) {
    if (this.events[eventName]) {
      this.events[eventName].push(eventHandler)
    } else {
      console.warn(`No support event ${eventName}`)
    }
    return this
  }

  off(eventName, eventHandler) {
    if (eventHandler) {
      if (this.events[eventName]) {
        const index = this.events[eventName].findIndex(handler => handler === eventHandler)
        (index != -1) && this.events[eventName].splice(index, 1)
      }
    } else {
      this.events[eventName] = []
    }
    return this
  }

  emit(eventName, ...args) {
    if (this.events[eventName]) {
      this.events[eventName].forEach(handler => handler.call(this, ...args));
    }
    return this;
  }


  signup() {
    return new Promise( (resolve, reject) => {
      this._setRejectTimeout(reject)
      this.iframe.open({
        path: endpoint.Form.Signup,
        query: { a: this.get('app') },
        props: { display: 'block' },
        onLoaded: () => this._clearRejectTimeout(),
        onClose: resolve,
        onFinish: resolve,
      })
    })
  }

  signin() {
    return new Promise( (resolve, reject) => {
      this._setRejectTimeout(reject)
      this.iframe.open({
        path: endpoint.Form.Signin,
        query: { a: this.get('app') },
        props: { display: 'block' },
        onLoaded: () => this._clearRejectTimeout(),
        onClose: resolve,
        onFinish: (session) => {
          this.set({ ...session })
          localStorage && localStorage.setItem(this.get('session'), JSON.stringify(session))
          this.emit('authenticated', session)
          resolve(session)
        },
      })
    })
  }

  signout() {
    return new Promise( (resolve, reject) => {
      this._setRejectTimeout(reject)
      this.iframe.open({
        path: endpoint.Form.Signout,
        query: { a: this.get('app'), t: this.get('token') },
        onLoaded: () => this._clearRejectTimeout(),
        onFinish: () => {
          this.set({ user: undefined, token: undefined })
          localStorage && localStorage.removeItem(this.get('session'))
          this.emit('unauthenticated')
          resolve()
        },
      })
    })
  }

  sso() {
    return new Promise( (resolve, reject) => {
      const session = JSON.parse(localStorage.getItem(this.get('session')));
      if (session?.user && session?.token) {
        this.set({ ...session })
        this.emit('authenticated', session)
        resolve(session)
      } else {
        this._setRejectTimeout(reject)
        this.iframe.open({
          path: endpoint.SSO,
          query: { a: this.get('app') },
          props: { display: 'block' },
          onLoaded: () => this._clearRejectTimeout(),
          onFinish: (session) => {
            if (session.error && session.error === 404) {
              this.emit('unauthenticated')
              resolve(undefined)
            } else if (session.user && session.token) {
              this.set({ ...session })
              localStorage && localStorage.setItem(this.get('session'), JSON.stringify(session))
              this.emit('authenticated', session)
              resolve(session)
            } else {
              this.emit('unauthenticated')
              reject(session)
            }
          },
        })
      }
    })
  }

  changePassword() {
    return new Promise( (resolve, reject) => {
      if (!this.get('token')) {
        reject(new Error('Need to sign in before change password'))
        return
      }
      this._setRejectTimeout(reject)
      this.iframe.open({
        path: endpoint.Form.ChangePassword,
        query: { a: this.get('app'), t: this.get('token') },
        props: { display: 'block' },
        onLoaded: () => this._clearRejectTimeout(),
        onClose: resolve,
        onFinish: resolve,
      })
    })
  }

  query(uid) {
    return new Promise( (resolve, reject) => {
      this._setRejectTimeout(reject)
      this.iframe.open({
        path: endpoint.Form.QueryAccount,
        query: { a: this.get('app'), u: uid },
        props: { display: 'block' },
        onLoaded: () => this._clearRejectTimeout(),
        onClose: resolve,
        onFinish: resolve,
      })
    })
  }

  _setRejectTimeout(reject) {
    const timeout = this.get('timeout')
    this.to = setTimeout(() => {
      this.iframe.close()
      reject && reject('503 Request Timeout')
    }, timeout)
  }

  _clearRejectTimeout() {
    clearTimeout(this.to)
  }

}
