import uuid from 'uuid/v4'
import Promise from 'bluebird'
import {assoc, __, pipe} from 'ramda'

let generator
async function* samLoop ({
  model = {},
  stateFn = () => { },
  nap = () => { },
  actions = () => { },
  present = () => { },
  actionQueueLength = 32,
}) {
  const ids = new Array(actionQueueLength)
  let idIndex = -1
  let stepID = null
  let lastStepID = null
  let pendingIntent = {}
  while (true) {
    // console.log('step', stepID)
    // await new Promise((resolve, reject) => { setTimeout(() => { resolve() }, 100) })
    lastStepID = stepID
    stepID = uuid()
    ids[++idIndex % actionQueueLength] = stepID

    // ========================================================================
    // Listen
    const state = await Promise.resolve(stateFn(model))

    let intent = (await Promise.resolve(nap(model, state))) || {}

    if (state.name === pendingIntent.state && intent.action === pendingIntent.action) {
      if (!ids.includes(pendingIntent.stepID)) {
        console.warn('Could not check find action in log, duplicate action possibly false positive.')
      }
      intent.action = null
      intent.input = null
    }

    if (!intent.action) {
      intent = yield
    }

    pendingIntent = { ...intent, state: state.name, stepID }

    // ========================================================================
    // Propose
    let proposal
    if (intent.action) {
      proposal = Promise.resolve(actions[intent.action](intent.input))
      if (proposal.isPending()) {
        proposal
          .then(pipe(assoc('proposal', __, { stepID }), ::generator.next))
          .catch(::console.error)
        pendingIntent = { ...intent, state: state.name, stepID }
        continue
      } else {
        proposal = await proposal
      }
    } else if (intent.stepID === lastStepID) {
      // Pending action completed (no other action)
      proposal = intent.proposal
    } else {
      // Got action already for last step, cancel this one.
      continue
    }

    // ========================================================================
    // Accept
    await Promise.resolve(present(model, proposal))
  }
}

export default function samFactory (options) {
  generator = samLoop(options)
  generator.next()
  return ::generator.next
}
