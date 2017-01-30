import {head} from 'ramda'

const a = {a: 42}
const b = {...a, b: 666}
console.log('b2', b, head([3, 2, 1]))
