/* eslint-disable no-sparse-arrays */

import Promise from 'bluebird'

export async function* samLoop ({
  model,
  actions,
  controlStates = {},
  presentFac = (state) => (model) => { },
  napFac = (state, actions) => (model) => { },
  views = (model) => { },
  targetFac = (state, view) => (model) => { },
  loopMinInterval = 5,
  loopMinIntervalAttempts = 1,
}) {
  const nextAction = napFac(controlStates, actions)
  const target = targetFac(controlStates, views)
  const present = presentFac(controlStates)
  const backoff = exponentialBackoff(loopMinInterval, loopMinIntervalAttempts)

  while (true) {
    await backoff() // Debugger fails with infinite loop.
    let [actionName, data, allowedActions] = nextAction(model) || [,, []]
    target(model, allowedActions)
    if (!actionName) {
      const input = yield // wait for async action
      [actionName, data] = input
    }
    if (!actions[actionName]) { console.warn('invalid', actionName, data); continue }
    if (!allowedActions.includes(actionName)) { console.warn('not allowed', actionName); continue }

    const proposal = await Promise.resolve(actions[actionName](data))
    await await Promise.resolve(present(model, proposal))
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
