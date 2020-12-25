"use strict"

import Iframe from '../src/iframe';

test('can create an ifame object', () => {
  expect(new Iframe({ baseurl: 'test'})).toBeInstanceOf(Iframe);
});

test('should throw error if missing baseurl when creating an ifame object', () => {
  expect(() => new Iframe()).toThrow();
});

test.only('can iframe object open an url', (done) => {

  const onLoadedMock = jest.fn();

  const baseurl = 'http://localhost';
  const iframe = new Iframe({ baseurl });

  document.dispatchEvent(new Event("DOMContentLoaded", { bubbles: true, cancelable: true }));

  const path = '/test';
  const query = { 'q': 'query' };
  const onDone = (data) => {
    expect(onLoadedMock).toHaveBeenCalledTimes(1);
    expect(data).toEqual({ code: 'iframe.done', status: 200 });
    done();
  };

  iframe.open({ path, query, onLoaded: onLoadedMock, done: onDone });

  const iframeElement = document.getElementById(`__${baseurl}__iframe__`);

  expect(iframeElement).toBeTruthy();

  /* hacking to workaround the issue of origin in jsdom */
  window.addEventListener('message', (event) => {
    if (event.origin === '') {
      event.stopImmediatePropagation();
      const eventWithOrigin = new MessageEvent('message', { data: event.data, origin: baseurl });
      window.dispatchEvent(eventWithOrigin);
    }
  });

  /* relay a message from parent */
  iframeElement.contentWindow.addEventListener("message", function(event) {
    window.parent.postMessage(event.data, baseurl);
  });

  iframeElement.contentWindow.postMessage({ code: 'iframe.loaded', height: 0, width: 0 }, baseurl);

  iframeElement.contentWindow.postMessage({ code: 'iframe.done', status: 200 }, baseurl);

});

test.only('can close an iframe', () => {

  const baseurl = 'http://localhost';
  const iframe = new Iframe({ baseurl });

  document.dispatchEvent(new Event("DOMContentLoaded", { bubbles: true, cancelable: true }));

  const path = '/test';
  const query = { 'q': 'query' };
  const onLoadedMock = jest.fn();
  iframe.open({ path, query, onLoaded: onLoadedMock, done: function(){} });

  const iframeElement = document.getElementById(`__${baseurl}__iframe__`);

  expect(iframeElement).toBeTruthy();

  /* hacking to workaround the issue of origin in jsdom */
  window.addEventListener('message', (event) => {
    if (event.origin === '') {
      event.stopImmediatePropagation();
      const eventWithOrigin = new MessageEvent('message', { data: event.data, origin: baseurl });
      window.dispatchEvent(eventWithOrigin);
    }
  });

  /* relay a message from parent */
  iframeElement.contentWindow.addEventListener("message", function(event) {
    window.parent.postMessage(event.data, baseurl);
  });

  iframeElement.contentWindow.postMessage({ code: 'iframe.close', height: 0, width: 0 }, baseurl);

  expect(iframeElement).toBeNull();

});
