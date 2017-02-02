/* global snabbt */
import {juxt, pipe, curry, __} from 'ramda'
import {render} from 'inferno'
import h from 'inferno-hyperscript'
import uuid from 'uuid/v4'
// import dynamics from 'dynamics.js'

const model = {
  value: undefined,
  error: undefined,
  pending: undefined,
}

const propose = model => input => {
  model.error = null

  // console.log('model', input)

  model.pending = input.pending
  model.value = input.value !== undefined ? input.value : model.value
  if (model.value !== undefined) { model.value += input.increment || 0 }

  // model.error = Math.random() >= 0.5 ? `Hey, I am an error! (${Date.now()})` : null

  state(model)
}

let lastActionID
let cancelledID
const actions = {
  setValue ({actionID, allowedActions, value}) {
    if (!allowedActions.includes('setValue')) {
      console.warn('setValue not allowed', allowedActions)
      return
    }

    if (lastActionID === actionID) {
      console.warn('setValue : lastActionID === actionID')
      return
    }
    lastActionID = actionID

    setTimeout(() => {
      if (cancelledID !== actionID) {
        propose(model)({value})
      }
    }, 2000)
    propose(model)({pending: true})
  },

  cancelSetValue ({actionID, allowedActions}) {
    if (!allowedActions.includes('cancelSetValue')) {
      console.warn('cancelSetValue not allowed', allowedActions)
      return
    }

    cancelledID = lastActionID
    propose(model)({pending: false})
    console.warn('cancelled action', cancelledID)
  },

  increment ({actionID, allowedActions, value}) {
    if (!allowedActions.includes('increment')) {
      console.warn('increment not allowed', allowedActions)
      return
    }
    if (lastActionID === actionID) {
      console.warn('increment : lastActionID === actionID')
      return
    }
    lastActionID = actionID

    propose(model)({increment: value})
  },
}

const stateRepresentation = ({vm, allowedActions, actionID}) => {
  return h('div', [
    h('h1#hey', `Hey ${vm.value}`),
    h('p', `ActionID: [${vm.actionID}]`),
    h('p', [
      vm.pending
        ? h('button', {
          onclick (event) {
            actions.cancelSetValue({actionID, allowedActions})
          },
          disabled: !allowedActions.includes('cancelSetValue'),
        }, 'Cancel')
        : h('button', {
          onclick (event) {
            actions.setValue({actionID, allowedActions, value: vm.value + 1})
          },
          disabled: !allowedActions.includes('setValue'),
        }, 'Set Value'),
      h('button', {
        onclick (event) {
          actions.increment({actionID, allowedActions, value: 1})
        },
        disabled: !allowedActions.includes('increment'),
      }, 'Increment'),
      h('button', {
        onclick (event) {
          actions.increment({actionID, allowedActions, value: -1})
        },
        disabled: !allowedActions.includes('increment'),
      }, 'Decrement'),
    ]),
    h('p', [
      h('input#inpu', {
        placeholder: 'enter here',
        style: {position: 'relative'},
      }),
    ]),
    h('p', [
      vm.error
        ? h('div', [
          h('br'),
          h('p', vm.error),
        ])
        : undefined,
    ]),
  ])
}

let inpu
// let hey
// const animatedOptions = {
//   change (animated, progress) {
//     hey.style.color = animated.colour
//     // inpu.style.top = `${animated.n * 20}vh`
//   },
// }
// const animated = {
//   n: 0,
//   colour: '#FF0000',
// }
const animate = ({vm}) => {
  // hey = hey || document.querySelector('#hey')
  inpu = inpu || document.querySelector('#inpu')
  // Slower than snabbt, but can animate anything.
  // dynamics.animate(animated, vm.animated, animatedOptions)
  snabbt(inpu, {
    position: [0, vm.animated.n * 150, 0, 0],
    easing: 'spring',
    springConstant: 0.1,
    springDeceleration: 0.8,
  })
}

const nap = ({vm, allowedActions, actionID}) => {
  if (!vm.pending && vm.value === undefined) {
    actions.setValue({actionID, allowedActions, value: 1})
  }
  if (!vm.pending && vm.value > 2) {
    actions.setValue({actionID, allowedActions, value: vm.value - 1})
  }
  if (!vm.pending && vm.value < -2) {
    actions.setValue({actionID, allowedActions, value: vm.value + 1})
  }
}

const state = model => {
  // console.log('state', model)

  const allowedActions = model.pending
    ? model.value === undefined || model.value > 2 || model.value < -2
      ? []
      : ['cancelSetValue']
    : model.value === undefined
      ? ['setValue']
      : Object.keys(actions)

  const actionID = model.pending ? null : uuid()

  model.actionID = model.pending ? 'pending' : actionID.substring(0, 7)

  const animated = {
    n: model.value || 0,
    colour: model.pending ? '#FF0000' : '#00FF00',
  }

  return juxt([
    pipe(
      stateRepresentation,
      curry(render)(__, document.getElementById('root')),
      ),
    animate,
    nap,
  ])({vm: {...model, ...{animated}}, allowedActions, actionID})
}

state(model)
