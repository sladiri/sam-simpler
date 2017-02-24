import Promise from 'bluebird'
import sam from './fabric'
import { render as renderDom } from 'inferno'
import {
  actions,
  controlStates,
  presentFactory,
  napFactory,
  renderFactory,
  parentModel,
  childModel,
} from './example.js'

const targetFactory = (controlStates, renderer, targetElement, callback) => {
  return (model, allowedActions) => {
    const view = renderer.render(model, allowedActions)
    renderDom(view, targetElement)
    renderer.animate(model)
    if (callback) { callback(model) }
  }
}

const db = { save (model) { return Promise.delay(500, Promise.resolve()) } }

// Child
const childRenderer = renderFactory(controlStates)
const childDispatch = sam({
  model: childModel,
  actions,
  controlStates,
  present: presentFactory({parentStates: controlStates, db}),
  napFactory,
  target: targetFactory(
    controlStates,
    childRenderer,
    document.getElementById('root-child')),
})
childRenderer.dispatch = childDispatch

// Parent
const parentRenderer = renderFactory(controlStates)
const parentDispatch = sam({
  model: parentModel,
  actions,
  controlStates,
  present: presentFactory({db}),
  napFactory,
  target: targetFactory(
    controlStates,
    parentRenderer,
    document.getElementById('root-parent'),
    (model) => {
      childDispatch(['parent', model])
    }),
})
parentRenderer.dispatch = parentDispatch

childRenderer.parentDispatch = parentDispatch

// test babel
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function * source () {
  yield * [1, 2, 3, 4].map((x) => delay(1000).then(() => `${x * 10} - ${(new Date()).toUTCString()}`))
}

(async function () {
  for await (const value of source()) {
    console.log(value)
  }
})()
