import Promise from 'bluebird'
import uuid from 'uuid/v4'
import { pipe, assoc, __ } from 'ramda'
import Deque from 'double-ended-queue'

const debuggerDelay = () => new Promise((resolve, reject) => {
  setTimeout(() => { resolve() }, 100)
})

const factory = schedulePendingAction => async function* samLoop ({
  model = {},
  stateFn = () => { },
  nap = () => { },
  target = () => { },
  actions = () => { },
  present = () => { },
  actionQueueLength = 16,
}) {
  const actionQueue = new Deque(actionQueueLength)
  let stepID = null
  let pendingIntent = false

  while (true) {
    console.log('step', stepID)
    await debuggerDelay()

    // ========================================================================
    // Listen
    let input

    if (pendingIntent) {
      input = yield

      if (stepID !== null) {
        if (input.cancel !== true && input.stepID !== stepID) {
          console.log('Async action pending, enqueued non-cancelling action.', '\n', input)
          if (actionQueue.length >= actionQueueLength) {
            console.warn('Action queue overflow, lost enqueued action.', '\n', actionQueue.peekFront())
          }
          actionQueue.enqueue({...input, queued: true})
          continue
        } else if (input.cancel === true) {
          console.warn('Async action cancellation.', '\n', input)
        }
      }
      pendingIntent = false
    } else if (!actionQueue.isEmpty()) {
      input = actionQueue.dequeue()
      console.warn(`Dequeued action, ${actionQueue.length} in queue left.`, '\n', input)
    } else {
      const state = await Promise.resolve(stateFn(model))
      input = await Promise.resolve(nap(model, state))

      target(model, state)

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
        if (input.queued) {
          console.warn('Cancelled async action', '\n', input)
          pendingIntent = true
          continue
        }
        stepID = uuid()
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
      console.warn('Cancelled action', '\n', input)
      continue
    }
    stepID = null

    // ========================================================================
    // Accept
    await Promise.resolve(present(model, proposal))
  }
}

export default function () {
  let generator

  const schedulePendingAction = (stepID, proposal) =>
    pipe(
      assoc('proposal', __, {
        action: proposal.action,
        input: proposal.input,
        stepID,
      }),
      ::generator.next)

  return (options) => {
    generator = factory(schedulePendingAction)(options)
    generator.next()
    return ::generator.next
  }
}
