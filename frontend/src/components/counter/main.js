import styles from './component.module.css'
import { count, setCount } from '@/store/counter'
// import { count, setCount, subscribeCount } from '@/store/counter'

export default function Counter(root) {
    const button = document.createElement('button')
    button.className = styles['counter']

    function render() {
        button.innerText = `Click Me (${count()})`
    }

    button.addEventListener('click', () => {
        setCount(count() + 1)
        render()
    })

    // to update globally
    // subscribeCount(render) // re-renders whenever ANYONE calls setCount
    // button.addEventListener('click', () => setCount(count() + 1))

    render()
    root.appendChild(button)
}
