import Layout from '@/layouts/default'
import Header from '@/components/header/header'
import Main from '@/components/home/main'
import Footer from '@/components/footer/footer'
import Events from '@/components/home/event'

export default function HomePage() {
    const { header, main, footer } = Layout(this.root)

    Header(header)
    Main(main)
    Footer(footer)

    return Events()
}
