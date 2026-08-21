import Layout from '@/layouts/default'
import Header from '@/components/header/header'
import Main from '@/components/questionPage/main'
import Footer from '@/components/footer/footer'
import Events from '@/components/questionPage/event'

export default function QuestionPage() {
    const { header, main, footer } = Layout(this.root)

    Header(header)
    Main(main)
    Footer(footer)

    return Events()
}
