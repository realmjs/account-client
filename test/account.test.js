"use strict"

import AccountClient from '../src/account';
jest.mock('../src/iframe');
import Iframe from '../src/iframe';



beforeEach(() => {
  Iframe.mockClear();
  localStorage.removeItem(SESSION);
});

test('can create accountClient object', () => {
  expect(new AccountClient({ app: 'test', baseurl: '/test'})).toBeInstanceOf(AccountClient);
});


test('should throw error if missing baseurl or app when creating new accountClient object', () => {
  expect(() => new AccountClient()).toThrow();
  expect(() => new AccountClient({ baseurl: '/test'})).toThrow();
  expect(() => new AccountClient({ app: 'test'})).toThrow();
});


test('can set and get prop of accountClient object', () => {
  const accountClient = new AccountClient({ app: 'test', baseurl: '/test'});
  expect(accountClient.get('app')).toMatch('test');
  expect(accountClient.get('baseurl')).toMatch('/test');
  accountClient.set({ 'app': 'dev'});
  expect(accountClient.get('app')).toMatch('dev');
});

/* Setup utility for testing authentication API */

const SESSION = '__r_s_sess_' // hard-code should be removed

function getMockAccountInstance(mockData) {
  expect(Iframe).not.toHaveBeenCalled();
  const accountClient = new AccountClient({ app: 'test', baseurl: 'test' });
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

test('should reject if sign-in unsuccessfully', () => {
  const accountClient = getMockAccountInstance({ status: 401 });
  return accountClient.signin().catch(err => expect(err).toEqual({ status: 401 }));
});

/* Test SSO */

test('can sso successfully and trigger authenticated event when call accountClient.sso', () => {
  return testAuthentication('sso', 'authenticated', { status: 200, session: { user: 'tester', token: 'token' } });
});

test('should reject if sso unsuccessfully', () => {
  const accountClient = getMockAccountInstance({ status: 401 });
  return accountClient.sso().catch(err => expect(err).toEqual({ status: 401 }));
});

/* Test Sign-up */

test('can sign-up successfully and trigger authenticated event when call accountClient.signup', () => {
  return testAuthentication('signup', 'authenticated', { status: 200, session: { user: 'tester', token: 'token' } });
});

test('should reject if sign-up unsuccessfully', () => {
  const accountClient = getMockAccountInstance({ status: 401 });
  return accountClient.signup().catch(err => expect(err).toEqual({ status: 401 }));
});

/* test sign-out */

test('can signout successfully and trigger unauthenticated event', () => {
  localStorage.setItem(SESSION, 'session');
  return testAuthentication('signout', 'unauthenticated', { status: 200 } );
});
