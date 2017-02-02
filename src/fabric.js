import Deque from 'double-ended-queue'

export default function samFactory (options) {
  function* sam ({
    model = {},
    actions = () => { },
    present = () => { },
    stateFn = () => { },
    nap = () => { },
    actionQueueLength = 32,
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
      const proposal = actions[action](input)
      // ========================================================
      // Accept
      present(model, proposal)
    }
  }
  const generator = sam(options)
  generator.next()
  return ::generator.next
}
