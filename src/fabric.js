/* eslint-disable no-sparse-arrays */

import Promise from 'bluebird'

// TODO: Allow model modules and action modules?
// TODO: Allow directed graph of child-parent relationships?

export async function* samLoop ({
  model,
  actions,
  controlStates,
  present = (model) => { },
  napFactory = (state, actions) => (model) => { },
  target = (model, allowedActions) => { },
  loopMinInterval = 4,
  loopMinIntervalAttempts = 1,
  testHook = null,
}) {
  const nextAction = napFactory(controlStates, actions)
  const backoff = exponentialBackoff(loopMinInterval, loopMinIntervalAttempts)
  const {hook, endTest} = testHook || {}
  const isTest = hook && endTest
  const self = yield
  let stepId = 1
  let skipNap = false
  let allowedActions = []
  let asyncPending = 0

  while (true) {
    if (!isTest) { await backoff() } // Debugger fails with infinite loop.
    console.log('step', stepId, asyncPending, skipNap)
    // debugger

    let actionName
    let data
    if (!skipNap) {
      console.info('compute nap');
      [actionName, data, allowedActions] = nextAction(model) || [,, []]
      target(model, allowedActions)
      // debugger
    }

    let asyncProposal
    let asyncStepId
    if (!actionName) {
      console.info('waiting for input')
      const input = yield // wait for async action
      [actionName, data, asyncProposal, asyncStepId] = input
      // debugger
    }
    skipNap = false

    let proposal
    if (!asyncProposal) {
      if (isTest && actionName === null) { endTest(model); continue }
      if (!actions[actionName]) { console.warn('invalid', actionName, data); continue }
      if (!allowedActions.includes(actionName)) { console.warn('not allowed', actionName, data); continue }

      stepId += 1

      if (isTest) { hook(model) }

      const proposalPromise = Promise.resolve(actions[actionName](data))
      if (proposalPromise.isPending()) {
        // debugger
        if (asyncPending) {
          console.warn('ignored async action, waiting for pending action')
          stepId -= 1
          continue
        }
        const asyncStepId = stepId
        proposalPromise.then((proposal) => self.next([,, proposal, asyncStepId])).catch(::console.error)
        skipNap = true
        // if (asyncPending) { stepId -= 1 }
        asyncPending += 1
        continue
      }
      proposal = await proposalPromise
      console.log(allowedActions, actionName, proposal)
      if (allowedActions.map((action) => `cancel-${action}`).includes(proposal)) {
        console.warn('cancelled async action', proposal)
        // debugger
        continue
      } else if (asyncPending) { // TODO: Ignore action here?
        console.warn('ignored action, waiting for pending action')
        // debugger
        skipNap = true
        stepId -= 1
        continue
      }
    } else if (asyncStepId === stepId) {
      // debugger
      proposal = asyncProposal
      asyncPending -= 1
    } else {
      console.warn('invalid stepID for async action', asyncProposal)
      // debugger
      skipNap = true
      asyncPending -= 1
      continue
    }
    await Promise.resolve(present(model, proposal))
  }
}

export default (options) => {
  const generator = samLoop(options)
  generator.next()
  generator.next(generator)
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
