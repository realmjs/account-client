"use strict"

import AccountClient from '../src/account';
jest.mock('../src/iframe');
import Iframe from '../src/iframe';

const SESSION = '__r_s_sess_';

beforeEach(() => {
  Iframe.mockClear();
  localStorage.removeItem(SESSION);
});

test('can create accountClient object', () => {
  expect(new AccountClient({ app: 'test', baseurl: '/test', session: SESSION })).toBeInstanceOf(AccountClient);
});


test('should throw error if missing baseurl or app when creating new accountClient object', () => {
  expect(() => new AccountClient()).toThrow();
  expect(() => new AccountClient({ baseurl: '/test' })).toThrow();
  expect(() => new AccountClient({ app: 'test' })).toThrow();
  expect(() => new AccountClient({ app: 'test', baseurl: '/test' })).toThrow();
});


test('can set and get prop of accountClient object', () => {
  const accountClient = new AccountClient({ app: 'test', baseurl: '/test', session: SESSION });
  expect(accountClient.get('app')).toMatch('test');
  expect(accountClient.get('baseurl')).toMatch('/test');
  accountClient.set({ 'app': 'dev'});
  expect(accountClient.get('app')).toMatch('dev');
});

/* Setup utility for testing authentication API */


function getMockAccountInstance(mockData) {
  expect(Iframe).not.toHaveBeenCalled();
  const accountClient = new AccountClient({ app: 'test', baseurl: 'test', session: SESSION });
  expect(Iframe).toHaveBeenCalledTimes(1);

  const mockIframeInstance = Iframe.mock.instances[0];
  mockIframeInstance.open.mockImplementation(({ done })=> done(mockData));

  return accountClient;
}

function testAuthentication(method, event, mockData) {
  const mockCallback = jest.fn();
  const accountClient = getMockAccountInstance(mockData);
  accountClient.on(event, mockCallback);
  return accountClient[method]().then( data => {
    expect(data).toEqual(mockData.session && mockData.session.user || undefined);
    expect(localStorage.getItem(SESSION)).toBe(mockData.session && JSON.stringify(mockData.session) || null);
    expect(mockCallback.mock.calls.length).toBe(1);
    expect(mockCallback.mock.calls[0][0]).toBe(mockData.session && mockData.session.user || undefined);
  });
}

/* Test Sign-in */

test('can sign-in successfully and trigger authenticated event when call accountClient.signin', () => {
  return testAuthentication('signin', 'authenticated', { status: 200, session: { user: 'tester' } });
});

test('should reject falsy if sign-in form is closed', () => {
  const accountClient = getMockAccountInstance({ code: 'iframe.close' });
  return accountClient.signin().catch(err => expect(err).toBeFalsy());
});

test('should reject error if sign-in unsuccessfully due to server misconfiguration', () => {
  const accountClient = getMockAccountInstance();
  return accountClient.signin().catch(err => expect(err).toMatch('Error'));
});

/* Test SSO */

test('can sso successfully and trigger authenticated event when call accountClient.sso', () => {
  return testAuthentication('sso', 'authenticated', { status: 200, session: { user: 'tester', token: 'token' } });
});

test('can sso successfully and trigger unauthenticated event when call accountClient.sso', () => {
  return testAuthentication('sso', 'unauthenticated', { status: 404 });
});

test('should reject error if sso unsuccessfully due to server misconfiguration', () => {
  const accountClient = getMockAccountInstance();
  return accountClient.sso().catch(err => expect(err).toMatch('Error'));
});

/* Test Sign-up */

test('can sign-up successfully and trigger authenticated event when call accountClient.signup', () => {
  return testAuthentication('signup', 'authenticated', { status: 200, session: { user: 'tester', token: 'token' } });
});

test('should reject falsy if sign-up form is closed', () => {
  const accountClient = getMockAccountInstance({ code: 'iframe.close' });
  return accountClient.signup().catch(err => expect(err).toBeFalsy());
});

test('should reject error if sign-up unsuccessfully due to server misconfiguration', () => {
  const accountClient = getMockAccountInstance();
  return accountClient.signup().catch(err => expect(err).toMatch('Error'));
});

/* test sign-out */

test('can signout successfully and trigger unauthenticated event', () => {
  localStorage.setItem(SESSION, 'session');
  return testAuthentication('signout', 'unauthenticated', { status: 200 } );
});

test('should reject error if sign-out unsuccessfully due to server misconfiguration', () => {
  const accountClient = getMockAccountInstance();
  return accountClient.signout().catch(err => expect(err).toMatch('Error'));
});

/* Special test for case of No Web Storage */

describe('Special test cases for No Web Storage', () => {

  const __Storage = Storage;

  beforeEach(() => Storage = undefined );
  afterEach(() => window.Storage = __Storage);

  test('can throw error if no web storage when sso', () => {
    const accountClient = getMockAccountInstance({ status: 404 });
    return accountClient.sso().catch(err => expect(err).toMatch('No Web Storage support'));
  });

  test('can throw error if no web storage when signout', () => {
    const accountClient = getMockAccountInstance({ status: 200 });
    return accountClient.signout().catch(err => expect(err).toMatch('No Web Storage support'));
  });

  test('can throw error if no web storage when signin', () => {
    const accountClient = getMockAccountInstance({ status: 200 });
    return accountClient.signin().catch(err => expect(err).toMatch('No Web Storage support'));
  });

});
