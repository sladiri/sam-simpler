/* eslint-disable no-sparse-arrays */

import h from 'inferno-hyperscript'
import Promise from 'bluebird'
import dynamics from 'dynamics.js'
import snabbt from '../snabbt.min.js'

export const actions = {
  setValue (input) {
    return { value: input }
  },
  increment (input) {
    return Promise.delay(2000, Promise.resolve({ increment: input }))
  },
  decrement (input) {
    return Promise.delay(2000, Promise.resolve({ increment: input * (-1) }))
  },
  parent (input) {
    return { parentModel: input }
  },
}

export const presentFactory = ({parentStates, db}) =>
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
    // return model.parentModel // Child does not save to db in example.
    //   ? undefined
    //   : db.save(model)
  }

export const controlStates = {
  normal (model) { return model.value > -3 && model.value < 3 },
  max (model) { return model.value >= 3 },
  min (model) { return model.value <= -3 },
}

export const napFactory = (controlStates, actions) =>
  function nextActionPredicate (model) {
    if (controlStates.max(model)) { return ['decrement', 1, Object.keys(actions).filter(action => action !== 'increment')] }
    if (controlStates.min(model)) { return ['increment', 1, Object.keys(actions).filter(action => action !== 'decrement')] }
    return [,, Object.keys(actions)]
  }

export const renderFactory = (controlStates) => ({
  dispatch: null,
  horScale: null,
  radScale: null,
  render (model, allowedActions) {
    const stateName = Object.keys(controlStates).find(key => controlStates[key](model))
    if (!stateName) { return h('h1', 'Invalid state. View not found.') }

    const self = this
    return h('div', [
      h('h2', `I am the ${model.parentModel === undefined ? 'parent' : 'child'}`),
      h('h3', `My value is ${model.value}`),
      model.parentModel === undefined
        ? h('p', [h('span', {style: {'font-size': 'small'}}, '(async "database save" takes 500ms)')])
        : undefined,
      h('p', 'My value will always settle between -2 and 2.'),
      h('p', {style: {'font-weight': 'bolder'}}, `My state is ${Object.keys(controlStates).find(key => controlStates[key](model))}`),
      model.parentModel === undefined
        ? undefined
        : h('p', {style: {'color': 'chartreuse'}}, `Parent's state: ${model.parentState}`),
      h('p', [
        h('button', {
          onclick (event) { self.dispatch(['setValue', 5]) },
          disabled: !allowedActions.includes('setValue') || controlStates.max(model),
        }, 'Set value to 5'),
        h('br'),
        h('button', {
          onclick (event) { self.dispatch(['setValue', model.value + 1]) },
          disabled: !allowedActions.includes('setValue') || controlStates.max(model),
        }, `Set Value to ${model.value + 1}`),
        h('button', {
          onclick (event) { self.dispatch(['setValue', model.value - 1]) },
          disabled: !allowedActions.includes('setValue') || controlStates.min(model),
        }, `Set Value to ${model.value - 1}`),
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
      model.parentModel === undefined
        ? undefined
        : h('p', [
          h('button', {
            onclick (event) { self.parentDispatch(['increment', 1]) },
            style: {
              'color': 'bisque',
              'background-color': 'darkslategray',
              'text-transform': 'uppercase',
            },
          }, 'Parent\'s Increment'),
          h('div', {style: {'margin-top': '0.2em'}}),
          h('button', {
            onclick (event) { self.parentDispatch(['setValue', model.parentModel && model.parentModel.value + 1]) },
            style: {
              'color': 'bisque',
              'background-color': 'darkslategray',
              'text-transform': 'uppercase',
            },
          }, `Set parent's Value to ${model.parentModel && model.parentModel.value} + 1 = ${model.parentModel && model.parentModel.value + 1}`),
        ]),
      h('div', {style: {display: 'flex'}}, [
        h('div', {style: {'flex-grow': '1', margin: '0 1em 0 0'}}, [
          h('div', {style: {'background-color': 'brown', height: '1em'}}, [
            h('div.hor-scale', {style: {'background-color': 'cyan', width: '0.1em', height: '1.2em', position: 'relative', top: '-0.1em'}}),
          ]),
          model.parentModel === undefined
            ? undefined
            : h('div', {style: {'background-color': 'gold', height: '1em', margin: '0.5em 0 0 0'}}, [
              h('div.hor-scale-p', {style: {'background-color': 'magenta', width: '0.1em', height: '1.2em', position: 'relative', top: '-0.1em'}}),
            ]),
        ]),
        h('div.rad', {style: {width: '4em', height: '4em', 'border-radius': '2em'}}, [
          h('div.rad-scale', {style: {'background-color': 'black', width: '0.1em', height: '2em', position: 'relative', left: '1.95em'}}),
        ]),
      ]),
      h('br'),
    ])
  },
  animate (model) {
    if (!this.horScale) {
      this.horScale = {
        el: document.querySelector(`#root-${model.parentModel === undefined ? 'parent' : 'child'} .hor-scale`),
      }
      this.horScale.parentWidth = this.horScale.el.parentNode.offsetWidth
      this.horScale.el.style.left = `${((this.horScale.parentWidth / 100) * 50).toFixed(2)}px`
    }

    snabbt(this.horScale.el, {
      position: [((this.horScale.parentWidth / 10) * model.value).toFixed(2), 0, 0],
      easing: 'spring',
      springConstant: 0.1,
      springDeceleration: 0.8,
    })

    if (model.parentModel) {
      if (!this.horScaleP) {
        this.horScaleP = this.horScaleP || {
          el: document.querySelector('#root-child .hor-scale-p'),
        }
        this.horScaleP.parentWidth = this.horScaleP.el.parentNode.offsetWidth
        this.horScaleP.el.style.left = `${((this.horScaleP.parentWidth / 100) * 50).toFixed(2)}px`
      }

      snabbt(this.horScaleP.el, {
        position: [((this.horScaleP.parentWidth / 10) * model.parentModel.value).toFixed(2), 0, 0],
        easing: 'spring',
        springConstant: 0.1,
        springDeceleration: 0.8,
      })
    }

    if (!this.radScale) {
      this.radScale = {
        el: document.querySelector(`#root-${model.parentModel === undefined ? 'parent' : 'child'} .rad-scale`),
      }
      this.radScale.height = this.radScale.el.offsetHeight
    }

    snabbt(this.radScale.el, {
      transformOrigin: [0, this.radScale.height / 2, 0],
      rotation: [0, 0, model.value * -1.5],
      easing: 'spring',
      springConstant: 0.1,
      springDeceleration: 0.8,
    })

    if (!this.rad) {
      this.rad = {
        el: document.querySelector(`#root-${model.parentModel === undefined ? 'parent' : 'child'} .rad`),
        dynamicsState: {
          colour: '#0000FF',
        },
      }
      const self = this
      this.rad.dynamicsOptions = {
        change (state, progress) {
          self.rad.el.style.backgroundColor = state.colour
        },
      }
    }

    model.value === 0
      ? dynamics.animate(this.rad.dynamicsState, {colour: '#00FF00'}, this.rad.dynamicsOptions)
      : model.value > 0
        ? dynamics.animate(this.rad.dynamicsState, {colour: '#FF0000'}, this.rad.dynamicsOptions)
        : dynamics.animate(this.rad.dynamicsState, {colour: '#0000FF'}, this.rad.dynamicsOptions)
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
