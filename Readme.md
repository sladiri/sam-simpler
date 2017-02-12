# Application example with child and parent models.
## Quick start
### Live demo
https://sladiri.github.io/sam-simpler/
### Run locally
1. install dependencies: `yarn (npm i)`
2. serve on localhost with auto-reload and auto-rebuild: `npm start`
3. run tests: `npm test`

## Test setup
Tests push actions into the loop, and can register two functinos to inspect the model:
- hook: Gets model value every time it changes (accepts a value).
- endTest: Gets last value of the model (last test action is null, per convention).  
This allows to test model properies (model never settles in value greater than 2). An example for this using jsverify will be added.
```javascript
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
```
## State Action Model pattern
This app uses the State Action Model (SAM) pattern, which makes the control state of the app explicit (what action is allowed, should the model be automatically updated, ...). The logic is separated into three phases: Propose, Accept, Listen. This is similar to the Paxos algorithm, and it is also inspired by the TLA+ specification language. More information is located at http://sam.js.org.  

The SAM pattern is implemented as a loop in an asynchronous generator function. This is the simplified core code:
```javascript
async function* samLoop (/* model, functions, factories */) {
  // ...
  while (true) {
    /* Listen
    */
    let [actionName, data, allowedActions] = nextAction(model)

    target(model, allowedActions) // Pass data to listeners (display, child).

    /* Propose
    */
    if (!actionName) [actionName, data] = yield // wait for async action

    if (!allowedActions.includes(actionName)) continue

    const proposal = await actions[actionName](data) // Actions may be asynchronous

    /* Accept
    */
    await present(model, proposal) // Model may be asynchronous
  }
}
```
