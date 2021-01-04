"use strict"

const done = {
  sso(err, user) {
    console.log(`SSO callback is called with Error code: ${err}`)
    console.log(user)
  },
  lso(err, user) {
    console.log(`LSO callback is called with Error code: ${err}`)
    console.log(user)
  },
  signup(err, user) {
    console.log(`SignUp callback is called with Error code: ${err}`)
    console.log(user)
  },
  signin(err, user) {
    console.log(`SignIn callback is called with Error code: ${err}`)
    console.log(user)
  },
  signout(err, user) {
    console.log(`SignOut callback is called with Error code: ${err}`)
    console.log(user)
  },
}


import AccountClient from '../src/account'

const acc = new AccountClient({
  app: 'dev',
  baseurl: 'http://localhost:3100',
  session: '_r_s_sess_',
});

acc
  .on('authenticating', () => { console.log('--> authenticating...'); updateUserInfo(null); })
  .on('authenticated', user => { console.log(`--> authenticated: user: ${user}`); updateUserInfo(user); })
  .on('unauthenticated', () => { console.log('--> unauthenticated'); updateUserInfo(undefined); })

document.addEventListener("DOMContentLoaded", (event) => {
  const btn = ['sso', 'lso', 'signup', 'signin', 'signout'];
  btn.forEach( fn => $(fn).onclick = function() {
    acc[fn](done[fn])
    .then(user => console.log(`${fn.toUpperCase()} Promise Resolve. \nUser: ${JSON.stringify(user)}`))
    .catch( err =>  console.log(`${fn.toUpperCase()} Promise Reject. Error: ${err}`))
  })
}, false);

function $(id) {
  return document.getElementById(id);
}

function updateUserInfo(user) {
  $("user.fullName").innerHTML = user && user.profile.fullName || 'No signed in user';
  $("user.email").innerHTML = user && user.profile.email[0] || '';
}
