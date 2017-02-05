import sam from './fabric'
import { render } from 'inferno'
import h from 'inferno-hyperscript'

const actions = {
  startSetValue (input) {
    return { pendingValue: input, pending: true }
  },
  setValue (input) {
    return new Promise((resolve, reject) => {
      setTimeout(() => { resolve({ value: input, pending: false }) }, 3000)
    })
  },
  increment (input) {
    return { increment: input }
  },
  decrement (input) {
    return { increment: input * (-1) }
  },
  cancelSetValue (input) {
    return {}
  },
}

function stateRepresentation ({vm, state: {name, allowedActions}}) {
  const view = h('div', [
    h('h1#hey', `Hey ${vm.value}`),
    h('p', vm.pending ? `pending value ${vm.pendingValue}` : 'not pending'),
    h('p', [
      h('button', {
        onclick (event) {
          instance({action: 'cancelSetValue'})
        },
        disabled: !allowedActions.includes('cancelSetValue'),
      }, 'Cancel'),
      h('button', {
        onclick (event) {
          instance({action: 'startSetValue', input: vm.value + 1})
        },
        disabled: !allowedActions.includes('startSetValue'),
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
  render(view, document.getElementById('root'))
}

const instance = sam({
  model: {
    // items: [
    //   { id: 0, name: 'foo' },
    //   { id: 1, name: 'bar' },
    //   { id: 2, name: 'baz' },
    // ],
    value: undefined,
    error: undefined,
    pending: undefined,
    pendingValue: undefined,
  },

  actions,

  present (model, proposal) {
    model.error = null

    if (model.value !== undefined) { model.value += proposal.increment || 0 }

    if (proposal.pending === true && !model.pending) {
      model.pendingValue = proposal.pendingValue
      model.pending = proposal.pending
    } else if (proposal.pending === undefined || model.pending && proposal.pending) {
      model.pendingValue = null
      model.pending = null
    } else if (proposal.pending === false && model.pending !== null) {
      model.value = proposal.value
      model.pendingValue = null
      model.pending = null
    }
  },

  stateFn (model) {
    let name
    let allowedActions = []

    if (model.error === undefined) {
      name = 'initial'
      allowedActions = ['startSetValue']
    }
    if (model.error === null) {
      name = 'normal'
      allowedActions = Object.keys(actions)
    }
    if (model.pending) {
      name = 'pending'
      allowedActions = model.value === undefined
        ? []
        : ['cancelSetValue']
      // allowedActions = Object.keys(actions)
    }
    if (model.value >= 3 && !model.pending) {
      name = 'max'
      allowedActions = Object.keys(actions).filter(action => action !== 'increment')
    }
    if (model.value <= -3 && !model.pending) {
      name = 'min'
      allowedActions = Object.keys(actions).filter(action => action !== 'decrement')
    }

    if (!name) { throw new Error('Invalid state.') }
    return { name, allowedActions }
  },

  nap (model, state) {
    stateRepresentation({ vm: model, state })

    const { name } = state
    if (name === 'initial') {
      return { action: 'startSetValue', input: 0 }
    }
    if (name === 'pending') {
      return { action: 'setValue', input: model.pendingValue }
    }
  },
})
