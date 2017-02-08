import parentFactory, {actions as parentActions} from './parent'

const parentInstance = parentFactory((parentMmodel, parentState) => {
  model.parent = parentState.name
  const state = stateFn(model)
  stateRepresentation({ vm: model, state })
})

import sam from './fabric'
import { render } from 'inferno'
import h from 'inferno-hyperscript'

const actions = {
  cancelSetValue (input) {
    return {}
  },
  setValue (input) {
    return new Promise((resolve, reject) => {
      setTimeout(() => { resolve({ value: input }) }, 3000)
    })
  },
  increment (input) {
    return { increment: input }
  },
  decrement (input) {
    return { increment: input * (-1) }
  },
}

function stateRepresentation ({vm, state: {name, allowedActions}}) {
  const view = h('div', [
    h('h1#hey', `Hey child ${vm.value}`),
    h('p', vm.state),
    h('p', `Parent's state: ${vm.parent}`),
    h('p', [
      h('button', {
        onclick (event) {
          instance({action: 'cancelSetValue', cancel: true})
        },
        disabled: !allowedActions.includes('cancelSetValue'),
      }, 'Cancel'),
      h('button', {
        onclick (event) {
          instance({action: 'setValue', input: vm.value + 1})
        },
        disabled: !allowedActions.includes('setValue'),
      }, `Async: Set Value to ${vm.value + 1}`),
    ]),
    h('p', [
      h('button', {
        onclick (event) {
          instance({action: 'increment', input: 1})
        },
        disabled: !allowedActions.includes('increment'),
      }, 'Increment'),
      h('button', {
        onclick (event) {
          instance({action: 'decrement', input: 1})
        },
        disabled: !allowedActions.includes('decrement'),
      }, 'Decrement'),
    ]),
    h('p', [
      h('input#inpu', {
        placeholder: 'enter here',
        style: { position: 'relative' },
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
  render(view, document.getElementById('root-child'))
}

const model = {
  // items: [
  //   { id: 0, name: 'foo' },
  //   { id: 1, name: 'bar' },
  //   { id: 2, name: 'baz' },
  // ],
  value: undefined,
  error: undefined,
  parent: undefined,
}

function stateFn (model) {
  let name
  let allowedActions = []

  if (model.error === undefined) {
    name = 'initial'
    // allowedActions = []
    allowedActions = Object.keys(actions)
  }
  if (model.error === null) {
    name = 'normal'
    allowedActions = Object.keys(actions)
  }
  if (model.value >= 3) {
    name = 'max'
    allowedActions = Object.keys(actions).filter(action => action !== 'increment')
  }
  if (model.value <= -3) {
    name = 'min'
    allowedActions = Object.keys(actions).filter(action => action !== 'decrement')
  }

  if (!name) { throw new Error('Invalid state.') }
  model.state = name
  return { name, allowedActions }
}

const instance = sam()({
  model,

  actions,

  present (model, proposal) {
    model.error = null

    model.value = proposal.value === undefined
      ? model.value
      : proposal.value

    model.value = proposal.increment === undefined
      ? model.value
      : (model.value + proposal.increment) > model.value
        ? (model.value + proposal.increment) <= 3
          ? model.value + proposal.increment
          : model.value
        : (model.value + proposal.increment) >= -3
          ? model.value + proposal.increment
          : model.value
  },

  stateFn,

  nap (model, state) {
    stateRepresentation({ vm: model, state })

    const { name } = state
    if (name === 'initial') {
      return { action: 'setValue', input: 0 }
    }
    if (name === 'max') {
      parentInstance({ action: 'decrement', input: 1 })
    }
    if (name === 'min') {
      parentInstance({ action: 'setValue', input: 0 })
    }
  },
})
