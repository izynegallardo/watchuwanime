import Layout from '@/layouts/default'
import Header from '@/components/header/header'
import Main from '@/components/settingsPage/main'
import Footer from '@/components/footer/footer'
import Events from '@/components/settingsPage/event'

export default function SettingsPage() {
    const { header, main, footer } = Layout(this.root)

    Header(header)
    Main(main)
    Footer(footer)

    return Events()
}
