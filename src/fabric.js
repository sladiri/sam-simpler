import Promise from 'bluebird'
import uuid from 'uuid/v4'
import { pipe, assoc, __ } from 'ramda'

const schedulePendingAction = (stepID, proposal) =>
  pipe(
    assoc('proposal', __, {
      action: proposal.action,
      input: proposal.input,
      stepID,
    }),
    ::generator.next)

let generator
async function* samLoop ({
  model = {},
  stateFn = () => { },
  nap = () => { },
  actions = () => { },
  present = () => { },
}) {
  let stepID = uuid()
  let pendingIntent = false
  while (true) {
    await new Promise((resolve, reject) => { setTimeout(() => { resolve() }, 100) })
    console.log('step', stepID)

    // ========================================================================
    // Listen
    let state
    let input

    if (pendingIntent) {
      pendingIntent = false
      input = yield
    } else {
      state = await Promise.resolve(stateFn(model))
      input = await Promise.resolve(nap(model, state))
      if (!input) {
        pendingIntent = true
        continue
      }
    }

    // ========================================================================
    // Propose
    let proposal
    if (input.action) {
      proposal = Promise.resolve(actions[input.action](input.input))
      if (proposal.isPending()) {
        proposal
          .then(schedulePendingAction(stepID, proposal))
          .catch(::console.error)
        pendingIntent = true
        continue
      }
      proposal = await proposal
    } else if (input.stepID === stepID) {
      proposal = input.proposal
    } else {
      console.warn('Stale input received', '\n', stepID, '\n', input.stepID, '\n', input)
      continue
    }

    // ========================================================================
    // Accept
    await Promise.resolve(present(model, proposal))

    stepID = uuid()
  }
}

export default function samFactory (options) {
  generator = samLoop(options)
  generator.next()
  return ::generator.next
}
