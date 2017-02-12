/* eslint-disable no-sparse-arrays */

import h from 'inferno-hyperscript'
import Promise from 'bluebird'

export const actions = {
  setValue (input) {
    return { value: input }
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

    model.parentModel = proposal.parentModel || model.parentModel
    if (model.parentModel) {
      model.parentState = parentStates.normal(parentModel)
          ? 'normal'
          : parentStates.max(parentModel)
            ? 'max'
            : parentStates.min(parentModel)
              ? 'min'
              : 'invalid state!'
    }
    return model.parentModel // Child does not save to db in example.
      ? undefined
      : db.save(model)
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

export const renderFac = (controlStates) => ({
  dispatch: null,
  render (model, allowedActions) {
    const stateName = Object.keys(controlStates).find(key => controlStates[key](model))
    if (!stateName) { return h('h1', 'view not found') }

    const self = this
    return h('div', [
      h('h1', `I am the ${model.parentModel === undefined ? 'parent' : 'child'} ${model.value}`),
      h('p', 'My value will always settle between -2 and 2.'),
      model.parentModel === undefined
        ? h('p', [h('span', {style: {'font-size': 'small'}}, '(async "database save" takes 500ms)')])
        : undefined,
      h('p', {style: {'font-weight': 'bolder'}}, `My state: ${Object.keys(controlStates).find(key => controlStates[key](model))}`),
      model.parentModel === undefined
        ? undefined
        : h('p', {style: {'color': 'chartreuse'}}, `Parent's state: ${model.parentState}`),
      h('p', [
        h('button', {
          onclick (event) { self.dispatch(['setValue', 5]) },
          disabled: !allowedActions.includes('setValue') || controlStates.max(model),
        }, 'Set value to 5'),
        h('button', {
          onclick (event) { self.dispatch(['setValue', model.value + 1]) },
          disabled: !allowedActions.includes('setValue') || controlStates.max(model),
        }, `Set Value to ${model.value} + 1 = ${model.value + 1}`),
      ]),
      h('p', [
        h('button', {
          onclick (event) { self.dispatch(['increment', 1]) },
          disabled: !allowedActions.includes('increment') || controlStates.max(model),
        }, 'Async Increment'),
        h('button', {
          onclick (event) { self.dispatch(['decrement', 1]) },
          disabled: !allowedActions.includes('decrement') || controlStates.max(model),
        }, 'Async Decrement'),
      ]),
      model.parentState
        ? h('button', {
          onclick (event) { self.parentDispatch(['increment', 1]) },
          style: {
            'color': 'bisque',
            'background-color': 'darkslategray',
            'text-transform': 'uppercase',
          },
        }, 'Call parent\'s Increment')
        : h('br'),
    ])
  },
})

export const parentModel = {
  value: 0,
}

export const childModel = {
  value: 0,
  parentModel: null,
  parentState: undefined,
}
