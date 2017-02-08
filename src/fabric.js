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
  target = null,
  actions = () => { },
  present = () => { },
  actionQueueLength = 16,
  name = '',
}) {
  const actionQueue = new Deque(actionQueueLength)
  let stepID = name + null
  let pendingIntent = false

  while (true) {
    console.log('============================================= step', pendingIntent, stepID)
    await debuggerDelay()

    // ========================================================================
    // Listen
    let input

    if (pendingIntent) {
      input = yield

      if (stepID !== null) {
        if (input.cancel !== true && input.stepID !== stepID) {
          console.log('Async action pending, enqueued non-cancelling action.', stepID, '\n', input)
          if (actionQueue.length >= actionQueueLength) {
            console.error('Action queue overflow, lost enqueued action.', stepID, '\n', actionQueue.peekFront())
          }
          actionQueue.enqueue({...input, wasEnqueued: true})
          // debugger
          continue
        } else if (input.cancel === true) {
          console.log('Async action cancellation.', stepID, '\n', input)
          // debugger
        }
      }

      pendingIntent = false
    } else {
      const state = await Promise.resolve(stateFn(model))
      if (actionQueue.isEmpty()) {
        input = await Promise.resolve(nap(model, state))
        if (target) { await target(model, state) }
        if (!input) { // Notify renderer + child.
          pendingIntent = true
          console.log('Automatic action input undefined.', stepID)
          // debugger
          continue
        }
        console.log('Automatic action.', stepID, '\n', input)
        // debugger
      } else {
        input = actionQueue.dequeue()
        console.log(`Dequeued action, ${actionQueue.length} in queue left.`, stepID, '\n', input)
        await Promise.resolve(nap(model, state))
        if (target) { await target(model, state) }
        // debugger
      }
    }

    // ========================================================================
    // Propose
    let proposal
    if (input.action) {
      proposal = Promise.resolve(actions[input.action](input.input))
      if (proposal.isPending()) {
        if (input.wasEnqueued === true) {
          console.warn('Cancelled async action', stepID, '\n', input)
          pendingIntent = actionQueue.isEmpty()
          // debugger
          continue
        }
        stepID = name + uuid()
        proposal
          .then(schedulePendingAction(stepID, proposal))
          .catch(::console.error)
        pendingIntent = true
        console.log('Pending async action', stepID, '\n', input)
        // debugger
        continue
      }
      proposal = await proposal
      console.log('Sync proposal', stepID, '\n', input, '\n', input.proposal)
    } else if (input.stepID === stepID) {
      proposal = input.proposal
      console.log('Matching stepID for async proposal', stepID, '\n', input, '\n', input.proposal)
    } else {
      console.warn('Cancelled action', stepID, '\n', input, '\n', input.proposal)
      // debugger
      continue
    }
    stepID = name + null
    console.log('Presenting proposal', '\n', proposal)

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
