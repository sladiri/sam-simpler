import Deque from 'double-ended-queue'

async function* samLoop ({
  model = {},
  actions = () => { },
  present = () => { },
  stateFn = () => { },
  nap = () => { },
  actionQueueLength = 8,
}) {
  const actionQueue = new Deque(actionQueueLength)

  while (true) {
    // ========================================================
    // Listen
    const state = stateFn(model)

    let { action, input = undefined } = nap(model, state) || {}
    if (action) { actionQueue.push({ action, input }) }

    const step = actionQueue.isEmpty()
      ? yield
      : actionQueue.shift()
    action = step.action
    input = step.input
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
