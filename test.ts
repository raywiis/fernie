const RoutingContextSymbol = Symbol('Routing context');

interface RoutingContext {
	path: string
}

interface Context {
	[RoutingContextSymbol]: RoutingContext
}

const testObj: Context = Object.defineProperty({}, RoutingContextSymbol, {
	writable: true,
	enumerable: false, 
	value: { wow: 'some context for the router' }
})

console.log(testObj)
console.log(testObj[RoutingContextSymbol])
console.log('keys', Object.keys(testObj))
console.log('ownProps', Object.getOwnPropertyNames(testObj))

testObj[RoutingContextSymbol] = { path: 'test' }

Object.assign(testObj, {body: 'my body'})

console.log(testObj)
console.log(testObj[RoutingContextSymbol])
console.log('keys', Object.keys(testObj))
console.log('ownProps', Object.getOwnPropertyNames(testObj))

for (let i in testObj) {
	console.log(i)
}
