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

async function* samLoop ({
  actionFac = (present) => ({}),
  state = {},
  presentFac = (state) => (model, reduxMessage) => { },
  target = null,
  napFac = (state, actions) => (model) => { },
  view = (model) => { },
  displayFac = (state, view) => (model) => { },
}) {
  // const actions = actionFac((data) => { store.dispatch({ type: 'PRESENT', payload: data }) })
  const actions = actionFac()
  const nap = napFac(state, actions)
  const display = displayFac(state, view)

  const model = store.getState()
  document.addEventListener('reduxDone', function once () {
    console.log('re-render caused by redux statepath', model)
    root.innerHTML = display(model)
    document.removeEventListener('reduxDone', once)
  })
  store.dispatch({ type: 'TESTREDUCER_BEFORE_LOOP-NO_ACTION' })
  while (true) {
    await Promise.delay(100, Promise.resolve())

    // const model = store.getState()

    // console.log('render wanted')
    // root.innerHTML = display(model)

    let [action, data, allowedActions] = nap(model) || [,, []]
    if (!action) {
      console.log('waiting for input')
      const input = yield
      [action, data] = input
    }
    if (!actions[action]) { console.warn('invalid action', action, data) }
    if (!allowedActions.includes(action)) { console.warn('not allowed', action); continue }
    const proposal = await Promise.resolve(actions[action](data))

    await new Promise((resolve, reject) => {
      document.addEventListener('reduxDone', function oncer ({ detail: model }) {
        document.removeEventListener('reduxDone', oncer)
        console.log('re-render caused by redux statepath', model)
        root.innerHTML = display(model)
        resolve()
      })
      store.dispatch({ type: `TESTREDUCER_${action.toUpperCase()}`, payload: proposal })
    })
  }
}

const actionFac = (present) => ({
  // config (config) { present({ config }) },
  // loadCms () { present({ cms: 'foo' }) },
  config (config) { return { config } },
  loadCms (val) { console.log('cms API call'); return Promise.delay(2000, Promise.resolve({ cms: val })) },
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
  // if (state.initial(model)) { actions.config('confoo') }
  if (state.initial(model)) { return ['config', 'confoo', ['config', 'loadCms']] }
  if (state.cmsLoaded(model)) { return [,, []] }
  return [,, ['config', 'loadCms']]
}

const view = {
  initial (model) {
    return `
      <p>initial view</p>
      <p>${model.cms}</p>
      <button onclick="window.cli()" id="load">load cms</button>
      `
  },
  configReady (model) {
    return `
      <p>config ready</p>
      <p>${model.cms}</p>
      <button onclick="window.cli()" id="load">load cms</button>
      `
  },
  cmsReady (model) {
    return `
      <p>cms ready view</p>
      <p>${model.cms}</p>
      <button disabled onclick="window.cli()" id="load">load cms</button>
      `
  },
}

const displayFac = (state, view) => (model) => {
  if (state.initial(model)) { return view.initial(model) }
  if (state.configLoaded(model) && !state.cmsLoaded(model)) { return view.configReady(model) }
  if (state.cmsLoaded(model)) { return view.cmsReady(model) }
}
const sl = samLoop({actionFac, state, presentFac, napFac, view, displayFac})
sl.next()
