import sam from './fabric'
import { render } from 'inferno'
import h from 'inferno-hyperscript'

const actions = {
  setValue (input) {
    return { value: input }
  },
  increment (input) {
    return { increment: input }
  },
  decrement (input) {
    return { increment: input * (-1) }
  },
  cancelSetValue (input) {},
}

const stateRepresentation = ({vm, state: {name, allowedActions = []}}) => {
  const view = h('div', [
    h('h1#hey', `Hey ${vm.value}`),
    h('p', `ActionID: [${vm.actionID}]`),
    h('p', [
      vm.pending
        ? h('button', {
          onclick (event) {
            instance({action: 'cancelSetValue'})
          },
          disabled: !allowedActions.includes('cancelSetValue'),
        }, 'Cancel')
        : h('button', {
          onclick (event) {
            instance({action: 'setValue', input: vm.value + 1})
          },
          disabled: !allowedActions.includes('setValue'),
        }, `Set Value to ${vm.value + 1}`),
      h('button', {
        onclick (event) {
          instance({action: 'increment', input: 1})
        },
        disabled: !allowedActions.includes('increment'),
      }, 'Increment'),
      h('button', {
        onclick (event) {
          instance({action: 'increment', input: -1})
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
  },

  actions,

  present (model, proposal) {
    model.error = null

    model.value = proposal.value !== undefined ? proposal.value : model.value
    if (model.value !== undefined) { model.value += proposal.increment || 0 }
  },

  stateFn (model) {
    let name
    let allowedActions = []

    if (model.error === undefined) {
      name = 'initial'
      allowedActions = ['setValue']
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
    return { name, allowedActions }
  },

  nap (model, state) {
    console.log('nap state, model', state, model)

    stateRepresentation({ vm: model, state })

    const {name, allowedActions} = state
    if (name === 'initial' && allowedActions.includes('setValue')) {
      return { action: 'setValue', input: 0 }
    }
  },
})
