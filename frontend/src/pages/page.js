import Layout from '@/layouts/default'
import Header from '@/components/header/header'
import Main from '@/components/page/main'
import Footer from '@/components/footer/footer'
import Events from '@/components/page/event'

export default function HomePage(params) {
    const { header, main, footer } = Layout(this.root)

    Header(header)
    Main(main, params)
    Footer(footer)

    return Events()
}
