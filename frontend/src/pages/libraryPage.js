import Layout from '@/layouts/default'
import Header from '@/components/header/header'
import Main from '@/components/libraryPage/main'
import Footer from '@/components/footer/footer'
import Events from '@/components/libraryPage/event'

export default function LibraryPage() {
    const { header, main, footer } = Layout(this.root)

    Header(header)
    Main(main)
    Footer(footer)

    return Events()
}
