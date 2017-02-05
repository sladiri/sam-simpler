import Promise from 'bluebird'

let generator
async function* samLoop ({
  model = {},
  stateFn = () => { },
  nap = () => { },
  actions = () => { },
  present = () => { },
}) {
  let pendingIntent = false
  while (true) {
    // console.log('step')
    // await new Promise((resolve, reject) => { setTimeout(() => { resolve() }, 100) })

    // ========================================================================
    // Listen
    let state
    let intent

    if (pendingIntent) {
      pendingIntent = false
      intent = yield
    } else {
      state = await Promise.resolve(stateFn(model))
      intent = await Promise.resolve(nap(model, state))
      if (!intent) {
        pendingIntent = true
        continue
      }
    }

    // ========================================================================
    // Propose
    let proposal
    if (intent.action) {
      proposal = Promise.resolve(actions[intent.action](intent.input))
      if (proposal.isPending()) {
        proposal.then(::generator.next).catch(::console.error)
        pendingIntent = true
        continue
      }
    } else {
      proposal = Promise.resolve(intent)
    }

    // ========================================================================
    // Accept
    await Promise.resolve(present(model, await proposal))
  }
}

export default function samFactory (options) {
  generator = samLoop(options)
  generator.next()
  return ::generator.next
}
