# @realmjs/account-client

**A JavaScript library for handling authentication with a remote server compatible with @ralmjs/account-restapi**

## Introduction

`AccountClient` is a JavaScript class that provides methods for handling authentication operations, such as signing up, signing in, signing out, and more.

## Installation

To use `AccountClient` in your project, you can install it via npm:

```bash
npm install @realmjs/account-client --save
```

## Usage

```javascript
import AccountClient from '@realmjs/account-client';

// Initialize AccountClient with required properties
const accountClient = new AccountClient({
  baseurl: 'https://your-auth-server.com',
  app: 'your-app-id',
  session: 'your-session-key',
});

// Event handling example
accountClient.on('authenticated', (session) => {
  console.log('User authenticated:', session);
});

// Sign up example
accountClient.signup()
  .then(() => {
    console.log('Sign up successful');
  })
  .catch((error) => {
    console.error('Sign up failed:', error);
  });

// Sign in example
accountClient.signin()
  .then((session) => {
    console.log('Sign in successful:', session);
  })
  .catch((error) => {
    console.error('Sign in failed:', error);
  });

// Sign out example
accountClient.signout()
  .then(() => {
    console.log('Sign out successful');
  })
  .catch((error) => {
    console.error('Sign out failed:', error);
  });

// Single Sign-On (SSO) example
accountClient.sso()
  .then((session) => {
    console.log('SSO successful:', session);
  })
  .catch((error) => {
    console.error('SSO failed:', error);
  });

// Other methods (changePassword, query) can be used similarly
```

## API Reference

### Constructor

```javascript
const accountClient = new AccountClient({
  baseurl: 'https://your-auth-server.com',
  app: 'your-app-id',
  session: 'your-session-key',
});
```

### Methods

- `signup()`: Initiates the sign-up process.
- `signin()`: Initiates the sign-in process.
- `signout()`: Initiates the sign-out process.
- `sso()`: Initiates the Single Sign-On (SSO) process.
- `changePassword()`: Initiates the password change process.
- `query(uid)`: Queries an account by UID.

### Events

- `on(eventName, eventHandler)`: Adds an event listener.
- `off(eventName, eventHandler)`: Removes an event listener.
- `emit(eventName, ...args)`: Emits an event.

## Configuration

The `AccountClient` instance requires the following properties during initialization:

- `baseurl`: The base URL of the authentication server.
- `app`: The unique identifier for your application.
- `session`: The key used for storing session information.

## License

This library is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
