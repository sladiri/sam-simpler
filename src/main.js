/* eslint-disable no-sparse-arrays */

import sam from './fabric'
import { render } from 'inferno'
import h from 'inferno-hyperscript'
import Promise from 'bluebird'

const actions = {
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
  }
}

const controlStates = {
  initial (model) { return model.error === undefined },
  normal (model) { return model.value > -3 && model.value < 3 },
  max (model) { return model.value >= 3 },
  min (model) { return model.value <= -3 },
}

const presentFac = (controlStates) => function present (model, proposal) {
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

  model.parentModel = proposal.parentModel
  if (model.parentModel) {
    model.parentState = controlStates.initial(parentModel)
      ? 'initial'
      : controlStates.normal(parentModel)
        ? 'normal'
        : controlStates.max(parentModel)
          ? 'max'
          : controlStates.min(parentModel)
            ? 'min'
            : 'invalid state!'
  }
}

const napFac = (controlStates, actions) => function nextActionPredicate (model) {
  if (controlStates.initial(model)) { return ['setValue', 0, ['setValue']] }
  if (controlStates.max(model)) { return ['decrement', 1, Object.keys(actions).filter(action => action !== 'increment')] }
  if (controlStates.min(model)) { return ['increment', 1, Object.keys(actions).filter(action => action !== 'decrement')] }
  return [,, Object.keys(actions)]
}

const childModel = {
  // items: [
  //   { id: 0, name: 'foo' },
  //   { id: 1, name: 'bar' },
  //   { id: 2, name: 'baz' },
  // ],
  value: undefined,
  error: undefined,
  parentState: undefined,
}

const viewsFac = (controlStates) => ({
  dispatch: null,
  normal (model, allowedActions) {
    const self = this
    return h('div', [
      h('h1#hey', `Hey ${model.parentState ? 'child' : 'parent'} ${model.value}`),
      h('p', Object.keys(controlStates).find(key => controlStates[key](model))),
      h('p', `Parent's state: ${model.parentState}`),
      h('p', [
        h('button', {
          onclick (event) { self.dispatch(['reset']) },
          disabled: !allowedActions.includes('reset') || controlStates.max(model),
        }, 'Reset'),
        h('button', {
          onclick (event) { self.dispatch(['setValue', model.value + 1]) },
          disabled: !allowedActions.includes('setValue') || controlStates.initial(model) || controlStates.max(model),
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
        : undefined,
      // h('p', [
      //   h('input#inpu', {
      //     placeholder: 'enter here',
      //     style: { position: 'relative' },
      //   }),
      // ]),
      h('p', [
        model.error
          ? h('div', [
            h('br'),
            h('p', model.error),
          ])
          : undefined,
      ]),
    ])
  },
  notFound () { return h('h1', 'view not found') },
})

const childTargetFac = (controlStates, views) => function view (model, allowedActions) {
  const view = Object.values(controlStates).find(cs => cs(model))
    ? views.normal(model, allowedActions)
    : views.notFound()
  render(view, document.getElementById('root-child'))
}

const parentModel = {
  // items: [
  //   { id: 0, name: 'foo' },
  //   { id: 1, name: 'bar' },
  //   { id: 2, name: 'baz' },
  // ],
  value: undefined,
  error: undefined,
}

const parentTargetFac = (controlStates, views) => {
  return function view (model, allowedActions) {
    const view = Object.values(controlStates).find(cs => cs(model))
      ? views.normal(model, allowedActions)
      : views.notFound()
    render(view, document.getElementById('root-parent'))
    childDispatch(['parent', model])
  }
}

// Parent
const parentViews = viewsFac(controlStates)
const parentDispatch = sam({
  model: parentModel,
  actions,
  controlStates,
  presentFac,
  napFac,
  views: parentViews,
  targetFac: parentTargetFac,
})
parentViews.dispatch = parentDispatch

// Child
const childViews = viewsFac(controlStates)
const childDispatch = sam({
  model: childModel,
  actions,
  controlStates,
  presentFac,
  napFac,
  views: childViews,
  targetFac: childTargetFac,
})
childViews.dispatch = childDispatch
childViews.parentDispatch = parentDispatch
