import Layout from '@/layouts/default'
import Header from '@/components/header/header'
import Main from '@/components/resultPage/main'
import Footer from '@/components/footer/footer'
import Events from '@/components/resultPage/event'

export default function ResultPage() {
    const { header, main, footer } = Layout(this.root)

    Header(header)
    Main(main)
    Footer(footer)

    return Events()
}
