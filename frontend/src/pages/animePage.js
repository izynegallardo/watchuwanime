import Layout from '@/layouts/default'
import Header from '@/components/header/header'
import Main from '@/components/animePage/main'
import Footer from '@/components/footer/footer'
import Events from '@/components/animePage/event'

export default function AnimePage(params) {
    const { header, main, footer } = Layout(this.root)

    Header(header)
    Main(main)
    Footer(footer)

    return Events(params)
}
