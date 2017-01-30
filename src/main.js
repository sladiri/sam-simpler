import {juxt, pipe, curry, __} from 'ramda'
import {render} from 'inferno'
import h from 'inferno-hyperscript'
import uuid from 'uuid/v4'

const model = {
  lastActionID: undefined,
  actionID: undefined,
  value: undefined,
}

const propose = model => input => {
  console.log('model', input)
  model.lastActionID = input.actionID
  model.actionID = uuid()
  model.value = input.value || model.value
  model.value += input.increment || 0
  state(model)
}

const actions = {
  setValue (value) {
    propose(model)({value, actionID: model.actionID})
  },
  increment () {
    propose(model)({increment: 1, actionID: model.actionID})
  },
}

const stateRepresentation = vm => {
  return h('div', [
    h('h1', `Hey ${vm.value}`),
    h('p', `Last actionID: [${vm.lastActionID}]`),
    h('p', `ActionID: [${vm.actionID}]`),
    h('button', {
      onclick (event) {
        actions.setValue(vm.value + 1)
      },
    }, 'Set Value'),
    h('button', {
      onclick (event) {
        actions.increment()
      },
    }, 'Increment'),
  ])
}

const nap = model => {
  if (model.value === undefined) { actions.setValue(1) }
}

const state = juxt([
  pipe(
    stateRepresentation,
    curry(render)(__, document.getElementById('root')),
    ),
  nap,
])

state(model)
