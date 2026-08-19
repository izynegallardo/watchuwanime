import { viewerCount } from '@/store/counter'

export default function Events() {
    const linkDiv = document.getElementById('link-div')

    for (let i = 1; i < 10; i++) {
        linkDiv.innerHTML += `<a href="/pages/${i}">${i}</a>&nbsp;`
    }
}
