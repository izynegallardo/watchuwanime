export const useState = (initialValue) => {
    let value = initialValue
    const subscribers = new Set()

    const get = () => value

    const set = (newValue) => {
        const nextValue = typeof newValue === 'function' ? newValue(value) : newValue

        if (Object.is(value, nextValue)) {
            return
        }

        console.log('State changed:', value, '→', nextValue)
        value = nextValue

        subscribers.forEach((fn) => fn(value))
    }

    const subscribe = (fn) => {
        subscribers.add(fn)

        return () => {
            subscribers.delete(fn)
        }
    }

    return [get, set, subscribe]
}
