# SAM fabric as an asynchronous generator function

## Quick start
### Live demo
https://sladiri.github.io/sam-simpler/
### Run locally
1. `yarn (npm i)`
2. serve on localhost with auto-reload and auto-rebuild: `npm start`

## Test setup
Tests push actions into the loop, and can register two functinos to inspect the model:  
1. hook: Gets model value every time it changes (accepts a value).
2. endTest: Gets last value of the model (last test action is null, per convention).  
This allows to test model properies (model never settles in value greater than 2). An example for this will be added.
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
