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


  state(model)
}

const actions = {
  setValue (allowedActions, value) {
    if (!allowedActions.includes('setValue')) {
      console.warn('setValue not allowed', allowedActions)
      return
    }

    setTimeout(() => {
      propose(model)({value})
    }, 2000)
  },
  increment (allowedActions) {
    if (!allowedActions.includes('increment')) {
      console.warn('increment not allowed', allowedActions)
      return
    }

    propose(model)({increment: 1})
  },
}

const stateRepresentation = vm => {
  const allowedActions = Object.keys(actions)
    .filter(action => action === 'setValue' || vm.value !== undefined)

  return h('div', [
    h('h1', `Hey ${vm.value}`),
    vm.lastActionID ? h('p', `Last actionID: [${vm.lastActionID.substring(0, 7)}]`) : undefined,
    vm.actionID ? h('p', `ActionID: [${vm.actionID.substring(0, 7)}]`) : undefined,
    h('button', {
      onclick (event) {
        actions.setValue(allowedActions, vm.value + 1)
      },
    }, 'Set Value'),
    h('button', {
      onclick (event) {
        actions.increment(allowedActions)
      },
    }, 'Increment'),
    h('br'),
    h('input', {
      placeholder: 'enter here',
    }),
    vm.error ? h('div', [
      h('br'),
      h('p', vm.error),
    ]) : undefined,
  ])
}

const nap = model => {
  if (model.value === undefined) { actions.setValue(['setValue'], 1) }
}

const state = model => {
  return juxt([
    pipe(
      stateRepresentation,
      curry(render)(__, document.getElementById('root')),
      ),
    nap,
  ])(model)
}

state(model)
