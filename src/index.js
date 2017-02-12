import 'babel-polyfill' // for github pages

import Promise from 'bluebird'
import sam from './fabric'
import { render as renderDom } from 'inferno'
import {
  actions,
  controlStates,
  presentFac,
  napFac,
  renderFac,
  parentModel,
  childModel,
} from './main.js'

const targetFac = (controlStates, renderer, targetElement, callback) => {
  return (model, allowedActions) => {
    const view = renderer.render(model, allowedActions)
    renderDom(view, targetElement)
    if (callback) { callback(model) }
  }
}

const db = { save (model) { return Promise.delay(500, Promise.resolve()) } }

// Parent
const parentRenderer = renderFac(controlStates)
const parentDispatch = sam({
  model: parentModel,
  actions,
  controlStates,
  present: presentFac({db}),
  napFac,
  target: targetFac(
    controlStates,
    parentRenderer,
    document.getElementById('root-parent'),
    (model) => {
      childDispatch(['parent', model])
    }),
})
parentRenderer.dispatch = parentDispatch

// Child
const childRenderer = renderFac(controlStates)
const childDispatch = sam({
  model: childModel,
  actions,
  controlStates,
  present: presentFac({parentStates: controlStates, db}),
  napFac,
  target: targetFac(
    controlStates,
    childRenderer,
    document.getElementById('root-child')),
})
childRenderer.dispatch = childDispatch
childRenderer.parentDispatch = parentDispatch
