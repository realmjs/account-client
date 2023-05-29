"use strict"

import { isObject } from './util'

export default class Iframe {
  constructor(props) {
    if (!(props && props.baseurl)) {
      throw new Error('Iframe instance requires baseurl!');
    }
    const { baseurl } = props;
    this.baseurl = baseurl.replace(/\/+$/,'');
    this._lazyFn = [];
    this._onIframeFinish = null;
    this._onIframeLoaded = null;
    this._iframeClosed = true;
    this._iframe = null;
    this.messageHandler = {
      'iframe.loaded': this.handleIframeMessage('Loaded'),
      'iframe.close': this.handleIframeMessage('Close'),
      'iframe.done': this.handleIframeMessage('Done'),
    };

    document.addEventListener("DOMContentLoaded", this.processAfterDomReady.bind(this), false)
    window.addEventListener("message", this.processIframeMessage.bind(this), false)
  }

  processAfterDomReady() {
    this._lazyFn.forEach(f => f.fn(...f.args));
    this._lazyFn = [];
  }

  processIframeMessage(event) {
    if (event.origin !== this.baseurl)
      return;
    const {code, ...data} = event.data;
    this.messageHandler[code](data);
  }

  handleIframeMessage(message) {
    return this[`handleMessageIframe${message}`].bind(this);
  }

  handleMessageIframeLoaded(data) {
    if (!this._iframe)
      return;
    this._iframe.style['height'] = data.height + 'px';
    this._iframe.style['width'] = '95%';
    this._iframe.style['max-width'] = data.width + 'px';
    this._onIframeLoaded && this._onIframeLoaded();
  }

  handleMessageIframeClose() {
    this._closeIframe();
  }

  handleMessageIframeDone(data) {
    this._closeIframe();
    this._onIframeFinish && this._onIframeFinish(data);
    // execute other iframe.open in queue if any
    if (this._lazyFn.length > 0) {
      const f = this._lazyFn.pop();
      f.fn(...f.args);
    }
  }

  open({path, query, props, onLoaded, onClose, onFinish}) {
    this._lazyExecute(function({path, query, props, onClose, onFinish}) {
      const url = this._constructURL(path, query);
      this._openIframe(url, props);
      this._onIframeLoaded = onLoaded;
      this._onIframeFinish = onFinish;
    }, {path, query, props, onClose, onFinish})
  }

  close() {
    this._closeIframe();
  }

  _openIframe(url, props) {
    this._iframeClosed = false;
    /* create root container if not created */
    let div = document.getElementById(`__${this.baseurl}__container__`);
    if (!div) {
      div = document.createElement('div');
      div.setAttribute('id', `__${this.baseurl}__container__`);
      document.getElementsByTagName('body')[0].appendChild(div);
    }
    /* create iframe */
    const iframe = document.createElement('iframe');
    iframe.src = url;
    iframe.setAttribute('id', `__${this.baseurl}__iframe__`);
    if (props) {
      for (let attr in props) {
        if (attr === 'display') { continue }
        iframe.style[attr] = props[attr];
      }
    }
    iframe.style.display = props && props.display ? props.display : 'none';
    iframe.style.border = 'none';
    iframe.style.margin = '45px auto';
    iframe.style.width = 0;
    iframe.style.height = 0;
    /* create wrapper for iframe */
    const wrapper = document.createElement('div');
    wrapper.style.position = 'fixed';
    wrapper.style.width = '100%';
    wrapper.style.height = '100%';
    wrapper.style.top = 0;
    wrapper.style.zIndex = 1;
    if (props && props.display) {
      wrapper.style['background-color'] = 'rgba(0,0,0,0.5)';
    }
    /* allow iframe to be scrolled */
    wrapper.style['-webkit-overflow-scrolling'] = 'touch';
    wrapper.style['overflow-y'] = 'scroll';
    /* append child to parent */
    wrapper.appendChild(iframe);
    div.appendChild(wrapper);
    this._iframe = iframe;
  }

  _closeIframe() {
    const div = document.getElementById(`__${this.baseurl}__container__`);
    div.innerHTML = '';
    this._iframeClosed = true;
    this._iframe = null;
  }

  _lazyExecute(fn, ...args) {
    fn = fn.bind(this);
    if (this._isDomContentLoaded() && this._iframeClosed) {
      fn(...args);
    } else {
      this._lazyFn.push({fn, args});
    }
  }

  _isDomContentLoaded() {
    return document.readyState === "complete" || document.readyState === "loaded";
  }

  _constructURL(path, query) {
    path = path.replace(/^\/+|\/+$/gm,'').replace(/\/\//gm,'/');
    if (isObject(query)) {
      let _query = '?'
      for (let t in query) {
        _query += `${t}=${query[t]}&`;
      }
      _query = _query.replace(/&+$/,"");
      return `${this.baseurl}/${path}${_query}`;
    } else {
      return `${this.baseurl}/${path}`;
    }
  }

}
