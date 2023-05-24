"use strict"

import { isNotObject } from './util'
import Iframe from './iframe'

export default class AccountClient {

  props = {}

  constructor(props) {
    this.validateProps(props)
    this.initProps(props)
    this.iframe = new Iframe({ baseurl: this.props.baseurl })
    this._eventHandlers = {}
    /* in case these methods are called by an event such as onClick, need to remain 'this' context */
    const fn = ['signup']
    fn.forEach(method => this[method] = this[method].bind(this))
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

  signup(defer) {
    return new Promise( (resolve, reject) => {
      this._setRejectTimeout(reject)
      this.iframe.open({
        path: '/form/signup/email',
        query: { a: this.get('app') },
        props: { display: 'block' },
        onLoaded: () => this._clearRejectTimeout(),
        onClose: resolve,
        onFinish: resolve,  // later resolve and invoke signin
      })
    })
  }

  _setRejectTimeout(callback) {
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
