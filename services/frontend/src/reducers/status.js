import * as types from '../actions/actionTypes';

const initialStatus = {
  height: false
}

export default function preferences(state = initialStatus, action) {
  switch(action.type) {
    case types.SET_STATUS:
      return Object.assign({}, state, action.payload)
    default:
      return state
  }
}
