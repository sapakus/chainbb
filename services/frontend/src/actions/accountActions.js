import * as types from './actionTypes';
import steem from 'steem'
import store from 'store'

export function fetchAccount() {
  return dispatch => {
    let payload = {
      isUser: (typeof store.get('account') !== 'undefined'),
      name: store.get('account'),
      key: store.get('key'),
    }
    if(payload.isUser) {
      steem.api.getAccounts([payload.name], function(err, data) {
        payload['data'] = data[0]
        dispatch(fetchAccountResolved(payload))
      })
    } else {
      dispatch(fetchAccountResolved(payload))
    }
  }
}

export function fetchAccountResolved(payload) {
  return {
    type: types.ACCOUNT_FETCH,
    payload: payload
  }
}

export function signoutAccount() {
  return {type: types.ACCOUNT_SIGNOUT}
}

export function signinAccount(account, key, data) {
  let payload = {
    account: account,
    key: key,
    data: data
  }
  return {type: types.ACCOUNT_SIGNIN, payload: payload}
}
