import Layout from '@/layouts/default'
import Header from '@/components/header/header'
import Main from '@/components/notFoundPage/main'
import Footer from '@/components/footer/footer'

export default function HomePage() {
    const { header, main, footer } = Layout(this.root)

    Header(header)
    Main(main)
    Footer(footer)
}
