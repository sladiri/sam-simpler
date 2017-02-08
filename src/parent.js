import sam from './fabric'
import { render } from 'inferno'
import h from 'inferno-hyperscript'

export const actions = {
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
    h('h1#hey', `Hey paren ${vm.value}`),
    h('p', vm.state),
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
  render(view, document.getElementById('root-parent'))
}

let instance

export default target => {
  instance = sam()({
    name: 'parent ',

    target,

    model: {
      // items: [
      //   { id: 0, name: 'foo' },
      //   { id: 1, name: 'bar' },
      //   { id: 2, name: 'baz' },
      // ],
      value: undefined,
      error: undefined,
    },

    actions,

    present (model, proposal) {
      model.error = null

      model.value = proposal.value === undefined ? model.value : proposal.value
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

    stateFn (model) {
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
    },

    nap (model, state) {
      stateRepresentation({ vm: model, state })

      const { name } = state
      if (name === 'initial') {
        return { action: 'setValue', input: 0 }
      }
    },
  })

  return instance
}
