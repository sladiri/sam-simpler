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
  store.dispatch({ type: 'PRESENT_BEFORE_LOOP-NO_ACTION' })
  while (true) {
    // await new Promise((resolve, reject) => { setTimeout(() => { resolve() }, 100) })

    // const model = store.getState()

    // console.log('render wanted')
    // root.innerHTML = display(model)

    const [action, data] = nap(model) || []
    let proposal
    if (action && actions[action]) {
      proposal = await Promise.resolve(actions[action](data))
    } else {
      if (action) { console.warn('invalid action', action, data) }
      console.log('waiting for input')
      yield
    }
    await new Promise((resolve, reject) => {
      document.addEventListener('reduxDone', ({ detail: model }) => {
        console.log('re-render caused by redux statepath', model)
        root.innerHTML = display(model)
        resolve()
      })
      store.dispatch({ type: `PRESENT_${action.toUpperCase()}`, payload: proposal })
    })
  }
}

const actionFac = (present) => ({
  // init (config) { present({ config }) },
  // loadCms () { present({ cms: 'foo' }) },
  init (config) { return { config } },
  loadCms () { return { cms: 'foo' } },
})

const state = {
  initial (model) { return !model.config },
  configLoaded (model) { return model.config === 'confoo' },
  cmsLoaded (model) { return model.cms === 'foo' },
}

const presentFac = (state) => function present (model, { type, payload }) {
  console.log('present', type, payload)
  if (payload) { // Check, since Redux is fake.
    if (state.initial(model) && payload.config) { model.config = payload.config }
    if (!state.cmsLoaded(model) && payload.cms) { model.cms = payload.cms }
  }
  document.dispatchEvent(new CustomEvent('reduxDone', { detail: model })) // eslint-disable-line no-undef
  // return model // Only in real Redux.
}
document.addEventListener('redux', ({ detail }) => { // Fake redux store.
  presentFac(state)(store.state, detail)
})

const napFac = (state, actions) => function nap (model) {
  // if (state.initial(model)) { actions.init('confoo') }
  if (state.initial(model)) { return ['init', 'confoo'] }
}

const view = {
  initial (model) { return 'initial view' },
  configReady (model) { return 'config ready view' },
  cmsReady (model) { return 'CMS ready view' },
}

const displayFac = (state, view) => (model) => {
  if (state.initial(model)) { return view.initial(model) }
  if (state.configLoaded(model)) { return view.configReady(model) }
  if (state.cmsLoaded(model)) { return view.cmsReady(model) }
}
const sl = samLoop({actionFac, state, presentFac, napFac, view, displayFac})
sl.next()
