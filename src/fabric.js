/* eslint-disable no-sparse-arrays */

import Promise from 'bluebird'

export async function* samLoop ({
  model,
  actions,
  controlStates = {},
  present = (model) => { },
  napFactory = (state, actions) => (model) => { },
  target = () => { },
  loopMinInterval = 4,
  loopMinIntervalAttempts = 1,
  testHook = null,
}) {
  const nextAction = napFactory(controlStates, actions)
  const backoff = exponentialBackoff(loopMinInterval, loopMinIntervalAttempts)
  const {hook, endTest} = testHook || {}

  while (true) {
    await backoff() // Debugger fails with infinite loop.

    let [actionName, data, allowedActions] = nextAction(model) || [,, []]
    target(model, allowedActions)

    if (!actionName) {
      const input = yield // wait for async action
      [actionName, data] = input
    }

    if (endTest && actionName === null) { endTest(model); continue }
    if (!actions[actionName]) { console.warn('invalid', actionName, data); continue }
    if (!allowedActions.includes(actionName)) { console.warn('not allowed', actionName); continue }

    if (hook) { hook(model) }

    const proposal = await Promise.resolve(actions[actionName](data))
    await Promise.resolve(present(model, proposal))
  }
}

export default (options) => {
  const generator = samLoop(options)
  generator.next()
  return ::generator.next
}

function exponentialBackoff (interval, maxAttempts) {
  let lastTimestamp = Date.now()
  let currentDelay = 1
  let attempts = 0
  let resetAttemptsId
  return () => {
    if (Date.now() - lastTimestamp <= interval) attempts++
    if (attempts > maxAttempts) {
      currentDelay += 10
      clearTimeout(resetAttemptsId)
      resetAttemptsId = setTimeout(() => {
        attempts = 0
        currentDelay = 1
      }, interval)
      console.warn('loop backoff', currentDelay)
    }
    lastTimestamp = Date.now()
    return Promise.delay(currentDelay, Promise.resolve())
  }
}
