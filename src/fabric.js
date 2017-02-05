import uuid from 'uuid/v4'
import Promise from 'bluebird'
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
  let pendingAction = {}
  while (true) {
    console.log('step', stepID)
    // await new Promise((resolve, reject) => { setTimeout(() => { resolve() }, 100) })
    lastStepID = stepID
    stepID = uuid()
    ids[++idIndex % actionQueueLength] = stepID

    // ========================================================================
    // Listen
    const state = await Promise.resolve(stateFn(model))

    let intent
    let action
    let input
    intent = (await Promise.resolve(nap(model, state))) || {}
    action = intent.action
    input = intent.input

    if (state.name === pendingAction.state && action === pendingAction.action) {
      if (!ids.includes(pendingAction.stepID)) {
        console.warn('Could not check find action in log, duplicate action possibly false positive.')
      }
      // debugger
      console.log('cancel')
      action = null
      input = null
    }

    if (!action) {
      intent = yield
      action = intent.action
      input = intent.input
    }

    // ========================================================================
    // Propose
    let proposal
    pendingAction = {}
    if (action) {
      proposal = Promise.resolve(actions[action](input))
      if (proposal.isPending()) {
        const currentStepID = stepID
        proposal
          .then(proposal => {
            // debugger
            return generator.next({ proposal, stepID: currentStepID })
          })
          .catch(::console.error)
        // Action is async, set to pending.
        pendingAction = { state: state.name, action, stepID }
        continue
      } else {
        proposal = await proposal
      }
    } else if (intent.proposal.idempotent || intent.stepID === lastStepID) {
      // Pending action completed: is idempotent or no cancellation (other action).
      proposal = intent.proposal
    } else {
      // Got action already for last step, cancel this one.
      proposal = null
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
