import addAssertions from 'extend-tape'
import arrEquals from 'tape-arr-equals'
import tape from 'tape'

import sam from './fabric'
import {
  actions,
  controlStates,
  presentFac,
  napFac,
  parentModel,
} from './main.js'

const test = addAssertions(tape, {arrEquals})

const dbStub = { save (model) { } }

const testInstance = (options) => sam({
  model: options.parentModel || parentModel,
  actions: options.actions || actions,
  controlStates: options.controlStates || controlStates,
  present: options.present || presentFac({db: dbStub}),
  napFac: options.napFac || napFac,
  views: {},
  target: () => { },
  testHook: options.testHook,
})

export const stubActions = { // Return synchronous values.
  ...actions,
  setValue (input) {
    return { value: input }
  },
  increment (input) {
    return { increment: input }
  },
  decrement (input) {
    return { increment: input * (-1) }
  },
}

test('test loop model property', function (t) {
  const testInput = [
    ['setValue', 2],
    ['setValue', 4],
    [null],
  ]
  const values = []
  const testDispatch = testInstance({
    actions: stubActions,
    testHook: () => ({
      hook (model) {
        values.push(model.value)
      },
      endTest (model) {
        t.equal(true, model.value <= 3)
        t.arrEquals(values, [0, 2, 4, 3])
        t.end()
      },
    }),
  })
  testInput.forEach(testDispatch)
})
