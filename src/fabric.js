async function* samLoop ({
  model = {},
  stateFn = () => { },
  nap = () => { },
  actions = () => { },
  present = () => { },
  actionQueueLength = 1,
}) {
  while (true) {
    // ========================================================
    // Listen
    const state = await Promise.resolve(stateFn(model))

    let { action, input } = await Promise.resolve(nap(model, state) || {})

    if (!action) { ({ action, input } = yield) }

    // ========================================================
    // Propose

    const proposal = await Promise.resolve(actions[action](input))
    // ========================================================
    // Accept
    await Promise.resolve(present(model, proposal))
  }
}

export default function samFactory (options) {
  const generator = samLoop(options)
  generator.next()
  return ::generator.next
}
