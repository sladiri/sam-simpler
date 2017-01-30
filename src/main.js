import {juxt, pipe, curry, __} from 'ramda'
import {render} from 'inferno'
import h from 'inferno-hyperscript'
import uuid from 'uuid/v4'

const model = {
  value: undefined,
  error: undefined,
}

const propose = model => input => {
  model.error = null

  console.log('model', input)

  model.value = input.value || model.value
  model.value += input.increment || 0

  model.error = Math.random() >= 0.5 ? `Hey, I am an error! (${Date.now()})` : null

  state(model)
}

let lastActionID
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
      propose(model)({value})
    }, 2000)
    state(model, true)
  },
  increment ({actionID, allowedActions}) {
    if (!allowedActions.includes('increment')) {
      console.warn('increment not allowed', allowedActions)
      return
    }
    if (lastActionID === actionID) {
      console.warn('increment : lastActionID === actionID')
      return
    }
    lastActionID = actionID

    propose(model)({increment: 1})
  },
}

const stateRepresentation = ({model: vm, allowedActions, actionID}) => {
  return h('div', [
    h('h1', `Hey ${vm.value}`),
    vm.lastActionID ? h('p', `Last actionID: [${vm.lastActionID.substring(0, 7)}]`) : undefined,
    vm.actionID ? h('p', `ActionID: [${vm.actionID.substring(0, 7)}]`) : undefined,
    h('button', {
      onclick (event) {
        actions.setValue({actionID, allowedActions, value: vm.value + 1})
      },
      disabled: !allowedActions.includes('setValue'),
    }, 'Set Value'),
    h('button', {
      onclick (event) {
        actions.increment({actionID, allowedActions})
      },
      disabled: !allowedActions.includes('increment'),
    }, 'Increment'),
    h('br'),
    h('input', {
      placeholder: 'enter here',
    }),
    vm.error
      ? h('div', [
        h('br'),
        h('p', vm.error),
      ])
      : undefined,
  ])
}

const nap = ({model, allowedActions, actionID, stop}) => {
  if (!stop && model.value === undefined) { actions.setValue({actionID, allowedActions, value: 1}) }
}

const state = (model, stop) => {
  console.log('state', model, stop)
  const allowedActions = stop ? [] : Object.keys(actions)

  const actionID = uuid()

  return juxt([
    pipe(
      stateRepresentation,
      curry(render)(__, document.getElementById('root')),
      ),
    nap,
  ])({model, allowedActions, actionID, stop})
}

state(model)
