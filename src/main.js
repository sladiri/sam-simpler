/* eslint-disable no-sparse-arrays */

import h from 'inferno-hyperscript'
import Promise from 'bluebird'

export const actions = {
  reset () {
    return { value: 10 }
  },
  setValue (input) {
    return Promise.delay(2000, Promise.resolve({ value: input }))
  },
  increment (input) {
    return Promise.delay(1000, Promise.resolve({ increment: input }))
  },
  decrement (input) {
    return Promise.delay(1000, Promise.resolve({ increment: input * (-1) }))
  },
  parent (input) {
    return { parentModel: input }
  },
}

export const presentFac = ({parentStates, db}) =>
  function present (model, proposal) {
    model.value = proposal.value === undefined
      ? model.value
      : proposal.value

    model.value = proposal.increment === undefined
      ? model.value
      : model.value + proposal.increment

    model.parentModel = proposal.parentModel
    if (model.parentModel) {
      model.parentState = parentStates.normal(parentModel)
          ? 'normal'
          : parentStates.max(parentModel)
            ? 'max'
            : parentStates.min(parentModel)
              ? 'min'
              : 'invalid state!'
    }
    return db.save(model)
  }

export const controlStates = {
  normal (model) { return model.value > -3 && model.value < 3 },
  max (model) { return model.value >= 3 },
  min (model) { return model.value <= -3 },
}

export const napFac = (controlStates, actions) =>
  function nextActionPredicate (model) {
    if (controlStates.max(model)) { return ['decrement', 1, Object.keys(actions).filter(action => action !== 'increment')] }
    if (controlStates.min(model)) { return ['increment', 1, Object.keys(actions).filter(action => action !== 'decrement')] }
    return [,, Object.keys(actions)]
  }

export const childModel = {
  value: 0,
  parentState: null,
}

export const viewsFac = (controlStates) => ({
  dispatch: null,
  normal (model, allowedActions) {
    const self = this
    return h('div', [
      h('h1#hey', `Hey ${model.parentState === undefined ? 'parent' : 'child'} ${model.value}`),
      h('p', Object.keys(controlStates).find(key => controlStates[key](model))),
      model.parentState
        ? h('p', `Parent's state: ${model.parentState}`)
        : h('br'),
      h('p', [
        h('button', {
          onclick (event) { self.dispatch(['reset']) },
          disabled: !allowedActions.includes('reset') || controlStates.max(model),
        }, 'Reset'),
        h('button', {
          onclick (event) { self.dispatch(['setValue', model.value + 1]) },
          disabled: !allowedActions.includes('setValue') || controlStates.max(model),
        }, `Set Value to ${model.value + 1}`),
      ]),
      h('p', [
        h('button', {
          onclick (event) { self.dispatch(['increment', 1]) },
          disabled: !allowedActions.includes('increment') || controlStates.max(model),
        }, 'Increment'),
        h('button', {
          onclick (event) { self.dispatch(['decrement', 1]) },
          disabled: !allowedActions.includes('decrement') || controlStates.max(model),
        }, 'Decrement'),
      ]),
      model.parentState
        ? h('button', {
          onclick (event) { self.parentDispatch(['increment', 1]) },
        }, 'Increment parent')
        : h('br'),
    ])
  },
  notFound () { return h('h1', 'view not found') },
})

export const parentModel = {
  value: 0,
}
