/* eslint-disable no-sparse-arrays */
import Promise from 'bluebird'

const root = document.getElementById('root-fab')
const store = {
  dispatch (data) {
    document.dispatchEvent(new CustomEvent('redux', { detail: data })) // eslint-disable-line no-undef
  },
  getState () {
    return this.state
  },
  state: {
    config: null,
    cms: null,
  },
}
window.cli = function () { sl.next(['loadCms', Date.now()]) }
window.clr = function () { sl.next(['resetCms']) }
const fakeReduxDispatch = (model, display, action, proposal, resolve = () => {}) => {
  document.addEventListener('reduxDone', function once () {
    console.log('re-render caused by redux statepath', model)
    root.innerHTML = display(model)
    document.removeEventListener('reduxDone', once)
    resolve()
  })
  store.dispatch({ type: `TESTREDUCER_${(action || 'BEFORE_LOOP-NO_ACTION').toUpperCase()}`, payload: proposal })
}

async function* samLoop ({
  actionFac = (present) => ({}),
  state = {},
  presentFac = (state) => (model, reduxMessage) => { },
  napFac = (state, actions) => (model) => { },
  view = (model) => { },
  displayFac = (state, view) => (model) => { },
}) {
  const actions = actionFac()
  const nextAction = napFac(state, actions)
  const display = displayFac(state, view)

  const model = store.getState()
  fakeReduxDispatch(model, display)

  while (true) {
    let [action, data, allowedActions] = nextAction(model) || [,, []]
    if (!action) {
      console.log('waiting for input')
      const input = yield
      [action, data] = input
    }
    if (!actions[action]) { console.warn('invalid action', action, data); continue }
    if (!allowedActions.includes(action)) { console.warn('not allowed', action); continue }

    const proposal = await Promise.resolve(actions[action](data))
    await new Promise((resolve, reject) => { fakeReduxDispatch(model, display, action, proposal, resolve) })
  }
}

const actionFac = (present) => ({
  config (config) { return { config } },
  loadCms (val) { console.log('cms API call'); return Promise.delay(2000, Promise.resolve({ cms: val })) },
  resetCms () { return { cms: null } }
})

const state = {
  initial (model) { return !model.config },
  configLoaded (model) { return model.config === 'confoo' },
  cmsLoaded (model) { return !!model.cms },
}

const presentFac = (state) => function present (model, { type, payload }) {
  console.log('present', type, payload)
  if (payload) { // Check, since Redux is fake.
    if (state.initial(model) && payload.config) { model.config = payload.config }
    model.cms = payload.cms
  }
  document.dispatchEvent(new CustomEvent('reduxDone', { detail: model })) // eslint-disable-line no-undef
  // return model // Only in real Redux.
}
document.addEventListener('redux', ({ detail }) => { // Fake redux store.
  presentFac(state)(store.state, detail)
})

const napFac = (state, actions) => function nap (model) {
  if (state.initial(model)) { return ['config', 'confoo', ['config']] }
  if (state.cmsLoaded(model)) { return [,, ['resetCms']] }
  return [,, ['config', 'loadCms', 'resetCms']]
}

const view = {
  initial (model, state) {
    return `
      <p>initial view</p>
      <p>${model.cms}</p>
      <button ${state.cmsLoaded(model) ? 'disabled' : ''} onclick="window.cli()">load cms</button>
      <button ${!state.cmsLoaded(model) ? 'disabled' : ''} onclick="window.clr()">reset cms</button>
      `
  },
  configReady (model, state) {
    return `
      <p>config ready</p>
      <p>${model.cms}</p>
      <button ${state.cmsLoaded(model) ? 'disabled' : ''} onclick="window.cli()">load cms</button>
      <button ${!state.cmsLoaded(model) ? 'disabled' : ''} onclick="window.clr()">reset cms</button>
      `
  },
  cmsReady (model, state) {
    return `
      <p>cms ready view</p>
      <p>${model.cms}</p>
      <button ${state.cmsLoaded(model) ? 'disabled' : ''} onclick="window.cli()">load cms</button>
      <button ${!state.cmsLoaded(model) ? 'disabled' : ''} onclick="window.clr()">reset cms</button>
      `
  },
}

const displayFac = (state, view) => (model) => {
  if (state.initial(model)) { return view.initial(model, state) }
  if (state.configLoaded(model) && !state.cmsLoaded(model)) { return view.configReady(model, state) }
  if (state.cmsLoaded(model)) { return view.cmsReady(model, state) }
}
const sl = samLoop({actionFac, state, presentFac, napFac, view, displayFac})
sl.next()
