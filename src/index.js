import Promise from 'bluebird'
import sam from './fabric'
import { render } from 'inferno'
import {
  actions,
  controlStates,
  presentFac,
  napFac,
  viewsFac,
  parentModel,
  childModel,
} from './main.js'

const parentTargetFac = (controlStates, views) => {
  return function view (model, allowedActions) {
    const view = Object.values(controlStates).find(cs => cs(model))
      ? views.normal(model, allowedActions)
      : views.notFound()
    render(view, document.getElementById('root-parent'))
    childDispatch(['parent', model])
  }
}

const childTargetFac = (controlStates, views) =>
  function view (model, allowedActions) {
    const view = Object.values(controlStates).find(cs => cs(model))
      ? views.normal(model, allowedActions)
      : views.notFound()
    render(view, document.getElementById('root-child'))
  }

const db = { save (model) { return Promise.delay(500, Promise.resolve()) } }

// Parent
const parentViews = viewsFac(controlStates)
const parentDispatch = sam({
  model: parentModel,
  actions,
  controlStates,
  present: presentFac({db}),
  napFac,
  views: parentViews,
  target: parentTargetFac(controlStates, parentViews),
})
parentViews.dispatch = parentDispatch

// Child
const childViews = viewsFac(controlStates)
const childDispatch = sam({
  model: childModel,
  actions,
  controlStates,
  present: presentFac({parentStates: controlStates, db}),
  napFac,
  views: childViews,
  target: childTargetFac(controlStates, childViews),
})
childViews.dispatch = childDispatch
childViews.parentDispatch = parentDispatch
