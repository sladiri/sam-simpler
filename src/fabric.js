import uuid from 'uuid/v4'

async function* samLoop ({
  model = {},
  stateFn = () => { },
  nap = () => { },
  actions = () => { },
  present = () => { },
}) {
  let stepID = null
  while (true) {
    stepID = uuid()
    // ========================================================================
    // Listen
    const state = await Promise.resolve(stateFn(model))

    let { action, input } = await Promise.resolve(nap(model, state) || {})

    if (!action) { ({ action, input } = yield) }
    console.log('step', stepID, (new Date()).toISOString())

    // ========================================================================
    // Propose
    const proposal = await Promise.resolve(actions[action](input))

    // ========================================================================
    // Accept
    await Promise.resolve(present(model, proposal))
  }
}

export default function samFactory (options) {
  const generator = samLoop(options)
  generator.next()
  return ::generator.next
}
