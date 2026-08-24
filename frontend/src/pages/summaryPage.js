import Layout from '@/layouts/default'
import Header from '@/components/header/header'
import Main from '@/components/summaryPage/main'
import Footer from '@/components/footer/footer'
import Events from '@/components/summaryPage/event'

export default function SummaryPage() {
    const { header, main, footer } = Layout(this.root)

    Header(header)
    Main(main)
    Footer(footer)

    return Events()
}
