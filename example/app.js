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
  baseurl: 'http://localhost:3100'
})

acc
  .on('authenticating', () => console.log('authenticating...'))
  .on('authenticated', user => console.log(`authenticated: user: ${user}`))
  .on('unauthenticated', () => console.log('unauthenticated'))

document.addEventListener("DOMContentLoaded", (event) => {
  const btn = ['sso', 'lso', 'signup', 'signin', 'signout']
  btn.forEach( fn => $(fn).onclick = function() {
    acc[fn](done[fn])
    .then(user => console.log(`${fn.toUpperCase()} Promise Resolve. \nUser: ${JSON.stringify(user)}`))
    .catch( err =>  console.log(`${fn.toUpperCase()} Promise Reject. Error: ${err}`))
  })
}, false)

function $(id) {
  return document.getElementById(id)
}
